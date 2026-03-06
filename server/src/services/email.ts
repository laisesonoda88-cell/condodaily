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
import { eq, sql, count } from 'drizzle-orm';

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
      <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:6px 0 0;letter-spacing:0.5px">A di\u00e1ria certa, na hora certa</p>
    </div>
    <!-- Content -->
    <div style="padding:32px">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#F7F8FA;padding:20px 32px;text-align:center;border-top:1px solid #eee">
      <p style="color:#999;font-size:11px;margin:0">
        &copy; 2026 CondoDaily &mdash; condodaily.com.br<br>
        <a href="https://condodaily.com.br/privacy" style="color:#999">Pol\u00edtica de Privacidade</a> |
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
      <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Sua posi\u00e7\u00e3o na fila VIP</p>
      <p style="color:#F5A623;font-size:36px;font-weight:800;margin:0">#${position}</p>
      <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:4px 0 0">Quanto mais indica\u00e7\u00f5es, mais voc\u00ea sobe!</p>
    </div>`;
}

function sindicoTemplate(name: string, vipPosition?: number | null): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Bem-vindo, ${name}!</h2>
    ${vipBadge(vipPosition)}
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Seu condom\u00ednio est\u00e1 na <strong style="color:#1B7A6E">lista VIP</strong> do CondoDaily.
      Voc\u00ea ser\u00e1 um dos primeiros a ter acesso ao app quando lan\u00e7armos.
    </p>
    <div style="background:#F0FAF8;border-left:4px solid #1B7A6E;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:#1B7A6E;font-size:14px;margin:0;font-weight:600">O que voc\u00ea ganha como early adopter:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:8px 0 0;padding-left:18px">
        <li>Acesso priorit\u00e1rio ao app</li>
        <li>B\u00f4nus exclusivo no lan\u00e7amento</li>
        <li>Profissionais verificados desde o dia 1</li>
        <li>Sem v\u00ednculo empregat\u00edcio, sem passivo trabalhista</li>
      </ul>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:20px 0 24px">
      Indique outros s\u00edndicos e administradoras &mdash; quanto mais indica\u00e7\u00f5es, maior seu b\u00f4nus.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#1B7A6E;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar mais s\u00edndicos</a>
    </div>
  `);
}

function profissionalTemplate(name: string, quizScore?: number | null, vipPosition?: number | null): string {
  const quizBlock = quizScore != null ? `
    <div style="background:${quizScore >= 4 ? '#F0FAF8' : '#FFF8EB'};border-left:4px solid ${quizScore >= 4 ? '#1B7A6E' : '#F5A623'};padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:${quizScore >= 4 ? '#1B7A6E' : '#F5A623'};font-size:14px;margin:0;font-weight:600">
        ${quizScore >= 4 ? 'Voc\u00ea est\u00e1 pronto pra atender condom\u00ednios!' : 'Hora de se especializar!'}
      </p>
      <p style="color:#444;font-size:13px;margin:6px 0 0">
        ${quizScore >= 4
          ? 'Seu perfil mostra experi\u00eancia e preparo. Voc\u00ea ter\u00e1 destaque na plataforma desde o lan\u00e7amento.'
          : 'O mercado condominial cresce a cada dia. Vamos te ajudar a se preparar e come\u00e7ar a atender com confian\u00e7a.'}
      </p>
    </div>` : '';

  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Cadastro confirmado, ${name}!</h2>
    ${vipBadge(vipPosition)}
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Voc\u00ea \u00e9 um dos primeiros profissionais do <strong style="color:#F5A623">CondoDaily</strong>.
      Isso te d\u00e1 vantagem quando o app lan\u00e7ar.
    </p>
    ${quizBlock}
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Como funciona pra voc\u00ea:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:0;padding-left:18px">
        <li><strong>Voc\u00ea define o pre\u00e7o</strong> &mdash; sem intermedi\u00e1rio</li>
        <li><strong>Recebe na hora</strong> &mdash; ap\u00f3s checkout do servi\u00e7o</li>
        <li><strong>Agenda cheia</strong> &mdash; os condom\u00ednios v\u00eam at\u00e9 voc\u00ea</li>
        <li><strong>Avalie o condom\u00ednio</strong> &mdash; via de m\u00e3o dupla</li>
      </ul>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:20px 0 24px">
      Indique outros profissionais e garanta b\u00f4nus exclusivo no lan\u00e7amento.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#F5A623;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar profissionais</a>
    </div>
  `);
}

function moradorTemplate(name: string): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Voc\u00ea est\u00e1 na lista, ${name}!</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      O CondoDaily vai transformar a forma como seu condom\u00ednio contrata servi\u00e7os.
      Vamos te avisar assim que o app estiver dispon\u00edvel.
    </p>
    <div style="background:#FFF8EB;border-left:4px solid #F5A623;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:#F5A623;font-size:14px;margin:0;font-weight:600">Dica especial:</p>
      <p style="color:#444;font-size:13px;margin:6px 0 0">
        Indique seu s\u00edndico ou administradora pro CondoDaily. Quando eles aderirem,
        voc\u00ea ganha b\u00f4nus exclusivo.
      </p>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#1B7A6E;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar meu s\u00edndico</a>
    </div>
  `);
}

