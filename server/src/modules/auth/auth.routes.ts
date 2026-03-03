import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, lt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, professionalProfiles, usedRefreshTokens } from '../../db/schema.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/email.js';
import { z } from 'zod';
import { validateCPF, validateCNPJ } from '@condodaily/shared';

/** Hash a refresh token for safe storage */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Generate a 6-digit numeric verification code */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Returns a Date 15 minutes from now */
function codeExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000);
}

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().min(11, 'CPF invalido'),
  phone: z.string().min(10, 'Telefone invalido'),
  role: z.enum(['CONTRATANTE', 'PROFISSIONAL']),
  terms_accepted: z.boolean().refine((v) => v === true, { message: 'Aceite dos Termos de Uso é obrigatório' }),
  terms_version: z.string().default('1.0'),
  lgpd_ai_consent: z.boolean().refine((v) => v === true, { message: 'Consentimento LGPD é obrigatório' }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verifyEmailSchema = z.object({
  email: z.string().email('Email invalido'),
  code: z.string().length(6, 'Codigo deve ter 6 digitos'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Email invalido'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
  code: z.string().length(6, 'Codigo deve ter 6 digitos'),
  new_password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export async function authRoutes(app: FastifyInstance) {
  // Rate limit: stricter for auth endpoints (brute-force protection)
  const authRateLimit = {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  };

  // Even stricter rate limit for code-sending endpoints
  const codeRateLimit = {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
  };

  // POST /api/auth/register
  app.post('/register', authRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados invalidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, full_name, cpf, phone, role, terms_version } = parsed.data;
    const documentType = (request.body as any)?.document_type || 'CPF';
    const now = new Date();

    // Validar CPF/CNPJ com dígitos verificadores
    if (documentType === 'CNPJ') {
      if (!validateCNPJ(cpf)) {
        return reply.status(400).send({ success: false, error: 'CNPJ inválido (dígitos verificadores não conferem)' });
      }
    } else {
      if (!validateCPF(cpf)) {
        return reply.status(400).send({ success: false, error: 'CPF inválido (dígitos verificadores não conferem)' });
      }
    }

    // Check if user exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({
        success: false,
        error: 'Este email ja esta cadastrado',
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
        error: 'Este CPF ja esta cadastrado',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = generateCode();
    const verificationExpires = codeExpiry();

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password_hash,
        full_name,
        cpf,
        phone,
        role,
        email_verification_code: verificationCode,
        email_verification_expires: verificationExpires,
        terms_accepted_at: now,
        terms_version,
        lgpd_ai_consent_at: now,
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

    // Send verification email (fire-and-forget, don't block registration)
    sendVerificationEmail(email, full_name, verificationCode).catch((err) => {
      console.error('[AUTH] Failed to send verification email:', err);
    });

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
        error: 'Email e senha sao obrigatorios',
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

  // POST /api/auth/verify-email
  app.post('/verify-email', authRateLimit, async (request, reply) => {
    const parsed = verifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados invalidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, code } = parsed.data;

    const [user] = await db
      .select({
        id: users.id,
        is_verified: users.is_verified,
        email_verification_code: users.email_verification_code,
        email_verification_expires: users.email_verification_expires,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return reply.status(400).send({
        success: false,
        error: 'Codigo invalido ou expirado',
      });
    }

    if (user.is_verified) {
      return reply.send({
        success: true,
        message: 'Email ja verificado',
      });
    }

    if (
      !user.email_verification_code ||
      !user.email_verification_expires ||
      user.email_verification_code !== code
    ) {
      return reply.status(400).send({
        success: false,
        error: 'Codigo invalido ou expirado',
      });
    }

    if (new Date() > user.email_verification_expires) {
      return reply.status(400).send({
        success: false,
        error: 'Codigo invalido ou expirado',
      });
    }

    // Mark user as verified and clear the code
    await db
      .update(users)
      .set({
        is_verified: true,
        email_verification_code: null,
        email_verification_expires: null,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id));

    return reply.send({
      success: true,
      message: 'Email verificado com sucesso',
    });
  });

  // POST /api/auth/resend-verification
  app.post('/resend-verification', codeRateLimit, async (request, reply) => {
    const parsed = resendVerificationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados invalidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email } = parsed.data;

    const [user] = await db
      .select({
        id: users.id,
        full_name: users.full_name,
        is_verified: users.is_verified,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't leak whether email exists — return success
      return reply.send({
        success: true,
        message: 'Se o email estiver cadastrado, um novo codigo sera enviado',
      });
    }

    if (user.is_verified) {
      return reply.send({
        success: true,
        message: 'Email ja verificado',
      });
    }

    const code = generateCode();
    const expires = codeExpiry();

    await db
      .update(users)
      .set({
        email_verification_code: code,
        email_verification_expires: expires,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id));

    sendVerificationEmail(email, user.full_name, code).catch((err) => {
      console.error('[AUTH] Failed to send verification email:', err);
    });

    return reply.send({
      success: true,
      message: 'Se o email estiver cadastrado, um novo codigo sera enviado',
    });
  });

  // POST /api/auth/forgot-password
  app.post('/forgot-password', codeRateLimit, async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados invalidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email } = parsed.data;

    const [user] = await db
      .select({
        id: users.id,
        full_name: users.full_name,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to avoid leaking whether email exists
    if (!user) {
      return reply.send({
        success: true,
        message: 'Se o email estiver cadastrado, um codigo de recuperacao sera enviado',
      });
    }

    const code = generateCode();
    const expires = codeExpiry();

    await db
      .update(users)
      .set({
        password_reset_code: code,
        password_reset_expires: expires,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id));

    sendPasswordResetEmail(email, user.full_name, code).catch((err) => {
      console.error('[AUTH] Failed to send password reset email:', err);
    });

    return reply.send({
      success: true,
      message: 'Se o email estiver cadastrado, um codigo de recuperacao sera enviado',
    });
  });

  // POST /api/auth/reset-password
  app.post('/reset-password', authRateLimit, async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados invalidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, code, new_password } = parsed.data;

    const [user] = await db
      .select({
        id: users.id,
        password_reset_code: users.password_reset_code,
        password_reset_expires: users.password_reset_expires,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return reply.status(400).send({
        success: false,
        error: 'Codigo invalido ou expirado',
      });
    }

    if (
      !user.password_reset_code ||
      !user.password_reset_expires ||
      user.password_reset_code !== code
    ) {
      return reply.status(400).send({
        success: false,
        error: 'Codigo invalido ou expirado',
      });
    }

    if (new Date() > user.password_reset_expires) {
      return reply.status(400).send({
        success: false,
        error: 'Codigo invalido ou expirado',
      });
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    await db
      .update(users)
      .set({
        password_hash,
        password_reset_code: null,
        password_reset_expires: null,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id));

    return reply.send({
      success: true,
      message: 'Senha alterada com sucesso',
    });
  });

  // POST /api/auth/refresh (L2: token rotation — each refresh token is single-use)
  app.post('/refresh', async (request, reply) => {
    const { refresh_token } = request.body as { refresh_token: string };

    if (!refresh_token) {
      return reply.status(400).send({
        success: false,
        error: 'Refresh token e obrigatorio',
      });
    }

    try {
      const decoded = app.jwt.verify<{ id: string; type: string; exp: number }>(refresh_token);

      if (decoded.type !== 'refresh') {
        return reply.status(401).send({ success: false, error: 'Token invalido' });
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
          error: 'Token ja utilizado. Faca login novamente.',
        });
      }

      const [user] = await db
        .select({ id: users.id, email: users.email, role: users.role, is_active: users.is_active })
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (!user) {
        return reply.status(401).send({ success: false, error: 'Usuario nao encontrado' });
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
      return reply.status(401).send({ success: false, error: 'Token expirado ou invalido' });
    }
  });
}
