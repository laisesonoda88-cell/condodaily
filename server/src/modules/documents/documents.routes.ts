import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, professionalProfiles } from '../../db/schema.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

const DOC_TYPES = ['rg', 'cpf', 'comprovante', 'selfie'] as const;
type DocType = typeof DOC_TYPES[number];

export async function documentRoutes(app: FastifyInstance) {
  // ─── Upload de documento de verificação ─────────────────
  // POST /api/documents/upload
  app.post('/upload', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    // Verificar se é profissional
    const [profile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      return reply.status(403).send({ success: false, error: 'Apenas profissionais podem enviar documentos' });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado' });
    }

    // O tipo do documento vem no field name ou como query param
    const docType = (file.fieldname || (request.query as any)?.type) as DocType;
    if (!DOC_TYPES.includes(docType)) {
      return reply.status(400).send({
        success: false,
        error: `Tipo de documento inválido. Use: ${DOC_TYPES.join(', ')}`,
      });
    }

    // Validar mime type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: 'Formato não suportado. Envie JPG, PNG, WebP ou PDF.',
      });
    }

    // Criar diretório
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', userId);
    await fs.mkdir(uploadsDir, { recursive: true });

    // Ler buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    // Salvar (converter imagens para WebP)
    let fileName: string;
    if (file.mimetype === 'application/pdf') {
      fileName = `${docType}-${Date.now()}.pdf`;
      await fs.writeFile(path.join(uploadsDir, fileName), buffer);
    } else {
      fileName = `${docType}-${Date.now()}.webp`;
      await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(path.join(uploadsDir, fileName));
    }

    const docUrl = `/uploads/documents/${userId}/${fileName}`;

    // Atualizar URL no perfil
    const columnMap: Record<DocType, string> = {
      rg: 'doc_rg_url',
      cpf: 'doc_cpf_url',
      comprovante: 'doc_comprovante_url',
      selfie: 'doc_selfie_url',
    };

    await db
      .update(professionalProfiles)
      .set({
        [columnMap[docType]]: docUrl,
      } as any)
      .where(eq(professionalProfiles.user_id, userId));

    return reply.send({
      success: true,
      data: { type: docType, url: docUrl },
    });
  });

  // ─── Submeter documentos para análise ───────────────────
  // POST /api/documents/submit
  app.post('/submit', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const [profile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      return reply.status(403).send({ success: false, error: 'Perfil profissional não encontrado' });
    }

    // Verificar se todos os documentos foram enviados
    if (!profile.doc_rg_url || !profile.doc_selfie_url) {
      return reply.status(400).send({
        success: false,
        error: 'Envie pelo menos RG/CNH e selfie para verificação.',
      });
    }

    await db
      .update(professionalProfiles)
      .set({
        doc_status: 'EM_ANALISE',
        doc_submitted_at: new Date(),
      })
      .where(eq(professionalProfiles.user_id, userId));

    return reply.send({
      success: true,
      message: 'Documentos enviados para análise. Você será notificado em até 48h.',
    });
  });

  // ─── Status da verificação ──────────────────────────────
  // GET /api/documents/status
  app.get('/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const [profile] = await db
      .select({
        doc_status: professionalProfiles.doc_status,
        doc_rg_url: professionalProfiles.doc_rg_url,
        doc_cpf_url: professionalProfiles.doc_cpf_url,
        doc_comprovante_url: professionalProfiles.doc_comprovante_url,
        doc_selfie_url: professionalProfiles.doc_selfie_url,
        doc_submitted_at: professionalProfiles.doc_submitted_at,
        doc_reviewed_at: professionalProfiles.doc_reviewed_at,
        doc_rejection_reason: professionalProfiles.doc_rejection_reason,
      })
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (!profile) {
      return reply.status(404).send({ success: false, error: 'Perfil não encontrado' });
    }

    return reply.send({
      success: true,
      data: {
        status: profile.doc_status,
        documents: {
          rg: !!profile.doc_rg_url,
          cpf: !!profile.doc_cpf_url,
          comprovante: !!profile.doc_comprovante_url,
          selfie: !!profile.doc_selfie_url,
        },
        submitted_at: profile.doc_submitted_at,
        reviewed_at: profile.doc_reviewed_at,
        rejection_reason: profile.doc_rejection_reason,
      },
    });
  });
}
