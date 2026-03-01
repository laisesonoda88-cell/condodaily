/**
 * CondoDaily — Leads Routes (Pré-lançamento)
 *
 * POST /api/leads          — Público: salva lead + envia email
 * GET  /api/leads          — Admin: lista leads (x-admin-key)
 * GET  /api/leads/stats    — Admin: estatísticas
 * GET  /api/leads/export   — Admin: exporta CSV
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db/index.js';
import { earlyLeads } from '../../db/schema.js';
import { eq, desc, sql, count, and, gte, ilike, or } from 'drizzle-orm';
import { sendLeadConfirmation, sendReferralNotification } from '../../services/email.js';

// ─── Admin Auth Middleware ───────────────────────────────

function adminAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const key = request.headers['x-admin-key'] as string;
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    reply.status(503).send({ success: false, error: 'ADMIN_KEY nao configurado no servidor' });
    return;
  }

  if (!key || key !== adminKey) {
    reply.status(401).send({ success: false, error: 'Acesso negado' });
    return;
  }

  done();
}

// ─── Input Validation ───────────────────────────────────

const VALID_TYPES = ['SINDICO', 'PROFISSIONAL', 'MORADOR', 'OUTRO'];
const VALID_SOURCES = ['LANDING_PAGE', 'REFERRAL', 'QUIZ', 'CTA_CONDOMINIO', 'CTA_PROFISSIONAL'];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(str: string | undefined | null): string {
  if (!str) return '';
  return str.trim().slice(0, 255);
}

// ─── Routes ─────────────────────────────────────────────

export async function leadRoutes(app: FastifyInstance) {

  // ══════════════════════════════════════════════════════
  // POST /api/leads — Público (rate-limited: 5/min)
  // ══════════════════════════════════════════════════════

  app.post('/', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, any>;

    const name = sanitize(body.name);
    const email = sanitize(body.email)?.toLowerCase();
    const phone = sanitize(body.phone);
    const typeRaw = sanitize(body.type)?.toUpperCase();
    const sourceRaw = sanitize(body.source)?.toUpperCase() || 'LANDING_PAGE';
    const referralName = sanitize(body.referral_name);
    const referralEmail = sanitize(body.referral_email)?.toLowerCase() || undefined;
    const quizScore = body.quiz_score != null ? Number(body.quiz_score) : undefined;
    const utmSource = sanitize(body.utm_source);
    const utmMedium = sanitize(body.utm_medium);
    const utmCampaign = sanitize(body.utm_campaign);

    // Validation
    if (!name || name.length < 2) {
      return reply.status(400).send({ success: false, error: 'Nome obrigatorio (min 2 caracteres)' });
    }

    if (!email || !isValidEmail(email)) {
      return reply.status(400).send({ success: false, error: 'Email invalido' });
    }

    const type = VALID_TYPES.includes(typeRaw) ? typeRaw as any : 'OUTRO';
    const source = VALID_SOURCES.includes(sourceRaw) ? sourceRaw as any : 'LANDING_PAGE';

    // Check duplicate
    const existing = await db.select({ id: earlyLeads.id })
      .from(earlyLeads)
      .where(eq(earlyLeads.email, email))
      .limit(1);

    if (existing.length > 0) {
      return reply.send({
        success: true,
        message: 'Voce ja esta cadastrado! Vamos te avisar no lancamento.',
        duplicate: true,
      });
    }

    // Save to DB
    const [lead] = await db.insert(earlyLeads).values({
      name,
      email,
      phone: phone || undefined,
      type,
      source,
      referral_name: referralName || undefined,
      referral_email: referralEmail || undefined,
      quiz_score: quizScore,
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
    }).returning();

    // Send emails async (don't block the response)
    sendLeadConfirmation(lead).catch(err =>
      app.log.error({ err, leadId: lead.id }, 'Failed to send lead confirmation email')
    );

    if (referralEmail && isValidEmail(referralEmail)) {
      sendReferralNotification(lead).catch(err =>
        app.log.error({ err, leadId: lead.id }, 'Failed to send referral notification email')
      );
    }

    return reply.send({
      success: true,
      message: 'Cadastro realizado! Vamos te avisar quando o app lancar.',
    });
  });

  // ══════════════════════════════════════════════════════
  // GET /api/leads — Admin: lista leads
  // ══════════════════════════════════════════════════════

  app.get('/', {
    preHandler: [adminAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, any>;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const typeFilter = query.type?.toUpperCase();
    const sourceFilter = query.source?.toUpperCase();
    const search = query.search?.trim();

    // Build conditions
    const conditions: any[] = [];

    if (typeFilter && VALID_TYPES.includes(typeFilter)) {
      conditions.push(eq(earlyLeads.type, typeFilter as any));
    }

    if (sourceFilter && VALID_SOURCES.includes(sourceFilter)) {
      conditions.push(eq(earlyLeads.source, sourceFilter as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(earlyLeads.name, `%${search}%`),
          ilike(earlyLeads.email, `%${search}%`),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query
    const leads = await db.select()
      .from(earlyLeads)
      .where(whereClause)
      .orderBy(desc(earlyLeads.created_at))
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ total }] = await db.select({ total: count() })
      .from(earlyLeads)
      .where(whereClause);

    return reply.send({
      success: true,
      data: leads,
      pagination: {
        total: Number(total),
        page,
        limit,
        pages: Math.ceil(Number(total) / limit),
      },
    });
  });

  // ══════════════════════════════════════════════════════
  // GET /api/leads/stats — Admin: estatísticas
  // ══════════════════════════════════════════════════════

  app.get('/stats', {
    preHandler: [adminAuth],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    // Total
    const [{ total }] = await db.select({ total: count() }).from(earlyLeads);

    // By type
    const byType = await db.select({
      type: earlyLeads.type,
      count: count(),
    }).from(earlyLeads).groupBy(earlyLeads.type);

    // By source
    const bySource = await db.select({
      source: earlyLeads.source,
      count: count(),
    }).from(earlyLeads).groupBy(earlyLeads.source);

    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ todayCount }] = await db.select({ todayCount: count() })
      .from(earlyLeads)
      .where(gte(earlyLeads.created_at, today));

    // This week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const [{ weekCount }] = await db.select({ weekCount: count() })
      .from(earlyLeads)
      .where(gte(earlyLeads.created_at, weekAgo));

    // Referrals count
    const [{ referrals }] = await db.select({ referrals: count() })
      .from(earlyLeads)
      .where(sql`${earlyLeads.referral_email} IS NOT NULL AND ${earlyLeads.referral_email} != ''`);

    // Emails sent
    const [{ emailsSent }] = await db.select({ emailsSent: count() })
      .from(earlyLeads)
      .where(eq(earlyLeads.email_sent, true));

    return reply.send({
      success: true,
      stats: {
        total: Number(total),
        today: Number(todayCount),
        thisWeek: Number(weekCount),
        referrals: Number(referrals),
        emailsSent: Number(emailsSent),
        byType: byType.map(t => ({ type: t.type, count: Number(t.count) })),
        bySource: bySource.map(s => ({ source: s.source, count: Number(s.count) })),
      },
    });
  });

  // ══════════════════════════════════════════════════════
  // GET /api/leads/export — Admin: exporta CSV
  // ══════════════════════════════════════════════════════

  app.get('/export', {
    preHandler: [adminAuth],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const leads = await db.select()
      .from(earlyLeads)
      .orderBy(desc(earlyLeads.created_at));

    // CSV header
    const header = 'ID,Nome,Email,Telefone,Tipo,Origem,Indicou Nome,Indicou Email,Quiz Score,Email Enviado,Data\n';
    const rows = leads.map(l =>
      `${l.id},"${escapeCsv(l.name)}","${l.email}","${l.phone || ''}","${l.type}","${l.source}","${escapeCsv(l.referral_name || '')}","${l.referral_email || ''}","${l.quiz_score ?? ''}","${l.email_sent ? 'Sim' : 'Nao'}","${formatDate(l.created_at)}"`
    ).join('\n');

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename=leads-condodaily-${new Date().toISOString().slice(0, 10)}.csv`);
    // BOM for Excel compatibility
    return reply.send('\uFEFF' + header + rows);
  });
}

// ─── Helpers ────────────────────────────────────────────

function escapeCsv(str: string): string {
  return str.replace(/"/g, '""');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
