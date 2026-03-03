import { FastifyInstance } from 'fastify';
import { eq, and, or, desc, gt, sql, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { chatConversations, chatMessages, users, bookings } from '../../db/schema.js';
import { z } from 'zod';

export async function chatRoutes(app: FastifyInstance) {
  // ─── Listar conversas do usuário ────────────────────────
  // GET /api/chat/conversations
  app.get('/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const conversations = await db
      .select({
        id: chatConversations.id,
        booking_id: chatConversations.booking_id,
        contratante_id: chatConversations.contratante_id,
        profissional_id: chatConversations.profissional_id,
        last_message_at: chatConversations.last_message_at,
        created_at: chatConversations.created_at,
      })
      .from(chatConversations)
      .where(
        or(
          eq(chatConversations.contratante_id, userId),
          eq(chatConversations.profissional_id, userId),
        ),
      )
      .orderBy(desc(chatConversations.last_message_at));

    // Enriquecer com dados do outro participante e última mensagem
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const otherId = conv.contratante_id === userId ? conv.profissional_id : conv.contratante_id;

        const [otherUser] = await db
          .select({
            id: users.id,
            full_name: users.full_name,
            avatar_url: users.avatar_url,
          })
          .from(users)
          .where(eq(users.id, otherId))
          .limit(1);

        // Última mensagem
        const [lastMsg] = await db
          .select({
            content: chatMessages.content,
            sender_id: chatMessages.sender_id,
            created_at: chatMessages.created_at,
          })
          .from(chatMessages)
          .where(eq(chatMessages.conversation_id, conv.id))
          .orderBy(desc(chatMessages.created_at))
          .limit(1);

        // Contagem de não lidas
        const [unreadCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversation_id, conv.id),
              sql`${chatMessages.sender_id} != ${userId}`,
              isNull(chatMessages.read_at),
            ),
          );

        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMsg || null,
          unread_count: unreadCount?.count || 0,
        };
      }),
    );

    return reply.send({ success: true, data: enriched });
  });

  // ─── Obter ou criar conversa por booking ────────────────
  // POST /api/chat/conversations
  app.post('/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const schema = z.object({ booking_id: z.string().uuid() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'booking_id obrigatório' });
    }

    const { booking_id } = parsed.data;

    // Verificar se o booking existe e o usuário é parte dele
    const [booking] = await db
      .select({
        id: bookings.id,
        contratante_id: bookings.contratante_id,
        profissional_id: bookings.profissional_id,
      })
      .from(bookings)
      .where(eq(bookings.id, booking_id))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Booking não encontrado' });
    }

    if (booking.contratante_id !== userId && booking.profissional_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Você não faz parte deste booking' });
    }

    // Verificar se já existe conversa para esse booking
    const [existing] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.booking_id, booking_id))
      .limit(1);

    if (existing) {
      return reply.send({ success: true, data: existing });
    }

    // Criar nova conversa
    const [conversation] = await db
      .insert(chatConversations)
      .values({
        booking_id,
        contratante_id: booking.contratante_id,
        profissional_id: booking.profissional_id,
      })
      .returning();

    return reply.status(201).send({ success: true, data: conversation });
  });

  // ─── Listar mensagens de uma conversa ───────────────────
  // GET /api/chat/conversations/:id/messages
  app.get('/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: conversationId } = request.params as { id: string };
    const { before, limit: limitStr } = request.query as { before?: string; limit?: string };
    const limit = Math.min(parseInt(limitStr || '50'), 100);

    // Verificar se o usuário faz parte da conversa
    const [conv] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conv || (conv.contratante_id !== userId && conv.profissional_id !== userId)) {
      return reply.status(403).send({ success: false, error: 'Acesso negado' });
    }

    // Buscar mensagens
    const conditions = [eq(chatMessages.conversation_id, conversationId)];
    if (before) {
      conditions.push(sql`${chatMessages.created_at} < ${before}`);
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        conversation_id: chatMessages.conversation_id,
        sender_id: chatMessages.sender_id,
        content: chatMessages.content,
        read_at: chatMessages.read_at,
        created_at: chatMessages.created_at,
      })
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(desc(chatMessages.created_at))
      .limit(limit);

    // Marcar mensagens do outro como lidas
    await db
      .update(chatMessages)
      .set({ read_at: new Date() })
      .where(
        and(
          eq(chatMessages.conversation_id, conversationId),
          sql`${chatMessages.sender_id} != ${userId}`,
          isNull(chatMessages.read_at),
        ),
      );

    return reply.send({ success: true, data: messages.reverse() });
  });

  // ─── Enviar mensagem ────────────────────────────────────
  // POST /api/chat/conversations/:id/messages
  app.post('/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: conversationId } = request.params as { id: string };

    const schema = z.object({ content: z.string().min(1).max(2000) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Mensagem obrigatória (máx 2000 caracteres)' });
    }

    // Verificar se o usuário faz parte da conversa
    const [conv] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conv || (conv.contratante_id !== userId && conv.profissional_id !== userId)) {
      return reply.status(403).send({ success: false, error: 'Acesso negado' });
    }

    // Inserir mensagem
    const [message] = await db
      .insert(chatMessages)
      .values({
        conversation_id: conversationId,
        sender_id: userId,
        content: parsed.data.content,
      })
      .returning();

    // Atualizar last_message_at na conversa
    await db
      .update(chatConversations)
      .set({ last_message_at: new Date() })
      .where(eq(chatConversations.id, conversationId));

    return reply.status(201).send({ success: true, data: message });
  });

  // ─── Contagem de mensagens não lidas (badge) ────────────
  // GET /api/chat/unread-count
  app.get('/unread-count', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    // Buscar IDs de conversas do usuário
    const userConvs = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        or(
          eq(chatConversations.contratante_id, userId),
          eq(chatConversations.profissional_id, userId),
        ),
      );

    if (userConvs.length === 0) {
      return reply.send({ success: true, data: { unread_count: 0 } });
    }

    const convIds = userConvs.map((c) => c.id);

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          sql`${chatMessages.conversation_id} IN (${sql.join(convIds.map((id) => sql`${id}`), sql`, `)})`,
          sql`${chatMessages.sender_id} != ${userId}`,
          isNull(chatMessages.read_at),
        ),
      );

    return reply.send({ success: true, data: { unread_count: result?.count || 0 } });
  });
}
