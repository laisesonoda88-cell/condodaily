import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { condos, condoWallets, condoAreas, condoMaintenanceItems, serviceEstimationParams, serviceCategories, professionalProfiles, professionalServices } from '../../db/schema.js';
import { sql } from 'drizzle-orm';
import { getRecommendedSlugs, getApplicableMaintenanceItems, WEEKEND_PRIORITY_SLUGS } from '../../services/condo-recommendations.js';
import { z } from 'zod';
import { analyzeCondoDocument, type AnalysisResult } from '../../services/document-analysis.js';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';

const createCondoSchema = z.object({
  cnpj: z.string().min(14),
  razao_social: z.string().min(2),
  nome_fantasia: z.string().optional(),
  cep: z.string().min(8),
  endereco: z.string().min(2),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  cidade: z.string().min(2),
  uf: z.string().length(2),
  num_torres: z.number().int().min(1).default(1),
  num_unidades: z.number().int().min(1).default(1),
  areas_lazer: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

function classifyPorte(numUnidades: number): 'P' | 'M' | 'G' {
  if (numUnidades <= 50) return 'P';
  if (numUnidades <= 200) return 'M';
  return 'G';
}

export async function condoRoutes(app: FastifyInstance) {
  // POST /api/condos
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id, role } = request.user as { id: string; role: string };

    if (role !== 'CONTRATANTE') {
      return reply.status(403).send({
        success: false,
        error: 'Apenas contratantes podem cadastrar condomínios',
      });
    }

    const parsed = createCondoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const porte = classifyPorte(data.num_unidades);

    const [newCondo] = await db
      .insert(condos)
      .values({
        user_id: id,
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cep: data.cep,
        endereco: data.endereco,
        numero: data.numero,
        complemento: data.complemento,
        cidade: data.cidade,
        uf: data.uf,
        num_torres: data.num_torres,
        num_unidades: data.num_unidades,
        areas_lazer: JSON.stringify(data.areas_lazer),
        porte,
        latitude: data.latitude,
        longitude: data.longitude,
      })
      .returning();

    // Create wallet for the condo
    await db.insert(condoWallets).values({
      condo_id: newCondo.id,
    });

    return reply.status(201).send({
      success: true,
      data: { ...newCondo, porte_label: porte === 'P' ? 'Pequeno' : porte === 'M' ? 'Médio' : 'Grande' },
    });
  });

  // GET /api/condos (user's condos)
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string };

    const result = await db
      .select()
      .from(condos)
      .where(eq(condos.user_id, id));

    return reply.send({ success: true, data: result });
  });

  // GET /api/condos/lookup/:cnpj (requer auth para evitar abuso da API externa)
  app.get('/lookup/:cnpj', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { cnpj } = request.params as { cnpj: string };
    const cleanCnpj = cnpj.replace(/\D/g, '');

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { 'User-Agent': 'CondoDaily/1.0' },
      });
      if (!response.ok) {
        return reply.status(404).send({
          success: false,
          error: 'CNPJ não encontrado',
        });
      }
      const data = await response.json();
      return reply.send({
        success: true,
        data: {
          cnpj: data.cnpj,
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia,
          cep: data.cep,
          endereco: `${data.descricao_tipo_de_logradouro} ${data.logradouro}`,
          numero: data.numero,
          complemento: data.complemento,
          cidade: data.municipio,
          uf: data.uf,
        },
      });
    } catch {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao consultar CNPJ',
      });
    }
  });

  // GET /api/condos/:id
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };

    // SECURITY: Verify condo belongs to user (prevent IDOR)
    const [condo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId)))
      .limit(1);

    if (!condo) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    // Buscar áreas comuns
    const areas = await db
      .select()
      .from(condoAreas)
      .where(eq(condoAreas.condo_id, condoId));

    return reply.send({ success: true, data: { ...condo, areas } });
  });

  // ─── Upload de Documento (Convenção/Regimento) ─────────
  // POST /api/condos/:id/upload-document
  app.post('/:id/upload-document', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };

    // Verificar se o condo pertence ao usuário
    const [condo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId)))
      .limit(1);

    if (!condo) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado' });
    }

    // Validar tipo de arquivo
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: 'Tipo de arquivo não suportado. Envie PDF, JPG, PNG ou WebP.',
      });
    }

    // Salvar arquivo
    const uploadsDir = path.join(process.cwd(), 'uploads', 'condos', condoId);
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.filename) || '.pdf';
    const fileName = `documento${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    await pipeline(file.file, (await import('fs')).createWriteStream(filePath));

    // Atualizar URL no banco
    const documentoUrl = `/uploads/condos/${condoId}/${fileName}`;
    await db
      .update(condos)
      .set({ documento_url: documentoUrl, documento_analisado: false, updated_at: new Date() })
      .where(eq(condos.id, condoId));

    return reply.send({
      success: true,
      data: { documento_url: documentoUrl, filename: fileName },
    });
  });

  // ─── Análise por IA do Documento ───────────────────────
  // POST /api/condos/:id/analyze-document
  app.post('/:id/analyze-document', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };

    const [condo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId)))
      .limit(1);

    if (!condo) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    if (!condo.documento_url) {
      return reply.status(400).send({
        success: false,
        error: 'Nenhum documento foi enviado. Faça o upload primeiro.',
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return reply.status(500).send({
        success: false,
        error: 'Chave da API de análise não configurada.',
      });
    }

    try {
      // SECURITY: Path traversal guard — ensure filePath stays within uploads/
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      // Strip leading '/' from documento_url to avoid path.resolve treating it as absolute root
      const docPath = condo.documento_url.replace(/^\/+/, '');
      const filePath = path.resolve(process.cwd(), docPath);
      if (!filePath.startsWith(uploadsDir)) {
        return reply.status(400).send({ success: false, error: 'Caminho de documento inválido.' });
      }

      const result = await analyzeCondoDocument(filePath);

      // Salvar dados brutos da IA
      await db
        .update(condos)
        .set({
          dados_extraidos: JSON.stringify(result),
          updated_at: new Date(),
        })
        .where(eq(condos.id, condoId));

      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error(`[ANALYZE] Error analyzing document for condo ${condoId}:`, err.message);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao analisar documento. Tente novamente.',
      });
    }
  });

  // ─── Confirmação dos Dados Extraídos ───────────────────
  // POST /api/condos/:id/confirm-analysis
  const confirmAnalysisSchema = z.object({
    areas_comuns: z.array(
      z.object({
        nome: z.string().min(1),
        metragem: z.number().positive(),
        tipo: z.string(),
        andar: z.string().optional(),
        observacoes: z.string().optional(),
      })
    ),
    metragem_total: z.number().positive(),
    tem_portaria: z.boolean(),
    num_andares_por_torre: z.number().int().positive().nullable(),
    num_elevadores: z.number().int().min(0),
    regras_lixo: z.string().nullable(),
    horario_mudanca: z.string().nullable(),
    horario_obra: z.string().nullable(),
  });

  app.post('/:id/confirm-analysis', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };

    const [condo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId)))
      .limit(1);

    if (!condo) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    const parsed = confirmAnalysisSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    // Atualizar condo com dados confirmados
    await db
      .update(condos)
      .set({
        metragem_total: data.metragem_total,
        tem_portaria: data.tem_portaria,
        num_andares_por_torre: data.num_andares_por_torre,
        num_elevadores: data.num_elevadores,
        regras_lixo: data.regras_lixo,
        horario_mudanca: data.horario_mudanca,
        horario_obra: data.horario_obra,
        documento_analisado: true,
        updated_at: new Date(),
      })
      .where(eq(condos.id, condoId));

    // Deletar áreas antigas e inserir novas
    await db.delete(condoAreas).where(eq(condoAreas.condo_id, condoId));

    for (const area of data.areas_comuns) {
      await db.insert(condoAreas).values({
        condo_id: condoId,
        nome: area.nome,
        metragem: area.metragem,
        tipo: area.tipo as any,
        andar: area.andar,
        observacoes: area.observacoes,
      });
    }

    // ─── Auto-criar itens de manutenção periódica ──────
    const areaTypes = data.areas_comuns.map((a) => a.tipo);
    const condoInfra = { num_elevadores: data.num_elevadores, tem_portaria: data.tem_portaria };
    const maintenanceItems = getApplicableMaintenanceItems(areaTypes, condoInfra);

    // Deletar itens antigos (re-análise)
    await db.delete(condoMaintenanceItems).where(eq(condoMaintenanceItems.condo_id, condoId));

    for (const item of maintenanceItems) {
      await db.insert(condoMaintenanceItems).values({
        condo_id: condoId,
        name: item.name,
        description: item.description,
        frequency: item.frequency,
        category_slug: item.category_slug,
        icon: item.icon,
        is_mandatory: item.is_mandatory,
        status: 'NAO_INFORMADO',
      });
    }

    return reply.send({
      success: true,
      message: 'Dados do condomínio confirmados com sucesso',
      data: { maintenance_items_created: maintenanceItems.length },
    });
  });

  // ─── Estimativa de Horas por Categoria ─────────────────
  // GET /api/condos/:condo_id/estimate?category_id=xxx
  app.get('/:id/estimate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };
    const { category_id } = request.query as { category_id: string };

    if (!category_id) {
      return reply.status(400).send({ success: false, error: 'category_id é obrigatório' });
    }

    // SECURITY: Verify condo belongs to user (prevent IDOR)
    const [condo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId)))
      .limit(1);

    if (!condo) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    // Buscar parâmetros de estimativa
    const [params] = await db
      .select()
      .from(serviceEstimationParams)
      .where(eq(serviceEstimationParams.category_id, category_id))
      .limit(1);

    if (!params) {
      return reply.send({
        success: true,
        data: {
          disponivel: false,
          mensagem: 'Estimativa não disponível para esta categoria',
        },
      });
    }

    // Se é serviço por chamado (m2_por_hora = 0), retornar min/max
    if (params.m2_por_hora === 0) {
      return reply.send({
        success: true,
        data: {
          disponivel: true,
          tipo: 'POR_CHAMADO',
          horas_minimas: params.min_horas,
          horas_maximas: params.max_horas,
          metragem_total: condo.metragem_total,
          recomendacao: params.min_horas >= 6 ? 'DIARIA' : 'MEIA_DIARIA',
          descricao: params.descricao,
        },
      });
    }

    // Calcular estimativa baseada em metragem
    const metragem = condo.metragem_total || 0;
    if (metragem === 0) {
      return reply.send({
        success: true,
        data: {
          disponivel: false,
          mensagem: 'Metragem do condomínio não cadastrada. Complete o cadastro para obter estimativas.',
        },
      });
    }

    let horasEstimadas = (metragem / params.m2_por_hora) * params.fator_complexidade;
    horasEstimadas = Math.max(params.min_horas, Math.min(params.max_horas, horasEstimadas));
    horasEstimadas = Math.round(horasEstimadas * 2) / 2; // Arredondar para 0.5h

    let recomendacao: string;
    if (horasEstimadas <= 4) recomendacao = 'MEIA_DIARIA';
    else if (horasEstimadas <= 8) recomendacao = 'DIARIA';
    else recomendacao = 'DIARIA_ESTENDIDA';

    // Buscar áreas do condo
    const areas = await db
      .select()
      .from(condoAreas)
      .where(eq(condoAreas.condo_id, condoId));

    return reply.send({
      success: true,
      data: {
        disponivel: true,
        tipo: 'POR_METRAGEM',
        horas_estimadas: horasEstimadas,
        horas_minimas: params.min_horas,
        horas_maximas: params.max_horas,
        metragem_total: metragem,
        fator_complexidade: params.fator_complexidade,
        recomendacao,
        areas_count: areas.length,
        descricao: params.descricao,
      },
    });
  });

  // ─── Listar Áreas do Condomínio ────────────────────────
  // GET /api/condos/:id/areas
  app.get('/:id/areas', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };

    // SECURITY: Verify condo belongs to user (prevent IDOR)
    const [condo] = await db.select({ id: condos.id }).from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId))).limit(1);
    if (!condo) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    const areas = await db
      .select()
      .from(condoAreas)
      .where(eq(condoAreas.condo_id, condoId));

    return reply.send({ success: true, data: areas });
  });

  // ─── Recomendações Inteligentes ──────────────────────
  // GET /api/condos/:id/recommendations
  app.get('/:id/recommendations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };

    // SECURITY: Verify condo belongs to user (prevent IDOR)
    const [condo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId)))
      .limit(1);

    if (!condo) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    // Buscar áreas do condo
    const areas = await db
      .select({ tipo: condoAreas.tipo })
      .from(condoAreas)
      .where(eq(condoAreas.condo_id, condoId));

    const areaTypes = areas.map((a) => a.tipo);
    const condoInfra = { num_elevadores: condo.num_elevadores, tem_portaria: condo.tem_portaria };

    // Gerar recomendações de serviço
    const recommendedSlugs = getRecommendedSlugs(areaTypes, condoInfra);

    // Buscar categorias + contar profissionais por categoria
    const serviceRecommendations = [];

    for (const [slug, reason] of recommendedSlugs) {
      const [category] = await db
        .select()
        .from(serviceCategories)
        .where(eq(serviceCategories.slug, slug))
        .limit(1);

      if (!category) continue;

      // Contar profissionais que oferecem esse serviço e estão aprovados
      const [countResult] = await db
        .select({ count: sql<number>`count(distinct ${professionalProfiles.id})::int` })
        .from(professionalProfiles)
        .innerJoin(professionalServices, eq(professionalServices.professional_id, professionalProfiles.id))
        .where(
          and(
            eq(professionalProfiles.quiz_approved, true),
            eq(professionalProfiles.is_blocked, false),
            eq(professionalServices.category_id, category.id)
          )
        );

      // Contar profissionais disponíveis no fim de semana
      const preferWeekend = WEEKEND_PRIORITY_SLUGS.has(slug);
      let weekendCount = 0;

      if (preferWeekend) {
        const [weekendResult] = await db
          .select({ count: sql<number>`count(distinct ${professionalProfiles.id})::int` })
          .from(professionalProfiles)
          .innerJoin(professionalServices, eq(professionalServices.professional_id, professionalProfiles.id))
          .where(
            and(
              eq(professionalProfiles.quiz_approved, true),
              eq(professionalProfiles.is_blocked, false),
              eq(professionalServices.category_id, category.id),
              eq(professionalProfiles.disponivel_fim_semana, true)
            )
          );
        weekendCount = weekendResult?.count || 0;
      }

      serviceRecommendations.push({
        category_id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        reason,
        professional_count: countResult?.count || 0,
        prefer_weekend: preferWeekend,
        weekend_professional_count: weekendCount,
      });
    }

    // Buscar itens de manutenção
    const maintenanceItems = await db
      .select()
      .from(condoMaintenanceItems)
      .where(eq(condoMaintenanceItems.condo_id, condoId));

    return reply.send({
      success: true,
      data: {
        service_recommendations: serviceRecommendations,
        maintenance_checklist: maintenanceItems,
      },
    });
  });

  // ─── Listar Manutenções do Condomínio ────────────────
  // GET /api/condos/:id/maintenance
  app.get('/:id/maintenance', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId } = request.params as { id: string };

    // SECURITY: Verify condo belongs to user (prevent IDOR)
    const [ownerCheck] = await db.select({ id: condos.id }).from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId))).limit(1);
    if (!ownerCheck) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    const items = await db
      .select()
      .from(condoMaintenanceItems)
      .where(eq(condoMaintenanceItems.condo_id, condoId));

    // Recalcular status baseado nas datas
    const now = new Date();
    const enriched = items.map((item) => {
      let status = item.status;
      if (item.next_due) {
        const daysUntilDue = Math.floor((item.next_due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) status = 'VENCIDO';
        else if (daysUntilDue <= 30) status = 'VENCENDO';
        else status = 'EM_DIA';
      }
      return { ...item, status };
    });

    return reply.send({ success: true, data: enriched });
  });

  // ─── Atualizar Item de Manutenção ────────────────────
  // PUT /api/condos/:id/maintenance/:itemId
  app.put('/:id/maintenance/:itemId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: condoId, itemId } = request.params as { id: string; itemId: string };

    // SECURITY: Verify condo belongs to user (prevent IDOR)
    const [ownerCheck] = await db.select({ id: condos.id }).from(condos)
      .where(and(eq(condos.id, condoId), eq(condos.user_id, userId))).limit(1);
    if (!ownerCheck) {
      return reply.status(404).send({ success: false, error: 'Condomínio não encontrado' });
    }

    // Validate body
    const bodyParsed = z.object({
      last_done: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Data inválida (formato: YYYY-MM-DD)'),
    }).safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', details: bodyParsed.error.flatten().fieldErrors });
    }
    const { last_done } = bodyParsed.data;

    // Verificar que o item pertence ao condo
    const [item] = await db
      .select()
      .from(condoMaintenanceItems)
      .where(and(eq(condoMaintenanceItems.id, itemId), eq(condoMaintenanceItems.condo_id, condoId)))
      .limit(1);

    if (!item) {
      return reply.status(404).send({ success: false, error: 'Item não encontrado' });
    }

    const lastDoneDate = new Date(last_done);

    // Calcular próximo vencimento baseado na frequência
    const FREQ_MONTHS: Record<string, number> = {
      MENSAL: 1,
      TRIMESTRAL: 3,
      SEMESTRAL: 6,
      ANUAL: 12,
      BIENAL: 24,
      QUINQUENAL: 60,
    };

    const months = FREQ_MONTHS[item.frequency] || 12;
    const nextDue = new Date(lastDoneDate);
    nextDue.setMonth(nextDue.getMonth() + months);

    // Calcular status
    const now = new Date();
    const daysUntilDue = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status: 'EM_DIA' | 'VENCENDO' | 'VENCIDO' = 'EM_DIA';
    if (daysUntilDue < 0) status = 'VENCIDO';
    else if (daysUntilDue <= 30) status = 'VENCENDO';

    const [updated] = await db
      .update(condoMaintenanceItems)
      .set({
        last_done: lastDoneDate,
        next_due: nextDue,
        status,
      })
      .where(eq(condoMaintenanceItems.id, itemId))
      .returning();

    return reply.send({ success: true, data: updated });
  });
}