function defaultTemplate(name: string): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Bem-vindo ao CondoDaily, ${name}!</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Obrigado por se cadastrar! Voc\u00ea ser\u00e1 um dos primeiros a saber quando o app estiver dispon\u00edvel.
    </p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px">
      Enquanto isso, indique s\u00edndicos e profissionais. Quanto mais indica\u00e7\u00f5es, maior o seu b\u00f4nus no lan\u00e7amento.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#1B7A6E;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar algu\u00e9m</a>
    </div>
  `);
}

function referralTemplate(referrerName: string, referredName?: string): string {
  const greeting = referredName ? `Ol\u00e1, ${referredName}!` : 'Ol\u00e1!';
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${greeting}</h2>
    <div style="background:#F0FAF8;padding:20px;border-radius:12px;text-align:center;margin:0 0 20px">
      <p style="color:#1B7A6E;font-size:16px;margin:0;font-weight:600">
        ${referrerName} te indicou pro CondoDaily!
      </p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      O <strong>CondoDaily</strong> \u00e9 o app que conecta condom\u00ednios a profissionais de manuten\u00e7\u00e3o.
      Da diarista \u00e0 manuten\u00e7\u00e3o de elevadores, tudo em um clique.
    </p>
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Pra condom\u00ednios:</p>
      <p style="color:#444;font-size:13px;margin:0">Profissionais verificados, sem v\u00ednculo, com seguro. Substituto em minutos.</p>
    </div>
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:0 0 20px">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Pra profissionais:</p>
      <p style="color:#444;font-size:13px;margin:0">Defina seu pre\u00e7o, receba na hora, agenda sempre cheia.</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px">
      Cadastre-se agora e garanta b\u00f4nus exclusivo no lan\u00e7amento.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br/#cadastro" style="display:inline-block;background:#F5A623;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Quero me cadastrar</a>
    </div>
  `);
}

// ─── Drip Campaign Templates ────────────────────────────

function dripEmail2_Education(name: string, type: string): string {
  const isProf = type === 'PROFISSIONAL';
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${name}, sabia que...</h2>
    ${isProf ? `
      <div style="background:linear-gradient(135deg,#F5A623,#D99A1E);border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
        <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0 0 4px">Profissionais no CondoDaily ganham em m\u00e9dia</p>
        <p style="color:white;font-size:36px;font-weight:800;margin:0">R$ 2.800/m\u00eas</p>
        <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:8px 0 0">Trabalhando 4 dias por semana</p>
      </div>
      <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
        Condom\u00ednios precisam de manuten\u00e7\u00e3o o ano todo. A demanda \u00e9 constante e <strong>voc\u00ea define seu pre\u00e7o</strong>.
      </p>
      <div style="background:#F7F8FA;padding:20px;border-radius:10px;margin:20px 0">
        <p style="color:#1A2B3C;font-size:14px;margin:0 0 12px;font-weight:600">5 dicas dos profissionais que mais ganham:</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;font-size:14px;color:#444;vertical-align:top;width:24px"><strong style="color:#F5A623">1.</strong></td>
            <td style="padding:6px 0;font-size:14px;color:#444"><strong>Especializa\u00e7\u00e3o</strong> &mdash; Profissionais especializados ganham 30-50% mais</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#444;vertical-align:top"><strong style="color:#F5A623">2.</strong></td>
            <td style="padding:6px 0;font-size:14px;color:#444"><strong>Confiabilidade</strong> &mdash; Responda r\u00e1pido, cumpra prazos, mantenha qualidade</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#444;vertical-align:top"><strong style="color:#F5A623">3.</strong></td>
            <td style="padding:6px 0;font-size:14px;color:#444"><strong>Disponibilidade</strong> &mdash; Quanto mais dispon\u00edvel, mais di\u00e1rias voc\u00ea aceita</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#444;vertical-align:top"><strong style="color:#F5A623">4.</strong></td>
            <td style="padding:6px 0;font-size:14px;color:#444"><strong>Comunica\u00e7\u00e3o</strong> &mdash; S\u00edndicos contratam quem responde em at\u00e9 1 hora</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#444;vertical-align:top"><strong style="color:#F5A623">5.</strong></td>
            <td style="padding:6px 0;font-size:14px;color:#444"><strong>Avalia\u00e7\u00f5es</strong> &mdash; Nota 4.8+ gera 50% mais convites</td></tr>
        </table>
      </div>
      <div style="background:#FFF8EC;border-left:4px solid #F5A623;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="color:#D99A1E;font-size:14px;margin:0;font-weight:600">B\u00f4nus pra Pioneiros:</p>
        <ul style="color:#444;font-size:13px;line-height:1.8;margin:8px 0 0;padding-left:18px">
          <li>Perfil <strong>destacado</strong> nos resultados de busca</li>
          <li><strong>Sem taxa</strong> nos primeiros 3 servi\u00e7os</li>
          <li>Badge "<strong>Pioneiro</strong>" permanente no perfil</li>
          <li>Indique colegas e ganhe <strong>R$ 50</strong> em cr\u00e9dito por indica\u00e7\u00e3o</li>
        </ul>
      </div>
    ` : `
      <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
        Condom\u00ednios que usam plataformas digitais economizam at\u00e9 <strong style="color:#1B7A6E">30% em servi\u00e7os de manuten\u00e7\u00e3o</strong>.
      </p>
      <div style="background:#F0FAF8;padding:20px;border-radius:10px;margin:20px 0">
        <p style="color:#1B7A6E;font-size:14px;margin:0 0 8px;font-weight:600">Exemplo real:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
          <tr><td style="padding:6px 0">Instala\u00e7\u00e3o de ar condicionado (com intermedi\u00e1rio)</td><td style="padding:6px 0;text-align:right;text-decoration:line-through;color:#999">R$ 1.200</td></tr>
          <tr><td style="padding:6px 0">Instala\u00e7\u00e3o de ar condicionado (CondoDaily)</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#1B7A6E">R$ 800</td></tr>
          <tr><td style="padding:6px 0;border-top:1px solid #E8ECF0;font-weight:700">Economia</td><td style="padding:6px 0;border-top:1px solid #E8ECF0;text-align:right;font-weight:800;color:#1B7A6E">R$ 400 (33%)</td></tr>
        </table>
      </div>
      <div style="background:#F7F8FA;border-left:4px solid #1B7A6E;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Por que funciona:</p>
        <ul style="color:#444;font-size:14px;line-height:1.8;margin:0;padding-left:18px">
          <li>Sem intermedi\u00e1rio &mdash; pre\u00e7o justo direto do profissional</li>
          <li>Sem v\u00ednculo CLT &mdash; zero risco trabalhista</li>
          <li>Substitui\u00e7\u00e3o em minutos &mdash; nunca mais ficar na m\u00e3o</li>
          <li>IA analisa a conven\u00e7\u00e3o &mdash; recomenda servi\u00e7os autom\u00e1ticos</li>
        </ul>
      </div>
    `}
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br${isProf ? '/profissional' : ''}#cadastro" style="display:inline-block;background:${isProf ? '#F5A623' : '#1B7A6E'};color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">
        ${isProf ? 'Calcular meus ganhos' : 'Conhecer o CondoDaily'}
      </a>
    </div>
  `);
}

function dripEmail3_SocialProof(name: string, type: string, totalLeads: number): string {
  const isProf = type === 'PROFISSIONAL';
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${name}, voc\u00ea n\u00e3o est\u00e1 sozinho!</h2>
    <div style="background:linear-gradient(135deg,#1B7A6E,#145C53);border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0 0 4px">J\u00e1 se cadastraram no CondoDaily</p>
      <p style="color:#F5A623;font-size:48px;font-weight:800;margin:0">${totalLeads}+</p>
      <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:8px 0 0">profissionais e s\u00edndicos em Curitiba</p>
    </div>
    ${isProf ? `
      <div style="background:#F7F8FA;padding:20px;border-radius:10px;margin:0 0 20px">
        <p style="color:#1A2B3C;font-size:14px;margin:0 0 12px;font-weight:600">O que outros profissionais dizem:</p>
        <div style="border-left:3px solid #F5A623;padding:8px 16px;margin:0 0 12px;background:#FFF8EC;border-radius:0 8px 8px 0">
          <p style="color:#444;font-size:13px;font-style:italic;margin:0">"Consigo fazer 3-4 di\u00e1rias por semana e j\u00e1 tenho agenda cheia."</p>
          <p style="color:#999;font-size:12px;margin:4px 0 0">&mdash; Maria, profissional de limpeza</p>
        </div>
        <div style="border-left:3px solid #F5A623;padding:8px 16px;background:#FFF8EC;border-radius:0 8px 8px 0">
          <p style="color:#444;font-size:13px;font-style:italic;margin:0">"A plataforma me trouxe clientes que eu nunca conseguiria sozinho."</p>
          <p style="color:#999;font-size:12px;margin:4px 0 0">&mdash; Carlos, encanador</p>
        </div>
      </div>
    ` : `
      <div style="background:#F7F8FA;padding:20px;border-radius:10px;margin:0 0 20px">
        <p style="color:#1A2B3C;font-size:14px;margin:0 0 12px;font-weight:600">S\u00edndicos que j\u00e1 usam o CondoDaily:</p>
        <div style="border-left:3px solid #1B7A6E;padding:8px 16px;margin:0 0 12px;background:#F0FAF8;border-radius:0 8px 8px 0">
          <p style="color:#444;font-size:13px;font-style:italic;margin:0">"Encontrei profissional confi\u00e1vel em menos de 10 minutos."</p>
          <p style="color:#999;font-size:12px;margin:4px 0 0">&mdash; Roberto, s\u00edndico</p>
        </div>
      </div>
    `}
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px">
      Quanto antes voc\u00ea se posicionar, mais vantagem ter\u00e1 no lan\u00e7amento.
    </p>
    <div style="text-align:center">
      <a href="https://condodaily.com.br${isProf ? '/profissional' : ''}#cadastro" style="display:inline-block;background:${isProf ? '#F5A623' : '#1B7A6E'};color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar um colega</a>
    </div>
  `);
}

