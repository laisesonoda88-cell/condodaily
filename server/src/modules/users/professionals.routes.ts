import { FastifyInstance } from 'fastify';
import { eq, and, ilike, asc, desc, sql, inArray, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { professionalProfiles, professionalServices, serviceCategories, users, professionalPaymentInfo, payouts, bookings, payments } from '../../db/schema.js';
import { z } from 'zod';

// Quiz questions about posture and ethics in condominiums
const QUIZ_CORRECT_ANSWERS: Record<string, string> = {
  q1: 'b', // Cumprimentar e se identificar
  q2: 'c', // Comunicar imediatamente ao sindico
  q3: 'a', // Usar os EPIs adequados
  q4: 'b', // Informar pelo app e aguardar orientacao
  q5: 'c', // Respeitar o horario combinado
};

const quizSchema = z.object({
  answers: z.record(z.string()),
});

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const updatePricingSchema = z.object({
  hourly_rate: z.number().positive(),
  service_radius_km: z.number().int().min(1).max(50),
  horario_inicio: z.string().regex(timeRegex, 'Formato HH:MM').optional(),
  horario_fim: z.string().regex(timeRegex, 'Formato HH:MM').optional(),
});

const updateAvailabilitySchema = z.object({
  disponivel_fim_semana: z.boolean(),
  disponivel_feriados: z.boolean(),
});

const updateServicesSchema = z.object({
  services: z.array(z.object({ category_id: z.string().uuid() })),
});

const paymentInfoSchema = z.object({
  pix_key_type: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
  pix_key: z.string().min(1, 'Chave PIX é obrigatória'),
  bank_name: z.string().optional(),
  bank_agency: z.string().optional(),
  bank_account: z.string().optional(),
  bank_account_type: z.enum(['corrente', 'poupanca']).optional(),
});

export async function professionalRoutes(app: FastifyInstance) {
  // POST /api/professionals/quiz/submit
  app.post('/quiz/submit', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais podem fazer o quiz' });
    }

    const parsed = quizSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Respostas invalidas' });
    }

    const { answers } = parsed.data;

    // Check answers
    let correct = 0;
    const total = Object.keys(QUIZ_CORRECT_ANSWERS).length;

    for (const [question, correctAnswer] of Object.entries(QUIZ_CORRECT_ANSWERS)) {
      if (answers[question] === correctAnswer) correct++;
    }

    const passed = correct >= Math.ceil(total * 0.8); // 80% to pass

    if (passed) {
      await db
        .update(professionalProfiles)
        .set({ quiz_approved: true, quiz_approved_at: new Date() })
        .where(eq(professionalProfiles.user_id, userId));
    }

    return reply.send({
      success: true,
      data: {
        passed,
        correct,
        total,
        score: Math.round((correct / total) * 100),
        message: passed
          ? 'Parabens! Voce foi aprovado no quiz. Seu perfil esta ativo!'
          : `Voce acertou ${correct} de ${total}. Precisa de ${Math.ceil(total * 0.8)} acertos. Tente novamente.`,
      },
    });
  });

  // GET /api/professionals/quiz/questions
  app.get('/quiz/questions', async (_request, reply) => {
    const questions = [
      {
        id: 'q1',
        question: 'Ao chegar no condominio, qual e a primeira coisa que voce deve fazer?',
        options: [
          { id: 'a', text: 'Ir direto para o local de trabalho' },
          { id: 'b', text: 'Cumprimentar o porteiro e se identificar' },
          { id: 'c', text: 'Ligar para o sindico' },
        ],
      },
      {
        id: 'q2',
        question: 'Se voce encontrar um problema estrutural durante o servico (ex: infiltracao), o que fazer?',
        options: [
          { id: 'a', text: 'Ignorar, nao e sua responsabilidade' },
          { id: 'b', text: 'Tentar consertar por conta propria' },
          { id: 'c', text: 'Comunicar imediatamente ao sindico ou responsavel' },
        ],
      },
      {
        id: 'q3',
        question: 'Sobre seguranca no trabalho em condominios:',
        options: [
          { id: 'a', text: 'Sempre usar os EPIs adequados para cada servico' },
          { id: 'b', text: 'EPIs so sao necessarios em obras grandes' },
          { id: 'c', text: 'O condominio deve fornecer todos os equipamentos' },
        ],
      },
      {
        id: 'q4',
        question: 'Se um morador pedir para voce fazer um servico extra fora do combinado:',
        options: [
          { id: 'a', text: 'Fazer o servico para agradar o cliente' },
          { id: 'b', text: 'Informar pelo app e aguardar autorizacao do contratante' },
          { id: 'c', text: 'Cobrar diretamente do morador' },
        ],
      },
      {
        id: 'q5',
        question: 'Sobre pontualidade e compromisso:',
        options: [
          { id: 'a', text: 'Posso chegar ate 30 minutos atrasado sem problemas' },
          { id: 'b', text: 'Se eu atrasar, posso compensar ficando ate mais tarde' },
          { id: 'c', text: 'Devo respeitar o horario combinado e avisar com antecedencia qualquer imprevisto' },
        ],
      },
    ];

    return reply.send({ success: true, data: questions });
  });

  // PUT /api/professionals/pricing
  app.put('/pricing', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const parsed = updatePricingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Dados invalidos' });
    }

    const updateData: Record<string, any> = {
      hourly_rate: String(parsed.data.hourly_rate),
      service_radius_km: parsed.data.service_radius_km,
    };
    if (parsed.data.horario_inicio) updateData.horario_inicio = parsed.data.horario_inicio;
    if (parsed.data.horario_fim) updateData.horario_fim = parsed.data.horario_fim;

    const [updated] = await db
      .update(professionalProfiles)
      .set(updateData)
      .where(eq(professionalProfiles.user_id, userId))
      .returning();

    return reply.send({ success: true, data: updated });
  });

  // PUT /api/professionals/services
  app.put('/services', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const parsed = updateServicesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Dados invalidos' });
    }

    // Get professional profile
    const [profile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      return reply.status(404).send({ success: false, error: 'Perfil profissional nao encontrado' });
    }

    // Delete existing services
    await db
      .delete(professionalServices)
      .where(eq(professionalServices.professional_id, profile.id));

    // Insert new services
    if (parsed.data.services.length > 0) {
      await db.insert(professionalServices).values(
        parsed.data.services.map((s) => ({
          professional_id: profile.id,
          category_id: s.category_id,
        }))
      );
    }

    return reply.send({ success: true, message: 'Servicos atualizados' });
  });

  // PUT /api/professionals/availability
  app.put('/availability', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    const parsed = updateAvailabilitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Dados invalidos' });
    }

    const [updated] = await db
      .update(professionalProfiles)
      .set({
        disponivel_fim_semana: parsed.data.disponivel_fim_semana,
        disponivel_feriados: parsed.data.disponivel_feriados,
      })
      .where(eq(professionalProfiles.user_id, userId))
      .returning();

    return reply.send({ success: true, data: updated });
  });

  // GET /api/professionals/my-services
  app.get('/my-services', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    // Get professional profile
    const [profile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      return reply.status(404).send({ success: false, error: 'Perfil profissional nao encontrado' });
    }

    // Get services with category details
    const services = await db
      .select({
        id: professionalServices.id,
        category_id: professionalServices.category_id,
        is_certified: professionalServices.is_certified,
        certified_at: professionalServices.certified_at,
        category_name: serviceCategories.name,
        category_slug: serviceCategories.slug,
        category_icon: serviceCategories.icon,
      })
      .from(professionalServices)
      .innerJoin(serviceCategories, eq(serviceCategories.id, professionalServices.category_id))
      .where(eq(professionalServices.professional_id, profile.id));

    return reply.send({ success: true, data: services });
  });

  // GET /api/professionals/dashboard - Professional dashboard stats
  app.get('/dashboard', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    // Get profile
    const [profile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      return reply.send({
        success: true,
        data: { total_services: 0, avg_rating: 0, total_earnings: 0, pending_bookings: 0, quiz_approved: false },
      });
    }

    // Count pending bookings
    const [pendingResult] = await db
      .select({ count: count() })
      .from(bookings)
      .where(and(
        eq(bookings.profissional_id, userId),
        eq(bookings.status, 'PENDING')
      ));

    // Sum completed payments (earnings)
    const [earningsResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.booking_id))
      .where(and(
        eq(bookings.profissional_id, userId),
        eq(payments.status, 'APPROVED')
      ));

    return reply.send({
      success: true,
      data: {
        total_services: profile.total_services,
        avg_rating: profile.avg_rating,
        total_earnings: parseFloat(earningsResult?.total || '0'),
        pending_bookings: pendingResult?.count || 0,
        quiz_approved: profile.quiz_approved,
        penalty_count: profile.penalty_count,
        is_blocked: profile.is_blocked,
        fibonacci_level: profile.fibonacci_level,
      },
    });
  });

  // GET /api/professionals/search
  app.get('/search', async (request, reply) => {
    const { q, category, sort, page, limit, weekend } = request.query as {
      q?: string;
      category?: string;
      sort?: string;
      page?: string;
      limit?: string;
      weekend?: string;
    };

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit || '20', 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions = [eq(professionalProfiles.quiz_approved, true)];

    if (q && q.trim()) {
      conditions.push(ilike(users.full_name, `%${q.trim()}%`));
    }

    // Filter by weekend availability
    if (weekend === 'true') {
      conditions.push(eq(professionalProfiles.disponivel_fim_semana, true));
    }

    // If filtering by category, get matching professional IDs first
    let categoryFilterIds: string[] | null = null;
    if (category && category.trim()) {
      const matchingPros = await db
        .select({ professional_id: professionalServices.professional_id })
        .from(professionalServices)
        .innerJoin(serviceCategories, eq(serviceCategories.id, professionalServices.category_id))
        .where(eq(serviceCategories.slug, category.trim()));

      categoryFilterIds = matchingPros.map((r) => r.professional_id);

      if (categoryFilterIds.length === 0) {
        return reply.send({ success: true, data: [], total: 0, page: pageNum, limit: limitNum });
      }

      conditions.push(inArray(professionalProfiles.id, categoryFilterIds));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Determine sort order
    let orderBy;
    switch (sort) {
      case 'price_asc':
        orderBy = asc(professionalProfiles.hourly_rate);
        break;
      case 'price_desc':
        orderBy = desc(professionalProfiles.hourly_rate);
        break;
      case 'services':
        orderBy = desc(professionalProfiles.total_services);
        break;
      case 'rating':
      default:
        orderBy = desc(professionalProfiles.avg_rating);
        break;
    }

    // Count total for pagination
    const [totalResult] = await db
      .select({ total: count() })
      .from(professionalProfiles)
      .innerJoin(users, eq(users.id, professionalProfiles.user_id))
      .where(whereClause);

    const total = totalResult?.total || 0;

    // Fetch paginated results
    const results = await db
      .select({
        id: professionalProfiles.id,
        user_id: professionalProfiles.user_id,
        full_name: users.full_name,
        avatar_url: users.avatar_url,
        bio: professionalProfiles.bio,
        hourly_rate: professionalProfiles.hourly_rate,
        avg_rating: professionalProfiles.avg_rating,
        total_services: professionalProfiles.total_services,
        service_radius_km: professionalProfiles.service_radius_km,
        quiz_approved: professionalProfiles.quiz_approved,
        disponivel_fim_semana: professionalProfiles.disponivel_fim_semana,
        disponivel_feriados: professionalProfiles.disponivel_feriados,
        horario_inicio: professionalProfiles.horario_inicio,
        horario_fim: professionalProfiles.horario_fim,
      })
      .from(professionalProfiles)
      .innerJoin(users, eq(users.id, professionalProfiles.user_id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset);

    // Fetch services for each professional in one query
    if (results.length > 0) {
      const proIds = results.map((r) => r.id);
      const allServices = await db
        .select({
          professional_id: professionalServices.professional_id,
          category_name: serviceCategories.name,
          category_slug: serviceCategories.slug,
          category_icon: serviceCategories.icon,
        })
        .from(professionalServices)
        .innerJoin(serviceCategories, eq(serviceCategories.id, professionalServices.category_id))
        .where(inArray(professionalServices.professional_id, proIds));

      // Group services by professional
      const servicesMap = new Map<string, { name: string; slug: string; icon: string }[]>();
      for (const svc of allServices) {
        const list = servicesMap.get(svc.professional_id) || [];
        list.push({ name: svc.category_name, slug: svc.category_slug, icon: svc.category_icon });
        servicesMap.set(svc.professional_id, list);
      }

      const enriched = results.map((r) => ({
        ...r,
        services: servicesMap.get(r.id) || [],
      }));

      return reply.send({ success: true, data: enriched, total, page: pageNum, limit: limitNum });
    }

    return reply.send({ success: true, data: [], total: 0, page: pageNum, limit: limitNum });
  });

  // GET /api/professionals/:userId - Public professional profile
  app.get('/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    // SECURITY: Validate UUID format to prevent DB errors and info leaks
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return reply.status(400).send({ success: false, error: 'ID inválido' });
    }

    // Get professional profile + user data
    const [profile] = await db
      .select({
        id: professionalProfiles.id,
        user_id: professionalProfiles.user_id,
        full_name: users.full_name,
        avatar_url: users.avatar_url,
        bio: professionalProfiles.bio,
        hourly_rate: professionalProfiles.hourly_rate,
        service_radius_km: professionalProfiles.service_radius_km,
        avg_rating: professionalProfiles.avg_rating,
        total_services: professionalProfiles.total_services,
        fibonacci_level: professionalProfiles.fibonacci_level,
        quiz_approved: professionalProfiles.quiz_approved,
        horario_inicio: professionalProfiles.horario_inicio,
        horario_fim: professionalProfiles.horario_fim,
        disponivel_fim_semana: professionalProfiles.disponivel_fim_semana,
        disponivel_feriados: professionalProfiles.disponivel_feriados,
      })
      .from(professionalProfiles)
      .innerJoin(users, eq(users.id, professionalProfiles.user_id))
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      return reply.status(404).send({ success: false, error: 'Profissional nao encontrado' });
    }

    // Get services/categories
    const services = await db
      .select({
        category_name: serviceCategories.name,
        category_slug: serviceCategories.slug,
        category_icon: serviceCategories.icon,
        is_certified: professionalServices.is_certified,
      })
      .from(professionalServices)
      .innerJoin(serviceCategories, eq(serviceCategories.id, professionalServices.category_id))
      .where(eq(professionalServices.professional_id, profile.id));

    return reply.send({
      success: true,
      data: {
        ...profile,
        services,
      },
    });
  });

  // ═══ Payment Info ═══

  // PUT /api/professionals/payment-info
  app.put('/payment-info', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais podem cadastrar dados de pagamento' });
    }

    const parsed = paymentInfoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    // Upsert payment info
    const [existing] = await db
      .select()
      .from(professionalPaymentInfo)
      .where(eq(professionalPaymentInfo.user_id, userId))
      .limit(1);

    // SECURITY: .returning() with safe columns only (exclude mp_access_token, mp_user_id)
    const safeReturning = {
      id: professionalPaymentInfo.id,
      pix_key_type: professionalPaymentInfo.pix_key_type,
      pix_key: professionalPaymentInfo.pix_key,
      bank_name: professionalPaymentInfo.bank_name,
      bank_agency: professionalPaymentInfo.bank_agency,
      bank_account: professionalPaymentInfo.bank_account,
      bank_account_type: professionalPaymentInfo.bank_account_type,
      is_verified: professionalPaymentInfo.is_verified,
      updated_at: professionalPaymentInfo.updated_at,
    };

    if (existing) {
      const [updated] = await db
        .update(professionalPaymentInfo)
        .set({
          pix_key_type: data.pix_key_type,
          pix_key: data.pix_key,
          bank_name: data.bank_name,
          bank_agency: data.bank_agency,
          bank_account: data.bank_account,
          bank_account_type: data.bank_account_type,
          updated_at: new Date(),
        })
        .where(eq(professionalPaymentInfo.user_id, userId))
        .returning(safeReturning);

      return reply.send({ success: true, data: updated, message: 'Dados de pagamento atualizados' });
    }

    const [created] = await db
      .insert(professionalPaymentInfo)
      .values({
        user_id: userId,
        pix_key_type: data.pix_key_type,
        pix_key: data.pix_key,
        bank_name: data.bank_name,
        bank_agency: data.bank_agency,
        bank_account: data.bank_account,
        bank_account_type: data.bank_account_type,
      })
      .returning(safeReturning);

    return reply.status(201).send({ success: true, data: created, message: 'Dados de pagamento cadastrados' });
  });

  // GET /api/professionals/payment-info
  app.get('/payment-info', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    // SECURITY: Never return mp_access_token or mp_user_id to client
    const [info] = await db
      .select({
        id: professionalPaymentInfo.id,
        user_id: professionalPaymentInfo.user_id,
        pix_key_type: professionalPaymentInfo.pix_key_type,
        pix_key: professionalPaymentInfo.pix_key,
        mp_connected: professionalPaymentInfo.mp_connected,
        bank_name: professionalPaymentInfo.bank_name,
        bank_agency: professionalPaymentInfo.bank_agency,
        bank_account: professionalPaymentInfo.bank_account,
        bank_account_type: professionalPaymentInfo.bank_account_type,
        is_verified: professionalPaymentInfo.is_verified,
        verified_at: professionalPaymentInfo.verified_at,
        created_at: professionalPaymentInfo.created_at,
        updated_at: professionalPaymentInfo.updated_at,
      })
      .from(professionalPaymentInfo)
      .where(eq(professionalPaymentInfo.user_id, userId))
      .limit(1);

    return reply.send({ success: true, data: info || null });
  });

  // GET /api/professionals/payouts
  app.get('/payouts', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    const result = await db
      .select()
      .from(payouts)
      .where(eq(payouts.professional_id, userId))
      .orderBy(desc(payouts.created_at));

    return reply.send({ success: true, data: result });
  });
}
