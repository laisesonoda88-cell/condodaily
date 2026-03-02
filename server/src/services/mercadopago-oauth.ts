/**
 * CondoDaily — Mercado Pago OAuth Service
 *
 * Gerencia o fluxo OAuth para profissionais conectarem suas contas MP.
 * Tokens são encriptados com AES-256-GCM (crypto.ts) antes de salvar no DB.
 */

import crypto from 'crypto';
import { encrypt, decrypt } from './crypto.js';

const MP_AUTH_BASE = 'https://auth.mercadopago.com.br';
const MP_API_BASE = 'https://api.mercadopago.com';

// Estado expira em 15 minutos
const STATE_TTL_MS = 15 * 60 * 1000;

// ─── Types ──────────────────────────────────────────────

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds (~15552000 = 6 months)
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
}

interface StatePayload {
  userId: string;
  nonce: string;
  ts: number;
}

// ─── Service ────────────────────────────────────────────

export const mpOAuthService = {
  /**
   * Gera a URL de autorização do Mercado Pago.
   */
  generateAuthUrl(state: string, redirectUri: string): string {
    const clientId = process.env.MP_CLIENT_ID;
    if (!clientId) throw new Error('MP_CLIENT_ID não configurado');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: redirectUri,
      state,
    });

    return `${MP_AUTH_BASE}/authorization?${params.toString()}`;
  },

  /**
   * Troca o authorization code por access_token + refresh_token.
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
    const res = await fetch(`${MP_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`MP OAuth token exchange failed: ${res.status} - ${errorText}`);
    }

    return res.json();
  },

  /**
   * Renova o access_token usando o refresh_token (antes de expirar).
   */
  async refreshAccessToken(encryptedRefreshToken: string): Promise<OAuthTokenResponse> {
    const refreshToken = decrypt(encryptedRefreshToken);

    const res = await fetch(`${MP_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`MP OAuth refresh failed: ${res.status} - ${errorText}`);
    }

    return res.json();
  },

  /**
   * Busca info do usuário MP (email, id) usando o access_token.
   */
  async getUserInfo(accessToken: string): Promise<{ email: string; id: number }> {
    const res = await fetch(`${MP_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error('Falha ao obter info do usuário MP');
    const data = await res.json();
    return { email: data.email, id: data.id };
  },

  /**
   * Encripta token para armazenamento seguro no DB.
   */
  encryptToken(token: string): string {
    return encrypt(token);
  },

  /**
   * Calcula a data de expiração a partir de expires_in (segundos).
   */
  calculateExpiry(expiresIn: number): Date {
    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + expiresIn);
    return expiry;
  },

  /**
   * Gera um state token seguro (CSRF protection).
   * Formato: base64url({ userId, nonce, ts })
   */
  generateState(userId: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload: StatePayload = { userId, nonce, ts: Date.now() };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  },

  /**
   * Valida e decodifica o state token.
   * Retorna null se inválido ou expirado (> 15 min).
   */
  parseState(state: string): StatePayload | null {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as StatePayload;
      if (Date.now() - parsed.ts > STATE_TTL_MS) return null;
      if (!parsed.userId || !parsed.nonce) return null;
      return parsed;
    } catch {
      return null;
    }
  },
};