function dripEmail4_Urgency(name: string, type: string): string {
  const isProf = type === 'PROFISSIONAL';
  return baseTemplate(`
    <div style="background:#FFF3E0;border-left:4px solid #F5A623;padding:16px;border-radius:0 8px 8px 0;margin:0 0 20px">
      <p style="color:#E65100;font-size:14px;margin:0;font-weight:700">Vagas VIP acabando!</p>
    </div>
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${name}, falta pouco pro lan\u00e7amento</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      ${isProf
        ? 'Os primeiros 100 profissionais t\u00eam benef\u00edcios exclusivos: perfil destacado, sem taxa nos primeiros servi\u00e7os e badge "Pioneiro". As vagas est\u00e3o quase esgotadas.'
        : 'Os primeiros 100 s\u00edndicos cadastrados ter\u00e3o primeiro m\u00eas sem taxa, prioridade no suporte e badge "Pioneiro" no condom\u00ednio.'}
    </p>
    <div style="background:linear-gradient(135deg,#1B7A6E,#0E453E);border-radius:12px;padding:24px;text-align:center;margin:20px 0">
      <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 8px">SUA POSI\u00c7\u00c3O VIP</p>
      <p style="color:#F5A623;font-size:16px;font-weight:700;margin:0">Voc\u00ea j\u00e1 est\u00e1 garantido na fila!</p>
      <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:8px 0 0">Mas indique colegas e suba de posi\u00e7\u00e3o</p>
    </div>
    <div style="background:#F7F8FA;padding:20px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 12px;font-weight:600">${isProf ? 'Prepare-se para o lan\u00e7amento:' : 'Checklist do s\u00edndico:'}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
        ${isProf ? `
          <tr><td style="padding:4px 0;width:24px">&#9744;</td><td>Tenha seus documentos prontos (CPF/CNPJ)</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Defina suas categorias de servi\u00e7o</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Pense no valor por hora que quer cobrar</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Indique 3 colegas = R$ 150 em cr\u00e9dito</td></tr>
        ` : `
          <tr><td style="padding:4px 0;width:24px">&#9744;</td><td>Defina os servi\u00e7os mais urgentes do condom\u00ednio</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Tenha a conven\u00e7\u00e3o em PDF</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Liste as \u00e1reas comuns</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Compartilhe com outros s\u00edndicos</td></tr>
        `}
      </table>
    </div>
    ${isProf ? `
      <div style="background:#FFF8EC;border-left:4px solid #F5A623;padding:16px;border-radius:0 8px 8px 0;margin:0 0 20px">
        <p style="color:#D99A1E;font-size:14px;margin:0;font-weight:700">B\u00f4nus Early Adopter:</p>
        <p style="color:#444;font-size:13px;margin:6px 0 0">Os primeiros 50 profissionais que aceitarem uma di\u00e1ria ganham <strong>R$ 100 em cr\u00e9dito</strong> + destaque no perfil por 30 dias + suporte priorit\u00e1rio.</p>
      </div>
    ` : `
      <div style="background:#F0FAF8;border-left:4px solid #1B7A6E;padding:16px;border-radius:0 8px 8px 0;margin:0 0 20px">
        <p style="color:#1B7A6E;font-size:14px;margin:0;font-weight:700">B\u00f4nus Early Adopter:</p>
        <p style="color:#444;font-size:13px;margin:6px 0 0">Os primeiros 20 s\u00edndicos que contratarem um profissional ganham <strong>10% de desconto</strong> na primeira contrata\u00e7\u00e3o + suporte priorit\u00e1rio.</p>
      </div>
    `}
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br${isProf ? '/profissional' : ''}#cadastro" style="display:inline-block;background:#F5A623;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Indicar agora e ganhar b\u00f4nus</a>
    </div>
  `);
}

