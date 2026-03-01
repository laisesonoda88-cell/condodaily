/**
 * CondoDaily — Email Service (Resend API)
 *
 * Envia emails transacionais personalizados para leads pré-lançamento.
 * Usa a API do Resend (resend.com) — free tier: 100 emails/dia.
 *
 * Se RESEND_API_KEY não estiver configurado, os emails são ignorados
 * silenciosamente (útil em dev).
 */

import { db } from '../db/index.js';
import { earlyLeads } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'CondoDaily <noreply@condodaily.com.br>';

// ─── Send Email via Resend API ──────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL] Skipping → ${to} | ${subject} (RESEND_API_KEY not set)`);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[EMAIL] Resend error ${res.status}: ${errorText}`);
      return false;
    }

    console.log(`[EMAIL] Sent → ${to} | ${subject}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err);
    return false;
  }
}

// ─── Email Templates ────────────────────────────────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
  <div style="max-width:560px;margin:30px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1B7A6E 0%,#145C53 100%);padding:28px 32px;text-align:center">
      <div style="display:inline-block;vertical-align:middle">
        <span style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px">Condo</span><span style="font-size:22px;font-weight:800;color:#F5A623;letter-spacing:-0.5px">Daily</span>
      </div>
      <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:6px 0 0;letter-spacing:0.5px">A diaria certa, na hora certa</p>
    </div>
    <!-- Content -->
    <div style="padding:32px">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#F7F8FA;padding:20px 32px;text-align:center;border-top:1px solid #eee">
      <p style="color:#999;font-size:11px;margin:0">
        &copy; 2026 CondoDaily &mdash; condodaily.com.br<br>
        <a href="https://condodaily.com.br/privacy" style="color:#999">Politica de Privacidade</a> |
        <a href="https://condodaily.com.br/terms" style="color:#999">Termos de Uso</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function vipBadge(position?: number | null): string {
  if (!position) return '';
  return `
    <div style="background:linear-gradient(135deg,#1B7A6E,#145C53);border-radius:12px;padding:20px;text-align:center;margin:0 0 20px">
      <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Sua posicao na fila VIP</p>
      <p style="color:#F5A623;font-size:36px;font-weight:800;margin:0">#${position}</p>
      <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:4px 0 0">Quanto mais indicacoes, mais voce sobe!</p>
    </div>`;
}

function sindicoTemplate(name: string, vipPosition?: number | null): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Bem-vindo, ${name}!</h2>
    ${vipBadge(vipPosition)}
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Seu condominio esta na <strong style="color:#1B7A6E">lista VIP</strong> do CondoDaily.
      Voce sera um dos primeiros a ter acesso ao app quando lancarmos.
    </p>
    <div style="background:#F0FAF8;border-left:4px solid #1B7A6E;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:#1B7A6E;font-size:14px;margin:0;font-weight:600">O que voce ganha como early adopter:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:8px 0 0;padding-left:18px">
        <li>Acesso prioritario ao app</li>
        <li>Bonus exclusivo no lancamento</li>
        <li>Profissionais verificados desde o dia 1</li>
        <li>Sem vinculo empregaticio, sem passivo trabalhista</li>
      </ul>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:20px 0 24px">
      Indique outros sindicos e administradoras &mdash; quanto mais indicacoes, maior seu bonus.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#1B7A6E;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar mais sindicos</a>
    </div>
  `);
}

