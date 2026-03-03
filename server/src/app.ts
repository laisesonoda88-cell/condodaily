import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { condoRoutes } from './modules/condos/condos.routes.js';
import { bookingRoutes } from './modules/bookings/bookings.routes.js';
import { reviewRoutes } from './modules/reviews/reviews.routes.js';
import { categoryRoutes } from './modules/condos/categories.routes.js';
import { paymentRoutes } from './modules/payments/payments.routes.js';
import { mercadoPagoPaymentRoutes } from './modules/payments/mercadopago.routes.js';
import { webhookRoutes } from './modules/payments/webhook.routes.js';
import { professionalRoutes } from './modules/users/professionals.routes.js';
import { penaltyRoutes } from './modules/penalties/penalties.routes.js';
import { leadRoutes } from './modules/leads/leads.routes.js';
import { mpOAuthRoutes } from './modules/payments/mercadopago-oauth.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { documentRoutes } from './modules/documents/documents.routes.js';
import { receiptRoutes } from './modules/receipts/receipts.routes.js';
import { notificationRoutes } from './modules/notifications/notifications.routes.js';

// ─── Startup Env Validation ──────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL não configurado');
  process.exit(1);
}

if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
  console.error('FATAL: ENCRYPTION_KEY não configurado ou muito curto (mínimo 32 caracteres)');
  process.exit(1);
}

if (isProduction && (!process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN === '')) {
  console.error('FATAL: MP_ACCESS_TOKEN não configurado em produção');
  process.exit(1);
}

if (isProduction && !process.env.MP_WEBHOOK_SECRET) {
  console.warn('⚠ AVISO: MP_WEBHOOK_SECRET não configurado — webhooks Mercado Pago não serão verificados');
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠ AVISO: ANTHROPIC_API_KEY não configurado — análise de documentos de condomínio ficará indisponível');
}

if (isProduction && (!process.env.MP_CLIENT_ID || !process.env.MP_CLIENT_SECRET)) {
  console.warn('⚠ AVISO: MP_CLIENT_ID/MP_CLIENT_SECRET não configurados — OAuth do Mercado Pago ficará indisponível');
}

// ─── Logger ──────────────────────────────────────────────
const app = Fastify({
  logger: {
    level: 'info',
    ...(isProduction
      ? {} // JSON structured logs em produção (sem pino-pretty)
      : {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        }),
  },
});

// Plugins
await app.register(cors, {
  origin: isProduction
    ? ['https://condodaily.com.br', 'https://www.condodaily.com.br', 'https://api.condodaily.com.br']
    : true,
  credentials: true,
});

// SECURITY: JWT secret must be explicitly configured (already validated above in env check)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET não configurado ou muito curto (mínimo 32 caracteres)');
  process.exit(1);
}

await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { expiresIn: '15m' },
});

// SECURITY: Security headers (HSTS, X-Content-Type-Options, etc.)
await app.register(helmet, {
  contentSecurityPolicy: false, // CSP disabled — mobile API, not serving HTML
});

await app.register(rateLimit, {
  max: 100,           // 100 requests per window (global)
  timeWindow: '1 minute',
  ...(!isProduction ? { allowList: ['127.0.0.1'] } : {}),
});

await app.register(multipart, {
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
});

// Decorator for auth
app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ success: false, error: 'Token inválido ou expirado' });
  }
});

// Static files: .well-known (deep links)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
await app.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  decorateReply: false,
});

// Uploads (avatars, documents, etc.)
await app.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
  decorateReply: false,
});

// Health check
app.get('/health', async () => {
  return { status: 'ok' };
});
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' };
});

// Routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(condoRoutes, { prefix: '/api/condos' });
await app.register(bookingRoutes, { prefix: '/api/bookings' });
await app.register(reviewRoutes, { prefix: '/api/reviews' });
await app.register(categoryRoutes, { prefix: '/api/categories' });
await app.register(paymentRoutes, { prefix: '/api/wallet' });
await app.register(mercadoPagoPaymentRoutes, { prefix: '/api/payments' });
await app.register(webhookRoutes, { prefix: '/api/webhooks/mercadopago' });
await app.register(professionalRoutes, { prefix: '/api/professionals' });
await app.register(penaltyRoutes, { prefix: '/api/penalties' });
await app.register(leadRoutes, { prefix: '/api/leads' });
await app.register(chatRoutes, { prefix: '/api/chat' });
await app.register(documentRoutes, { prefix: '/api/documents' });
await app.register(receiptRoutes, { prefix: '/api/receipts' });
await app.register(mpOAuthRoutes, { prefix: '/api/mp/oauth' });
await app.register(notificationRoutes, { prefix: '/api/notifications' });

// Start server
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`🏢 CondoDaily Server running on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export default app;
