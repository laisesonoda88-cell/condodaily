import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, professionalProfiles } from '../../db/schema.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import sharp from 'sharp';

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

  // ─── Upload de Avatar ────────────────────────────────
  // POST /api/users/avatar
  app.post('/avatar', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: 'Nenhuma imagem enviada' });
    }

    // Validar tipo de arquivo (apenas imagens)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedMimes.includes(file.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: 'Formato não suportado. Envie JPG, PNG ou WebP.',
      });
    }

    // Criar diretório de uploads
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars', userId);
    await fs.mkdir(uploadsDir, { recursive: true });

    // Ler o buffer da imagem
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer);
    }
    const imageBuffer = Buffer.concat(chunks);

    // Processar com sharp: redimensionar para 400x400, converter para WebP
    const fileName = `avatar-${Date.now()}.webp`;
    const filePath = path.join(uploadsDir, fileName);

    await sharp(imageBuffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toFile(filePath);

    // Também criar thumbnail 80x80 para listagens
    const thumbName = `thumb-${Date.now()}.webp`;
    const thumbPath = path.join(uploadsDir, thumbName);

    await sharp(imageBuffer)
      .resize(80, 80, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    // Remover avatar antigo (se existir)
    const [currentUser] = await db
      .select({ avatar_url: users.avatar_url })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (currentUser?.avatar_url) {
      const oldPath = path.join(process.cwd(), currentUser.avatar_url);
      await fs.unlink(oldPath).catch(() => {}); // ignora se não existe
      // Remover thumb antigo também
      const oldThumbPath = oldPath.replace('avatar-', 'thumb-');
      await fs.unlink(oldThumbPath).catch(() => {});
    }

    // Atualizar URL no banco
    const avatarUrl = `/uploads/avatars/${userId}/${fileName}`;
    const [updated] = await db
      .update(users)
      .set({ avatar_url: avatarUrl, updated_at: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        avatar_url: users.avatar_url,
      });

    return reply.send({
      success: true,
      data: {
        avatar_url: avatarUrl,
        thumb_url: `/uploads/avatars/${userId}/${thumbName}`,
      },
    });
  });

  // DELETE /api/users/avatar
  app.delete('/avatar', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    // Remover arquivo do disco
    const [currentUser] = await db
      .select({ avatar_url: users.avatar_url })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (currentUser?.avatar_url) {
      const avatarDir = path.join(process.cwd(), 'uploads', 'avatars', userId);
      await fs.rm(avatarDir, { recursive: true, force: true }).catch(() => {});
    }

    // Limpar no banco
    await db
      .update(users)
      .set({ avatar_url: null, updated_at: new Date() })
      .where(eq(users.id, userId));

    return reply.send({ success: true, message: 'Avatar removido' });
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

  // ─── LGPD: Exclusão de conta ─────────────────────────
  // DELETE /api/users/me
  // Desativa a conta e anonimiza dados pessoais conforme LGPD
  app.delete('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const requestSchema = z.object({
      confirmation: z.literal('EXCLUIR MINHA CONTA'),
    });

    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Para confirmar, envie { "confirmation": "EXCLUIR MINHA CONTA" }',
      });
    }

    // Verificar se não tem bookings ativos
    const { bookings: bookingsTable } = await import('../../db/schema.js');
    const { and, inArray } = await import('drizzle-orm');

    const activeBookings = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.contratante_id, userId),
          inArray(bookingsTable.status, ['PENDING', 'ACCEPTED', 'IN_PROGRESS'])
        )
      )
      .limit(1);

    const activeProBookings = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.profissional_id, userId),
          inArray(bookingsTable.status, ['PENDING', 'ACCEPTED', 'IN_PROGRESS'])
        )
      )
      .limit(1);

    if (activeBookings.length > 0 || activeProBookings.length > 0) {
      return reply.status(400).send({
        success: false,
        error: 'Não é possível excluir a conta com agendamentos ativos. Cancele ou conclua os serviços pendentes primeiro.',
      });
    }

    // Anonimizar dados pessoais (manter estrutura para integridade do banco)
    const anonymizedName = `Usuário Excluído ${userId.slice(0, 8)}`;
    const anonymizedEmail = `deleted_${userId}@excluido.condodaily.com.br`;

    await db
      .update(users)
      .set({
        full_name: anonymizedName,
        email: anonymizedEmail,
        phone: '',
        cpf: '',
        avatar_url: null,
        push_token: null,
        is_active: false,
        updated_at: new Date(),
      } as any)
      .where(eq(users.id, userId));

    // Limpar perfil profissional se existir
    await db
      .update(professionalProfiles)
      .set({
        doc_rg_url: null,
        doc_cpf_url: null,
        doc_comprovante_url: null,
        doc_selfie_url: null,
        doc_status: 'PENDENTE',
      })
      .where(eq(professionalProfiles.user_id, userId));

    // Remover uploads do disco
    const avatarDir = path.join(process.cwd(), 'uploads', 'avatars', userId);
    const docsDir = path.join(process.cwd(), 'uploads', 'documents', userId);
    await fs.rm(avatarDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(docsDir, { recursive: true, force: true }).catch(() => {});

    return reply.send({
      success: true,
      message: 'Conta excluída com sucesso. Seus dados pessoais foram removidos conforme a LGPD.',
    });
  });
}