function dripEmail5_Countdown(name: string, type: string): string {
  const isProf = type === 'PROFISSIONAL';
  return baseTemplate(`
    <div style="background:linear-gradient(135deg,#F5A623,#D99A1E);border-radius:12px;padding:28px;text-align:center;margin:0 0 24px">
      <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0 0 4px;text-transform:uppercase;letter-spacing:2px;font-weight:700">Contagem regressiva</p>
      <h2 style="color:white;font-size:28px;margin:8px 0;font-weight:800">O CondoDaily est\u00e1 quase pronto!</h2>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0">Faltam poucos dias para o lan\u00e7amento oficial</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Ol\u00e1 <strong>${name}</strong>! Estamos nos preparativos finais.
      ${isProf
        ? 'Quando o app lan\u00e7ar, os condom\u00ednios de Curitiba v\u00e3o poder te encontrar e contratar di\u00e1rias.'
        : 'Quando o app lan\u00e7ar, voc\u00ea poder\u00e1 encontrar e contratar profissionais verificados em minutos.'}
    </p>
    ${isProf ? `
      <div style="background:#F7F8FA;padding:20px;border-radius:10px;margin:20px 0">
        <p style="color:#1A2B3C;font-size:14px;margin:0 0 12px;font-weight:600">Dicas pra bombar no lan\u00e7amento:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
          <tr><td style="padding:6px 0;width:24px;vertical-align:top">&#128247;</td>
            <td style="padding:6px 0"><strong>Foto de qualidade</strong> &mdash; Profissionais com foto recebem 3x mais di\u00e1rias</td></tr>
          <tr><td style="padding:6px 0;vertical-align:top">&#128221;</td>
            <td style="padding:6px 0"><strong>Descri\u00e7\u00e3o clara</strong> &mdash; Ex: "10 anos de experi\u00eancia em condom\u00ednios"</td></tr>
          <tr><td style="padding:6px 0;vertical-align:top">&#128176;</td>
            <td style="padding:6px 0"><strong>Valores competitivos</strong> &mdash; Pesquise o mercado e defina um pre\u00e7o justo</td></tr>
          <tr><td style="padding:6px 0;vertical-align:top">&#128197;</td>
            <td style="padding:6px 0"><strong>Disponibilidade clara</strong> &mdash; Quanto mais hor\u00e1rios, mais di\u00e1rias voc\u00ea pega</td></tr>
        </table>
      </div>
    ` : `
      <div style="background:#F0FAF8;padding:20px;border-radius:10px;margin:20px 0">
        <p style="color:#1B7A6E;font-size:14px;margin:0 0 12px;font-weight:600">Checklist final do s\u00edndico:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
          <tr><td style="padding:4px 0;width:24px">&#9744;</td><td>Tenha a conven\u00e7\u00e3o do condom\u00ednio em PDF</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Liste as \u00e1reas comuns e metragem</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Priorize os servi\u00e7os mais urgentes</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Tenha seu or\u00e7amento mensal em m\u00e3os</td></tr>
          <tr><td style="padding:4px 0">&#9744;</td><td>Compartilhe com outros s\u00edndicos</td></tr>
        </table>
      </div>
    `}
    <div style="background:linear-gradient(135deg,#1B7A6E,#0E453E);border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px">\u00daltima chance de indicar</p>
      <p style="color:#F5A623;font-size:15px;font-weight:700;margin:0">Indique agora e acumule b\u00f4nus antes do lan\u00e7amento</p>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br${isProf ? '/profissional' : ''}#cadastro" style="display:inline-block;background:${isProf ? '#F5A623' : '#1B7A6E'};color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">${isProf ? 'Indicar um profissional' : 'Indicar um s\u00edndico'}</a>
    </div>
  `);
}

// ─── A/B Testing Helper ─────────────────────────────────

function abTest(...options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}

