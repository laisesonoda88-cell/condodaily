import { FastifyInstance } from 'fastify';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { notifications } from '../../db/schema.js';

export async function notificationRoutes(app: FastifyInstance) {
  // ─── Listar notificacoes do usuario ─────────────────────
  // GET /api/notifications?unread=true&page=1&limit=20
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { unread, page: pageStr, limit: limitStr } = request.query as {
      unread?: string;
      page?: string;
      limit?: string;
    };

    const page = Math.max(parseInt(pageStr || '1'), 1);
    const limit = Math.min(Math.max(parseInt(limitStr || '20'), 1), 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(notifications.user_id, userId)];
    if (unread === 'true') {
      conditions.push(isNull(notifications.read_at));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(whereClause);

    const items = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        type: notifications.type,
        data_json: notifications.data_json,
        read_at: notifications.read_at,
        created_at: notifications.created_at,
      })
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);

    const total = totalResult?.count || 0;

    return reply.send({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  });

  // ─── Contagem de nao lidas ────────────────────────────────
  // GET /api/notifications/unread-count
  app.get('/unread-count', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, userId),
          isNull(notifications.read_at),
        ),
      );

    return reply.send({
      success: true,
      data: { unread_count: result?.count || 0 },
    });
  });

  // ─── Marcar uma notificacao como lida ─────────────────────
  // POST /api/notifications/:id/read
  app.post('/:id/read', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: notificationId } = request.params as { id: string };

    const [notification] = await db
      .select({ id: notifications.id, user_id: notifications.user_id })
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) {
      return reply.status(404).send({ success: false, error: 'Notificacao nao encontrada' });
    }

    if (notification.user_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Acesso negado' });
    }

    await db
      .update(notifications)
      .set({ read_at: new Date() })
      .where(eq(notifications.id, notificationId));

    return reply.send({ success: true, message: 'Notificacao marcada como lida' });
  });

  // ─── Marcar todas como lidas ──────────────────────────────
  // POST /api/notifications/read-all
  app.post('/read-all', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const result = await db
      .update(notifications)
      .set({ read_at: new Date() })
      .where(
        and(
          eq(notifications.user_id, userId),
          isNull(notifications.read_at),
        ),
      );

    return reply.send({ success: true, message: 'Todas notificacoes marcadas como lidas' });
  });
}