function profissionalTemplate(name: string, quizScore?: number | null, vipPosition?: number | null): string {
  const quizBlock = quizScore != null ? `
    <div style="background:${quizScore >= 4 ? '#F0FAF8' : '#FFF8EB'};border-left:4px solid ${quizScore >= 4 ? '#1B7A6E' : '#F5A623'};padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:${quizScore >= 4 ? '#1B7A6E' : '#F5A623'};font-size:14px;margin:0;font-weight:600">
        ${quizScore >= 4 ? 'Voce esta pronto pra atender condominios!' : 'Hora de se especializar!'}
      </p>
      <p style="color:#444;font-size:13px;margin:6px 0 0">
        ${quizScore >= 4
          ? 'Seu perfil mostra experiencia e preparo. Voce tera destaque na plataforma desde o lancamento.'
          : 'O mercado condominial cresce a cada dia. Vamos te ajudar a se preparar e comecar a atender com confianca.'}
      </p>
    </div>` : '';

  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Cadastro confirmado, ${name}!</h2>
    ${vipBadge(vipPosition)}
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Voce e um dos primeiros profissionais do <strong style="color:#F5A623">CondoDaily</strong>.
      Isso te da vantagem quando o app lancar.
    </p>
    ${quizBlock}
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Como funciona pra voce:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:0;padding-left:18px">
        <li><strong>Voce define o preco</strong> &mdash; sem intermediario</li>
        <li><strong>Recebe na hora</strong> &mdash; apos checkout do servico</li>
        <li><strong>Agenda cheia</strong> &mdash; os condominios vem ate voce</li>
        <li><strong>Avalie o condominio</strong> &mdash; via de mao dupla</li>
      </ul>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:20px 0 24px">
      Indique outros profissionais e garanta bonus exclusivo no lancamento.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#F5A623;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar profissionais</a>
    </div>
  `);
}

function moradorTemplate(name: string): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Voce esta na lista, ${name}!</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      O CondoDaily vai transformar a forma como seu condominio contrata servicos.
      Vamos te avisar assim que o app estiver disponivel.
    </p>
    <div style="background:#FFF8EB;border-left:4px solid #F5A623;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:#F5A623;font-size:14px;margin:0;font-weight:600">Dica especial:</p>
      <p style="color:#444;font-size:13px;margin:6px 0 0">
        Indique seu sindico ou administradora pro CondoDaily. Quando eles aderirem,
        voce ganha bonus exclusivo.
      </p>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#1B7A6E;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar meu sindico</a>
    </div>
  `);
}

function defaultTemplate(name: string): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Bem-vindo ao CondoDaily, ${name}!</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Obrigado por se cadastrar! Voce sera um dos primeiros a saber quando o app estiver disponivel.
    </p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px">
      Enquanto isso, indique sindicos e profissionais. Quanto mais indicacoes, maior o seu bonus no lancamento.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#1B7A6E;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar alguem</a>
    </div>
  `);
}

function referralTemplate(referrerName: string, referredName?: string): string {
  const greeting = referredName ? `Ola, ${referredName}!` : 'Ola!';
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${greeting}</h2>
    <div style="background:#F0FAF8;padding:20px;border-radius:12px;text-align:center;margin:0 0 20px">
      <p style="color:#1B7A6E;font-size:16px;margin:0;font-weight:600">
        ${referrerName} te indicou pro CondoDaily!
      </p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      O <strong>CondoDaily</strong> e o app que conecta condominios a profissionais de manutencao.
      Da diarista a manutencao de elevadores, tudo em um clique.
    </p>
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Pra condominios:</p>
      <p style="color:#444;font-size:13px;margin:0">Profissionais verificados, sem vinculo, com seguro. Substituto em minutos.</p>
    </div>
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:0 0 20px">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Pra profissionais:</p>
      <p style="color:#444;font-size:13px;margin:0">Defina seu preco, receba na hora, agenda sempre cheia.</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px">
      Cadastre-se agora e garanta bonus exclusivo no lancamento.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#F5A623;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Quero me cadastrar</a>
    </div>
  `);
}

// ─── Public API ─────────────────────────────────────────