// Drip step → days after signup → template
const DRIP_SCHEDULE: { step: number; days: number; subject: (name: string, type: string) => string; html: (name: string, type: string, totalLeads: number) => string }[] = [
  {
    step: 2,
    days: 3,
    subject: (name, type) => type === 'PROFISSIONAL'
      ? abTest(
          `${name}, profissionais ganham em m\u00e9dia R$ 2.800/m\u00eas no CondoDaily`,
          `5 dicas pra ganhar R$ 2.500+ como profissional em Curitiba`
        )
      : abTest(
          `${name}, condom\u00ednios economizam 30% com o CondoDaily`,
          `Como economizar 30% em servi\u00e7os pro seu condom\u00ednio`
        ),
    html: (name, type) => dripEmail2_Education(name, type),
  },
  {
    step: 3,
    days: 7,
    subject: (name, type) => type === 'PROFISSIONAL'
      ? abTest(
          `${name}, veja quantos profissionais j\u00e1 se cadastraram!`,
          `Veja quanto profissionais como voc\u00ea est\u00e3o ganhando`
        )
      : abTest(
          `${name}, veja quantas pessoas j\u00e1 se cadastraram!`,
          `S\u00edndicos como voc\u00ea j\u00e1 est\u00e3o economizando`
        ),
    html: (name, type, totalLeads) => dripEmail3_SocialProof(name, type, totalLeads),
  },
  {
    step: 4,
    days: 14,
    subject: (name, type) => type === 'PROFISSIONAL'
      ? abTest(
          `${name}, vagas VIP est\u00e3o acabando!`,
          `Voc\u00ea est\u00e1 entre os primeiros profissionais \u2014 faltam 4 semanas`
        )
      : abTest(
          `${name}, vagas VIP est\u00e3o acabando!`,
          `Faltam 4 semanas pra economizar 30% em servi\u00e7os`
        ),
    html: (name, type) => dripEmail4_Urgency(name, type),
  },
  {
    step: 5,
    days: 28,
    subject: (name, type) => type === 'PROFISSIONAL'
      ? abTest(
          `Contagem regressiva, ${name}! CondoDaily quase pronto`,
          `Faltam 2 semanas pra ganhar R$ 2.500+`
        )
      : abTest(
          `Contagem regressiva, ${name}! CondoDaily quase pronto`,
          `Seu app est\u00e1 quase pronto. Prepare-se, ${name}!`
        ),
    html: (name, type) => dripEmail5_Countdown(name, type),
  },
];

export async function processDripEmails(): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Ensure drip_step column exists
  await db.execute(sql`
    ALTER TABLE early_leads ADD COLUMN IF NOT EXISTS drip_step integer DEFAULT 1
  `);

  // Get total leads for social proof email
  const [{ total: totalLeads }] = await db.select({ total: count() }).from(earlyLeads);

  for (const drip of DRIP_SCHEDULE) {
    // Find leads eligible for this drip step:
    // - drip_step < current step (haven't received it yet)
    // - created_at is at least X days ago
    const eligibleLeads = await db.execute(sql`
      SELECT id, name, email, type
      FROM early_leads
      WHERE COALESCE(drip_step, 1) < ${drip.step}
        AND created_at <= NOW() - INTERVAL '${sql.raw(String(drip.days))} days'
      ORDER BY created_at ASC
      LIMIT 20
    `);

    for (const lead of eligibleLeads.rows as any[]) {
      try {
        const subject = drip.subject(lead.name, lead.type);
        const html = drip.html(lead.name, lead.type, Number(totalLeads));
        const ok = await sendEmail(lead.email, subject, html);

        if (ok) {
          await db.execute(sql`UPDATE early_leads SET drip_step = ${drip.step} WHERE id = ${lead.id}`);
          sent++;
        } else {
          failed++;
        }

        // Resend rate limit: 100ms delay
        await new Promise(r => setTimeout(r, 600));
      } catch {
        failed++;
      }
    }
  }

  return { sent, failed, skipped };
}

// ─── Campanha Divulgação Base Existente ────────

