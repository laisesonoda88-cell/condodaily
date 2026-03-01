import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, lt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, professionalProfiles, usedRefreshTokens } from '../../db/schema.js';
import { z } from 'zod';

/** Hash a refresh token for safe storage */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  role: z.enum(['CONTRATANTE', 'PROFISSIONAL']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // Rate limit: stricter for auth endpoints (brute-force protection)
  const authRateLimit = {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  };

  // POST /api/auth/register
  app.post('/register', authRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, full_name, cpf, phone, role } = parsed.data;

    // Check if user exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({
        success: false,
        error: 'Este email já está cadastrado',
      });
    }

    // Check CPF
    const existingCpf = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cpf, cpf))
      .limit(1);

    if (existingCpf.length > 0) {
      return reply.status(409).send({
        success: false,
        error: 'Este CPF já está cadastrado',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password_hash,
        full_name,
        cpf,
        phone,
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        role: users.role,
      });

    // Create professional profile if role is PROFISSIONAL
    if (role === 'PROFISSIONAL') {
      await db.insert(professionalProfiles).values({
        user_id: newUser.id,
      });
    }

    // Generate tokens
    const access_token = app.jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      { expiresIn: '15m' }
    );
    const refresh_token = app.jwt.sign(
      { id: newUser.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return reply.status(201).send({
      success: true,
      data: {
        user: newUser,
        access_token,
        refresh_token,
      },
    });
  });

  // POST /api/auth/login
  app.post('/login', authRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Email e senha são obrigatórios',
      });
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Email ou senha incorretos',
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return reply.status(401).send({
        success: false,
        error: 'Email ou senha incorretos',
      });
    }

    if (!user.is_active) {
      return reply.status(403).send({
        success: false,
        error: 'Conta desativada. Entre em contato com o suporte.',
      });
    }

    const access_token = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' }
    );
    const refresh_token = app.jwt.sign(
      { id: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          avatar_url: user.avatar_url,
          is_verified: user.is_verified,
        },
        access_token,
        refresh_token,
      },
    });
  });

  // POST /api/auth/refresh (L2: token rotation — each refresh token is single-use)
  app.post('/refresh', async (request, reply) => {
    const { refresh_token } = request.body as { refresh_token: string };

    if (!refresh_token) {
      return reply.status(400).send({
        success: false,
        error: 'Refresh token é obrigatório',
      });
    }

    try {
      const decoded = app.jwt.verify<{ id: string; type: string; exp: number }>(refresh_token);

      if (decoded.type !== 'refresh') {
        return reply.status(401).send({ success: false, error: 'Token inválido' });
      }

      // L2: Check if this refresh token was already used (token rotation)
      const tokenHash = hashToken(refresh_token);
      const [alreadyUsed] = await db
        .select({ id: usedRefreshTokens.id })
        .from(usedRefreshTokens)
        .where(eq(usedRefreshTokens.token_hash, tokenHash))
        .limit(1);

      if (alreadyUsed) {
        // Possible token theft — old token reused. Log and reject.
        console.warn(`[AUTH] Refresh token reuse detected for user ${decoded.id}. Possible theft.`);
        return reply.status(401).send({
          success: false,
          error: 'Token já utilizado. Faça login novamente.',
        });
      }

      const [user] = await db
        .select({ id: users.id, email: users.email, role: users.role, is_active: users.is_active })
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (!user) {
        return reply.status(401).send({ success: false, error: 'Usuário não encontrado' });
      }

      if (!user.is_active) {
        return reply.status(403).send({ success: false, error: 'Conta desativada. Entre em contato com o suporte.' });
      }

      // L2: Mark this refresh token as used (blacklist)
      await db.insert(usedRefreshTokens).values({
        token_hash: tokenHash,
        user_id: user.id,
        expires_at: new Date(decoded.exp * 1000), // keep until JWT natural expiry
      });

      // L2: Cleanup expired blacklist entries (older tokens auto-expire via JWT)
      await db.delete(usedRefreshTokens).where(lt(usedRefreshTokens.expires_at, new Date()));

      const new_access_token = app.jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' }
      );
      const new_refresh_token = app.jwt.sign(
        { id: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      );

      return reply.send({
        success: true,
        data: { access_token: new_access_token, refresh_token: new_refresh_token },
      });
    } catch {
      return reply.status(401).send({ success: false, error: 'Token expirado ou inválido' });
    }
  });
}