export async function sendLeadConfirmation(lead: {
  id: number;
  name: string;
  email: string;
  type: string;
  quiz_score?: number | null;
  vip_position?: number | null;
}): Promise<void> {
  const templates: Record<string, { subject: string; html: string }> = {
    SINDICO: {
      subject: `Bem-vindo ao CondoDaily, ${lead.name}! Voce e o #${lead.vip_position} na fila VIP`,
      html: sindicoTemplate(lead.name, lead.vip_position),
    },
    PROFISSIONAL: {
      subject: `Cadastro confirmado, ${lead.name}! Posicao #${lead.vip_position} na fila VIP`,
      html: profissionalTemplate(lead.name, lead.quiz_score, lead.vip_position),
    },
    MORADOR: {
      subject: `Voce esta na lista, ${lead.name}!`,
      html: moradorTemplate(lead.name),
    },
    OUTRO: {
      subject: `Bem-vindo ao CondoDaily, ${lead.name}!`,
      html: defaultTemplate(lead.name),
    },
  };

  const tmpl = templates[lead.type] || templates.OUTRO;
  const sent = await sendEmail(lead.email, tmpl.subject, tmpl.html);

  if (sent) {
    await db.update(earlyLeads).set({ email_sent: true }).where(eq(earlyLeads.id, lead.id));
  }
}

// ─── Launch Notification Email ──────────────────────────

function launchTemplate(name: string, type: string, vipPosition?: number | null): string {
  const isProf = type === 'PROFISSIONAL';
  return baseTemplate(`
    <div style="background:linear-gradient(135deg,#1B7A6E,#0E453E);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
      <p style="color:#F5A623;font-size:14px;margin:0 0 4px;text-transform:uppercase;letter-spacing:2px;font-weight:700">O dia chegou!</p>
      <h2 style="color:white;font-size:24px;margin:8px 0;font-weight:800">O CondoDaily esta no ar! 🚀</h2>
      ${vipPosition ? `<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0">Voce foi o <strong style="color:#F5A623">#${vipPosition}</strong> na nossa lista VIP</p>` : ''}
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Ola <strong>${name}</strong>! Como um dos primeiros cadastrados, voce tem <strong style="color:#1B7A6E">acesso prioritario</strong> ao app.
    </p>
    <div style="background:#F0FAF8;border-left:4px solid #1B7A6E;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:#1B7A6E;font-size:14px;margin:0;font-weight:600">Seus beneficios VIP:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:8px 0 0;padding-left:18px">
        ${isProf ? `
          <li><strong>Perfil destacado</strong> nos resultados de busca</li>
          <li><strong>Sem taxa</strong> nos primeiros 3 servicos</li>
          <li><strong>Badge "Pioneiro"</strong> no seu perfil</li>
        ` : `
          <li><strong>Primeiro mes sem taxa</strong> de plataforma</li>
          <li><strong>Prioridade</strong> no suporte</li>
          <li><strong>Badge "Pioneiro"</strong> no seu condominio</li>
        `}
      </ul>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br/download" style="display:inline-block;background:linear-gradient(135deg,#1B7A6E,#145C53);color:white;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 12px rgba(27,122,110,0.3)">Baixar o App Agora</a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0">
      Disponivel para iOS e Android
    </p>
  `);
}

export async function sendLaunchEmail(lead: {
  id: number;
  name: string;
  email: string;
  type: string;
  vip_position?: number | null;
}): Promise<boolean> {
  const subject = `🚀 ${lead.name}, o CondoDaily esta no ar! Acesse agora como VIP #${lead.vip_position || ''}`;
  const html = launchTemplate(lead.name, lead.type, lead.vip_position);
  const sent = await sendEmail(lead.email, subject, html);

  if (sent) {
    await db.update(earlyLeads).set({ launch_email_sent: true }).where(eq(earlyLeads.id, lead.id));
  }
  return sent;
}

export async function sendReferralNotification(lead: {
  id: number;
  name: string;
  referral_name?: string | null;
  referral_email?: string | null;
}): Promise<void> {
  if (!lead.referral_email) return;

  const subject = `${lead.name} te indicou pro CondoDaily!`;
  const html = referralTemplate(lead.name, lead.referral_name || undefined);
  const sent = await sendEmail(lead.referral_email, subject, html);

  if (sent) {
    await db.update(earlyLeads).set({ referral_email_sent: true }).where(eq(earlyLeads.id, lead.id));
  }
}