function reativacaoEmail1(name: string): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Ol\u00e1 ${name}, tudo bem?</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Sou a <strong>Laise Afonso</strong>, administradora de condom\u00ednios aqui em Curitiba.
      Estou entrando em contato porque estou lan\u00e7ando uma plataforma que vai facilitar
      muito a vida de quem trabalha com gest\u00e3o condominial.
    </p>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Tenho uma <strong style="color:#1B7A6E">novidade importante</strong> pra te contar:
    </p>
    <div style="background:linear-gradient(135deg,#1B7A6E,#0E453E);border-radius:16px;padding:28px;text-align:center;margin:20px 0">
      <p style="color:#F5A623;font-size:13px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin:0 0 8px">Novidade em Curitiba</p>
      <h2 style="color:white;font-size:24px;margin:0 0 8px;font-weight:800">Conhe\u00e7a o CondoDaily</h2>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0">A plataforma que conecta s\u00edndicos a profissionais confi\u00e1veis</p>
    </div>
    <div style="display:flex;gap:12px;margin:20px 0">
      <div style="flex:1;background:#F0FAF8;padding:16px;border-radius:10px">
        <p style="color:#1B7A6E;font-size:13px;font-weight:600;margin:0 0 8px">Pra s\u00edndicos:</p>
        <ul style="color:#444;font-size:13px;line-height:1.7;margin:0;padding-left:16px">
          <li>Profissionais confi\u00e1veis em 2 min</li>
          <li>Economize at\u00e9 30%</li>
          <li>Sem intermedi\u00e1rio</li>
          <li>Avalia\u00e7\u00f5es verificadas</li>
        </ul>
      </div>
      <div style="flex:1;background:#FFF8EC;padding:16px;border-radius:10px">
        <p style="color:#D99A1E;font-size:13px;font-weight:600;margin:0 0 8px">Pra profissionais:</p>
        <ul style="color:#444;font-size:13px;line-height:1.7;margin:0;padding-left:16px">
          <li>Ganhe R$ 2.500-3.500/m\u00eas</li>
          <li>Voc\u00ea define o pre\u00e7o</li>
          <li>Pagamento r\u00e1pido via PIX</li>
          <li>S\u00edndicos verificados</li>
        </ul>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#F5A623,#D99A1E);border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="color:rgba(255,255,255,0.9);font-size:13px;margin:0 0 4px">Exclusivo pra quem se cadastrar agora</p>
      <p style="color:white;font-size:16px;font-weight:700;margin:0">R$ 100 em cr\u00e9dito na primeira contrata\u00e7\u00e3o</p>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br?utm_source=email-base-existente&utm_medium=email&utm_campaign=reativacao" style="display:inline-block;background:#1B7A6E;color:white;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 12px rgba(27,122,110,0.3)">Conhecer o CondoDaily</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center;margin:16px 0 0">
      D\u00favidas? Responda este email ou me chame no <a href="https://wa.me/5541999874274" style="color:#1B7A6E;font-weight:600">WhatsApp</a>
    </p>
  `);
}

function reativacaoEmail2_Sindico(name: string): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${name}, veja este caso real</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Voc\u00ea recebeu meu email anterior sobre o CondoDaily? Deixa eu te mostrar um <strong>exemplo real</strong>:
    </p>
    <div style="background:#F7F8FA;border-radius:12px;padding:24px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:15px;font-weight:700;margin:0 0 16px">Caso real: Condom\u00ednio com 50 unidades</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="background:#FFF3E0">
          <td style="padding:10px 12px;font-weight:600;color:#E65100;border-radius:6px 0 0 0">Antes (com intermedi\u00e1rio)</td>
          <td style="padding:10px 12px;text-align:right;border-radius:0 6px 0 0">
            <span style="text-decoration:line-through;color:#999">R$ 1.200</span>
          </td>
        </tr>
        <tr><td colspan="2" style="padding:4px"></td></tr>
        <tr style="background:#F0FAF8">
          <td style="padding:10px 12px;font-weight:600;color:#1B7A6E;border-radius:6px 0 0 0">Com CondoDaily</td>
          <td style="padding:10px 12px;text-align:right;font-weight:800;color:#1B7A6E;border-radius:0 6px 0 0">R$ 800</td>
        </tr>
        <tr><td colspan="2" style="padding:4px"></td></tr>
        <tr style="background:#1B7A6E">
          <td style="padding:10px 12px;font-weight:700;color:white;border-radius:6px 0 0 6px">Economia</td>
          <td style="padding:10px 12px;text-align:right;font-weight:800;color:#F5A623;font-size:16px;border-radius:0 6px 6px 0">R$ 400 (33%)</td>
        </tr>
      </table>
    </div>
    <div style="background:#F0FAF8;border-left:4px solid #1B7A6E;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:#1B7A6E;font-size:14px;margin:0;font-weight:600">Economia m\u00e9dia por categoria:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:8px 0 0;padding-left:18px">
        <li><strong>Eletricista:</strong> 30% de economia</li>
        <li><strong>Encanador:</strong> 25% de economia</li>
        <li><strong>Pintura:</strong> 20% de economia</li>
        <li><strong>Limpeza especializada:</strong> 35% de economia</li>
      </ul>
    </div>
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">Como funciona (5 passos):</p>
      <table style="width:100%;font-size:14px;color:#444;border-collapse:collapse">
        <tr><td style="padding:4px 0;width:24px;color:#1B7A6E;font-weight:700">1.</td><td>Descreva o servi\u00e7o que precisa</td></tr>
        <tr><td style="padding:4px 0;color:#1B7A6E;font-weight:700">2.</td><td>Receba ofertas de profissionais em minutos</td></tr>
        <tr><td style="padding:4px 0;color:#1B7A6E;font-weight:700">3.</td><td>Escolha o melhor pre\u00e7o e avalia\u00e7\u00e3o</td></tr>
        <tr><td style="padding:4px 0;color:#1B7A6E;font-weight:700">4.</td><td>Profissional faz o trabalho</td></tr>
        <tr><td style="padding:4px 0;color:#1B7A6E;font-weight:700">5.</td><td>Avalie e contrate novamente</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br?utm_source=email-base-existente&utm_medium=email&utm_campaign=educacao-sindico" style="display:inline-block;background:#1B7A6E;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Quero economizar tamb\u00e9m</a>
    </div>
  `);
}

