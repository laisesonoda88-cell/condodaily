/**
 * CondoDaily — Mercado Pago OAuth Routes
 *
 * GET  /api/mp/oauth/auth-url       — Gera URL de autorização (autenticado)
 * GET  /api/mp/oauth/callback       — Callback do MP (público)
 * GET  /api/mp/oauth/status         — Status da conexão (autenticado)
 * POST /api/mp/oauth/disconnect     — Desconecta conta MP (autenticado)
 * POST /api/mp/oauth/refresh-token  — Renova token (autenticado)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { professionalPaymentInfo } from '../../db/schema.js';
import { mpOAuthService } from '../../services/mercadopago-oauth.js';
import { encrypt } from '../../services/crypto.js';

// ─── Helpers ────────────────────────────────────────────

function getRedirectUri(): string {
  return process.env.NODE_ENV === 'production'
    ? 'https://api.condodaily.com.br/api/mp/oauth/callback'
    : 'http://localhost:3001/api/mp/oauth/callback';
}

// ─── Routes ─────────────────────────────────────────────

export async function mpOAuthRoutes(app: FastifyInstance) {

  // ══════════════════════════════════════════════════════
  // GET /auth-url — Retorna URL de autorização do MP
  // ══════════════════════════════════════════════════════

  app.get('/auth-url', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; role: string };

    if (user.role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais podem conectar conta MP' });
    }

    const state = mpOAuthService.generateState(user.id);
    const authUrl = mpOAuthService.generateAuthUrl(state, getRedirectUri());

    return reply.send({
      success: true,
      data: { auth_url: authUrl },
    });
  });

  // ══════════════════════════════════════════════════════
  // GET /callback — MP redireciona aqui após autorização
  // (público — sem auth, é o browser do usuário)
  // ══════════════════════════════════════════════════════

  app.get('/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const { code, state, error: mpError } = query;

    // Usuário negou autorização
    if (mpError) {
      return reply.redirect('condodaily://mp-oauth-error?reason=denied');
    }

    if (!code || !state) {
      return reply.redirect('condodaily://mp-oauth-error?reason=missing_params');
    }

    // Validar state (CSRF + expiração)
    const stateData = mpOAuthService.parseState(state);
    if (!stateData) {
      return reply.redirect('condodaily://mp-oauth-error?reason=invalid_state');
    }

    try {
      // Trocar code por tokens
      const tokens = await mpOAuthService.exchangeCodeForTokens(code, getRedirectUri());

      // Encriptar tokens antes de salvar
      const encryptedAccessToken = encrypt(tokens.access_token);
      const encryptedRefreshToken = encrypt(tokens.refresh_token);
      const expiresAt = mpOAuthService.calculateExpiry(tokens.expires_in);

      // Buscar email do MP (non-critical)
      let mpEmail = '';
      try {
        const userInfo = await mpOAuthService.getUserInfo(tokens.access_token);
        mpEmail = userInfo.email || '';
      } catch (e) {
        app.log.warn(e, 'Não foi possível obter email do MP');
      }

      // Upsert professional_payment_info
      const [existing] = await db
        .select({ id: professionalPaymentInfo.id })
        .from(professionalPaymentInfo)
        .where(eq(professionalPaymentInfo.user_id, stateData.userId))
        .limit(1);

      const oauthData = {
        mp_user_id: String(tokens.user_id),
        mp_access_token: encryptedAccessToken,
        mp_refresh_token: encryptedRefreshToken,
        mp_token_expires_at: expiresAt,
        mp_connected: true,
        mp_connected_at: new Date(),
        mp_email: mpEmail,
        is_verified: true,
        verified_at: new Date(),
        updated_at: new Date(),
      };

      if (existing) {
        await db
          .update(professionalPaymentInfo)
          .set(oauthData)
          .where(eq(professionalPaymentInfo.user_id, stateData.userId));
      } else {
        await db
          .insert(professionalPaymentInfo)
          .values({ user_id: stateData.userId, ...oauthData });
      }

      app.log.info({ userId: stateData.userId, mpUserId: tokens.user_id }, 'MP OAuth conectado com sucesso');

      // Redirecionar de volta pro app via deep link
      return reply.redirect('condodaily://mp-oauth-success');

    } catch (err) {
      app.log.error(err, 'MP OAuth callback error');
      return reply.redirect('condodaily://mp-oauth-error?reason=exchange_failed');
    }
  });

  // ══════════════════════════════════════════════════════
  // GET /status — Status da conexão MP
  // ══════════════════════════════════════════════════════

  app.get('/status', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; role: string };

    if (user.role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    const [info] = await db
      .select({
        mp_connected: professionalPaymentInfo.mp_connected,
        mp_email: professionalPaymentInfo.mp_email,
        mp_connected_at: professionalPaymentInfo.mp_connected_at,
        mp_token_expires_at: professionalPaymentInfo.mp_token_expires_at,
      })
      .from(professionalPaymentInfo)
      .where(eq(professionalPaymentInfo.user_id, user.id))
      .limit(1);

    if (!info) {
      return reply.send({
        success: true,
        data: { connected: false, email: null, connected_at: null, token_healthy: false },
      });
    }

    return reply.send({
      success: true,
      data: {
        connected: info.mp_connected,
        email: info.mp_email,
        connected_at: info.mp_connected_at,
        token_healthy: info.mp_token_expires_at
          ? new Date(info.mp_token_expires_at) > new Date()
          : false,
      },
    });
  });

  // ══════════════════════════════════════════════════════
  // POST /disconnect — Desconecta conta MP
  // ══════════════════════════════════════════════════════

  app.post('/disconnect', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; role: string };

    if (user.role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    const [existing] = await db
      .select({ id: professionalPaymentInfo.id, mp_connected: professionalPaymentInfo.mp_connected })
      .from(professionalPaymentInfo)
      .where(eq(professionalPaymentInfo.user_id, user.id))
      .limit(1);

    if (!existing || !existing.mp_connected) {
      return reply.status(400).send({ success: false, error: 'Conta Mercado Pago não está conectada' });
    }

    await db
      .update(professionalPaymentInfo)
      .set({
        mp_user_id: null,
        mp_access_token: null,
        mp_refresh_token: null,
        mp_token_expires_at: null,
        mp_connected: false,
        mp_connected_at: null,
        mp_email: null,
        updated_at: new Date(),
      })
      .where(eq(professionalPaymentInfo.user_id, user.id));

    app.log.info({ userId: user.id }, 'MP OAuth desconectado');

    return reply.send({ success: true, message: 'Conta Mercado Pago desconectada' });
  });

  // ══════════════════════════════════════════════════════
  // POST /refresh-token — Renova token manualmente
  // ══════════════════════════════════════════════════════

  app.post('/refresh-token', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; role: string };

    if (user.role !== 'PROFISSIONAL') {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais' });
    }

    const [info] = await db
      .select({
        mp_refresh_token: professionalPaymentInfo.mp_refresh_token,
        mp_connected: professionalPaymentInfo.mp_connected,
      })
      .from(professionalPaymentInfo)
      .where(eq(professionalPaymentInfo.user_id, user.id))
      .limit(1);

    if (!info?.mp_connected || !info.mp_refresh_token) {
      return reply.status(400).send({ success: false, error: 'Conta MP não conectada' });
    }

    try {
      const tokens = await mpOAuthService.refreshAccessToken(info.mp_refresh_token);

      await db
        .update(professionalPaymentInfo)
        .set({
          mp_access_token: encrypt(tokens.access_token),
          mp_refresh_token: encrypt(tokens.refresh_token),
          mp_token_expires_at: mpOAuthService.calculateExpiry(tokens.expires_in),
          updated_at: new Date(),
        })
        .where(eq(professionalPaymentInfo.user_id, user.id));

      app.log.info({ userId: user.id }, 'MP OAuth token renovado');

      return reply.send({ success: true, message: 'Token atualizado com sucesso' });
    } catch (err) {
      app.log.error(err, 'MP OAuth token refresh error');
      return reply.status(500).send({ success: false, error: 'Falha ao renovar token' });
    }
  });
}
