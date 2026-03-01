import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, professionalProfiles } from '../../db/schema.js';
import { z } from 'zod';

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  avatar_url: z.string().url().optional(),
});

export async function userRoutes(app: FastifyInstance) {
  // GET /api/users/me
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string };

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        phone: users.phone,
        cpf: users.cpf,
        role: users.role,
        avatar_url: users.avatar_url,
        is_active: users.is_active,
        is_verified: users.is_verified,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ success: false, error: 'Usuário não encontrado' });
    }

    // If professional, include profile data
    let professional = null;
    if (user.role === 'PROFISSIONAL') {
      const [profile] = await db
        .select()
        .from(professionalProfiles)
        .where(eq(professionalProfiles.user_id, id))
        .limit(1);
      professional = profile || null;
    }

    return reply.send({
      success: true,
      data: { ...user, professional },
    });
  });

  // PUT /api/users/me
  app.put('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string };

    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        phone: users.phone,
        avatar_url: users.avatar_url,
      });

    return reply.send({ success: true, data: updated });
  });

  // PUT /api/users/push-token
  app.put('/push-token', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string };

    const schema = z.object({ push_token: z.string().min(1) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Token inválido' });
    }

    await db
      .update(users)
      .set({ push_token: parsed.data.push_token, updated_at: new Date() })
      .where(eq(users.id, id));

    return reply.send({ success: true, message: 'Push token registrado' });
  });
}