function reativacaoEmail3_Profissional(name: string): string {
  return baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${name}, profissional triplicou a renda</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Voc\u00ea \u00e9 profissional de servi\u00e7os? Veja como profissionais como voc\u00ea est\u00e3o ganhando mais:
    </p>
    <div style="display:flex;gap:12px;margin:20px 0">
      <div style="flex:1;background:#FFF3E0;border-radius:12px;padding:20px;text-align:center">
        <p style="color:#E65100;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase">Antes</p>
        <p style="color:#E65100;font-size:11px;margin:0 0 8px">Com intermedi\u00e1rio</p>
        <p style="color:#444;font-size:28px;font-weight:800;margin:0;text-decoration:line-through">R$ 28/h</p>
        <p style="color:#999;font-size:12px;margin:4px 0 0">5-6 di\u00e1rias/m\u00eas</p>
        <p style="color:#E65100;font-size:16px;font-weight:700;margin:8px 0 0">R$ 1.000/m\u00eas</p>
      </div>
      <div style="flex:1;background:#F0FAF8;border-radius:12px;padding:20px;text-align:center;border:2px solid #1B7A6E">
        <p style="color:#1B7A6E;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase">Depois</p>
        <p style="color:#1B7A6E;font-size:11px;margin:0 0 8px">Com CondoDaily</p>
        <p style="color:#1B7A6E;font-size:28px;font-weight:800;margin:0">R$ 55/h</p>
        <p style="color:#444;font-size:12px;margin:4px 0 0">12-15 di\u00e1rias/m\u00eas</p>
        <p style="color:#1B7A6E;font-size:16px;font-weight:700;margin:8px 0 0">R$ 3.000/m\u00eas</p>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#F5A623,#D99A1E);border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0 0 4px">Resultado</p>
      <p style="color:white;font-size:24px;font-weight:800;margin:0">Triplicou a renda</p>
    </div>
    <div style="background:#F7F8FA;padding:16px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 8px;font-weight:600">M\u00e9dia dos profissionais no CondoDaily:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:0;padding-left:18px">
        <li><strong>R$ 2.500-3.500/m\u00eas</strong> de faturamento</li>
        <li><strong>50% mais</strong> que com intermedi\u00e1rios</li>
        <li><strong>Controle total</strong> sobre valores</li>
        <li><strong>Pagamento via PIX</strong> ap\u00f3s check-out</li>
      </ul>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br/profissional?utm_source=email-base-existente&utm_medium=email&utm_campaign=educacao-profissional" style="display:inline-block;background:#F5A623;color:white;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">Calcular meus ganhos</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center;margin:16px 0 0">
      D\u00favidas? Me chame no <a href="https://wa.me/5541999874274" style="color:#F5A623;font-weight:600">WhatsApp</a>
    </p>
  `);
}

function reativacaoEmail4_Urgencia(name: string): string {
  return baseTemplate(`
    <div style="background:#FFF3E0;border-left:4px solid #F5A623;padding:16px;border-radius:0 8px 8px 0;margin:0 0 20px">
      <p style="color:#E65100;font-size:14px;margin:0;font-weight:700">B\u00f4nus de R$ 100 expira em 7 dias</p>
    </div>
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">${name}, voc\u00ea ainda n\u00e3o se cadastrou?</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      O b\u00f4nus exclusivo de <strong style="color:#F5A623">R$ 100 em cr\u00e9dito</strong> que reservamos pra voc\u00ea expira em 7 dias.
    </p>
    <div style="background:linear-gradient(135deg,#1B7A6E,#0E453E);border-radius:16px;padding:24px;margin:20px 0">
      <p style="color:#F5A623;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin:0 0 12px">B\u00f4nus Early Adopter (7 dias)</p>
      <table style="width:100%;font-size:14px;color:white;border-collapse:collapse">
        <tr><td style="padding:6px 0">&#10003; R$ 100 em cr\u00e9dito</td></tr>
        <tr><td style="padding:6px 0">&#10003; Suporte priorit\u00e1rio direto com Laise</td></tr>
        <tr><td style="padding:6px 0">&#10003; Destaque no perfil por 30 dias</td></tr>
        <tr><td style="padding:6px 0">&#10003; Acesso a profissionais premium</td></tr>
      </table>
    </div>
    <div style="background:#F7F8FA;padding:20px;border-radius:10px;margin:20px 0">
      <p style="color:#1A2B3C;font-size:14px;margin:0 0 12px;font-weight:600">Por que agora?</p>
      <table style="width:100%;font-size:14px;color:#444;border-collapse:collapse">
        <tr><td style="padding:6px 0;width:24px;vertical-align:top;color:#1B7A6E;font-weight:700">1.</td>
          <td style="padding:6px 0"><strong>Base crescendo</strong> &mdash; Quanto mais gente, mais oportunidades pra todos</td></tr>
        <tr><td style="padding:6px 0;vertical-align:top;color:#1B7A6E;font-weight:700">2.</td>
          <td style="padding:6px 0"><strong>Plataforma local</strong> &mdash; Feita por quem entende de condom\u00ednio em Curitiba</td></tr>
        <tr><td style="padding:6px 0;vertical-align:top;color:#1B7A6E;font-weight:700">3.</td>
          <td style="padding:6px 0"><strong>Cadastro leva 2 minutos</strong> &mdash; Primeira di\u00e1ria em 24h</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br?utm_source=email-base-existente&utm_medium=email&utm_campaign=urgencia" style="display:inline-block;background:linear-gradient(135deg,#F5A623,#D99A1E);color:white;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 16px rgba(245,166,35,0.3)">Cadastrar agora &mdash; Garantir b\u00f4nus</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center;margin:16px 0 0">
      D\u00favidas? Responda este email ou me chame no <a href="https://wa.me/5541999874274" style="color:#1B7A6E;font-weight:600">WhatsApp</a>
    </p>
  `);
}

// Campaign schedule: phase → days after import → template
const REATIVACAO_SCHEDULE: {
  phase: number;
  days: number;
  subject: (name: string) => string;
  html: (name: string, type: string) => string;
}[] = [
  {
    phase: 1,
    days: 0,
    subject: (name) => abTest(
      `${name}, uma novidade pra quem trabalha com condom\u00ednio`,
      `Novidade em Curitiba: conhe\u00e7a o CondoDaily`
    ),
    html: (name) => reativacaoEmail1(name),
  },
  {
    phase: 2,
    days: 7,
    subject: (name) => `Como economizei R$ 5.000 em um m\u00eas com CondoDaily`,
    html: (name, type) => type === 'PROFISSIONAL'
      ? reativacaoEmail3_Profissional(name)
      : reativacaoEmail2_Sindico(name),
  },
  {
    phase: 3,
    days: 14,
    subject: (name) => abTest(
      `B\u00f4nus de R$ 100 expira em 7 dias, ${name}`,
      `${name}, voc\u00ea est\u00e1 perdendo oportunidades`
    ),
    html: (name) => reativacaoEmail4_Urgencia(name),
  },
];

export async function processReativacaoCampaign(): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Ensure EVENTO_2025 exists in lead_source enum + reativacao_phase column
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'EVENTO_2025';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    ALTER TABLE early_leads ADD COLUMN IF NOT EXISTS reativacao_phase integer DEFAULT 0
  `);

  for (const phase of REATIVACAO_SCHEDULE) {
    // Find leads from EVENTO_2025 source eligible for this phase
    const eligibleLeads = await db.execute(sql`
      SELECT id, name, email, type
      FROM early_leads
      WHERE source = 'EVENTO_2025'
        AND COALESCE(reativacao_phase, 0) < ${phase.phase}
        AND created_at <= NOW() - INTERVAL '${sql.raw(String(phase.days))} days'
      ORDER BY created_at ASC
      LIMIT 30
    `);

    for (const lead of eligibleLeads.rows as any[]) {
      try {
        const subject = phase.subject(lead.name);
        const html = phase.html(lead.name, lead.type || 'SINDICO');
        const ok = await sendEmail(lead.email, subject, html);

        if (ok) {
          await db.execute(sql`UPDATE early_leads SET reativacao_phase = ${phase.phase} WHERE id = ${lead.id}`);
          sent++;
        } else {
          failed++;
        }

        await new Promise(r => setTimeout(r, 600));
      } catch {
        failed++;
      }
    }
  }

  return { sent, failed, skipped };
}

// ─── Auth Email Templates ───────────────────────────────

export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string
): Promise<boolean> {
  const subject = 'Confirme seu e-mail - CondoDaily';
  const html = baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Confirme seu e-mail, ${name}!</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">
      Use o c\u00f3digo abaixo para verificar sua conta no <strong style="color:#1B7A6E">CondoDaily</strong>:
    </p>
    <div style="background:#F0FAF8;border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
      <p style="color:#999;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Seu c\u00f3digo de verifica\u00e7\u00e3o</p>
      <p style="color:#1B7A6E;font-size:36px;font-weight:800;letter-spacing:8px;margin:0">${code}</p>
    </div>
    <div style="background:#FFF8EB;border-left:4px solid #F5A623;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px">
      <p style="color:#666;font-size:13px;margin:0">
        Este c\u00f3digo expira em <strong>15 minutos</strong>. Se voc\u00ea n\u00e3o solicitou, ignore este e-mail.
      </p>
    </div>
  `);

  return sendEmail(email, subject, html);
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  code: string
): Promise<boolean> {
  const subject = 'Recupera\u00e7\u00e3o de senha - CondoDaily';
  const html = baseTemplate(`
    <h2 style="color:#1A2B3C;font-size:20px;margin:0 0 16px">Recupera\u00e7\u00e3o de senha</h2>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">
      Ol\u00e1 <strong>${name}</strong>, recebemos uma solicita\u00e7\u00e3o para redefinir sua senha no <strong style="color:#1B7A6E">CondoDaily</strong>.
    </p>
    <div style="background:#F0FAF8;border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
      <p style="color:#999;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">C\u00f3digo de recupera\u00e7\u00e3o</p>
      <p style="color:#1B7A6E;font-size:36px;font-weight:800;letter-spacing:8px;margin:0">${code}</p>
    </div>
    <div style="background:#FFF8EB;border-left:4px solid #F5A623;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px">
      <p style="color:#666;font-size:13px;margin:0">
        <strong>Aten\u00e7\u00e3o:</strong> este c\u00f3digo expira em <strong>15 minutos</strong>.
        Se voc\u00ea n\u00e3o solicitou a recupera\u00e7\u00e3o de senha, ignore este e-mail &mdash; sua conta est\u00e1 segura.
      </p>
    </div>
  `);

  return sendEmail(email, subject, html);
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
      subject: `Bem-vindo ao CondoDaily, ${lead.name}! Voc\u00ea \u00e9 o #${lead.vip_position} na fila VIP`,
      html: sindicoTemplate(lead.name, lead.vip_position),
    },
    PROFISSIONAL: {
      subject: `Cadastro confirmado, ${lead.name}! Posi\u00e7\u00e3o #${lead.vip_position} na fila VIP`,
      html: profissionalTemplate(lead.name, lead.quiz_score, lead.vip_position),
    },
    MORADOR: {
      subject: `Voc\u00ea est\u00e1 na lista, ${lead.name}!`,
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
      <h2 style="color:white;font-size:24px;margin:8px 0;font-weight:800">O CondoDaily est\u00e1 no ar!</h2>
      ${vipPosition ? `<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0">Voc\u00ea foi o <strong style="color:#F5A623">#${vipPosition}</strong> na nossa lista VIP</p>` : ''}
    </div>
    <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
      Ol\u00e1 <strong>${name}</strong>! Como um dos primeiros cadastrados, voc\u00ea tem <strong style="color:#1B7A6E">acesso priorit\u00e1rio</strong> ao app.
    </p>
    <div style="background:#F0FAF8;border-left:4px solid #1B7A6E;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
      <p style="color:#1B7A6E;font-size:14px;margin:0;font-weight:600">Seus benef\u00edcios VIP:</p>
      <ul style="color:#444;font-size:14px;line-height:1.8;margin:8px 0 0;padding-left:18px">
        ${isProf ? `
          <li><strong>Perfil destacado</strong> nos resultados de busca</li>
          <li><strong>Sem taxa</strong> nos primeiros 3 servi\u00e7os</li>
          <li><strong>Badge "Pioneiro"</strong> no seu perfil</li>
        ` : `
          <li><strong>Primeiro m\u00eas sem taxa</strong> de plataforma</li>
          <li><strong>Prioridade</strong> no suporte</li>
          <li><strong>Badge "Pioneiro"</strong> no seu condom\u00ednio</li>
        `}
      </ul>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="https://condodaily.com.br/download" style="display:inline-block;background:linear-gradient(135deg,#1B7A6E,#145C53);color:white;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 12px rgba(27,122,110,0.3)">Baixar o App Agora</a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:16px 0 0">
      Dispon\u00edvel para iOS e Android
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
  const subject = `${lead.name}, o CondoDaily est\u00e1 no ar! Acesse agora como VIP #${lead.vip_position || ''}`;
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
