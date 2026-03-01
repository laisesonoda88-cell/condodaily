import { FastifyInstance } from 'fastify';
import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  bookings,
  condos,
  condoAreas,
  condoWallets,
  walletTransactions,
  users,
  payments,
  payouts,
  professionalPaymentInfo,
  professionalProfiles,
} from '../../db/schema.js';
import { mercadoPagoService } from '../../services/mercadopago.js';
import { sendBookingNotification } from '../../services/notifications.js';
import { applyPenalty, deductPendingPenalties } from '../penalties/penalties.routes.js';
import { z } from 'zod';
import {
  MAX_BOOKINGS_SAME_PROFESSIONAL_30D,
  PLATFORM_FEE_PERCENTAGE,
  INSURANCE_FEE_FIXED,
} from '@condodaily/shared';

const createBookingSchema = z.object({
  profissional_id: z.string().uuid(),
  condo_id: z.string().uuid(),
  category_id: z.string().uuid(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_start: z.string().regex(/^\d{2}:\d{2}$/),
  scheduled_end: z.string().regex(/^\d{2}:\d{2}$/),
  hourly_rate: z.number().positive().optional(), // Ignored server-side, fetched from DB
  notes: z.string().optional(),
  payment_source: z.enum(['MERCADO_PAGO', 'WALLET']),
  payment_method: z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']).optional(),
  card_token: z.string().optional(),
  installments: z.number().int().min(1).max(12).default(1),
  accept_contract: z.boolean().refine((v) => v === true, {
    message: 'É obrigatório aceitar os termos de contratação',
  }),
});

export async function bookingRoutes(app: FastifyInstance) {
  // POST /api/bookings - Create booking
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'CONTRATANTE') {
      return reply.status(403).send({
        success: false,
        error: 'Apenas contratantes podem criar agendamentos',
      });
    }

    const parsed = createBookingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    // SECURITY: Verify condo belongs to user
    const [userCondo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, data.condo_id), eq(condos.user_id, userId)))
      .limit(1);

    if (!userCondo) {
      return reply.status(403).send({
        success: false,
        error: 'Condomínio não pertence a este usuário',
      });
    }

    // Anti-habituality check
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBookings = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.contratante_id, userId),
          eq(bookings.profissional_id, data.profissional_id),
          gte(bookings.created_at, thirtyDaysAgo)
        )
      );

    if (recentBookings[0].count >= MAX_BOOKINGS_SAME_PROFESSIONAL_30D) {
      return reply.status(400).send({
        success: false,
        error: `Limite de ${MAX_BOOKINGS_SAME_PROFESSIONAL_30D} agendamentos com o mesmo profissional em 30 dias atingido. Isso protege a caracterização do serviço como autônomo.`,
      });
    }

    // SECURITY: Fetch hourly_rate from DB, never trust client-provided value
    const [profProfile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, data.profissional_id))
      .limit(1);

    if (!profProfile) {
      return reply.status(404).send({
        success: false,
        error: 'Profissional não encontrado',
      });
    }

    const serverHourlyRate = Number(profProfile.hourly_rate);

    // Calculate hours and amounts
    const [startH, startM] = data.scheduled_start.split(':').map(Number);
    const [endH, endM] = data.scheduled_end.split(':').map(Number);
    const totalHours = (endH + endM / 60) - (startH + startM / 60);

    if (totalHours <= 0) {
      return reply.status(400).send({
        success: false,
        error: 'Horário de término deve ser após o horário de início',
      });
    }

    const grossAmount = serverHourlyRate * totalHours;
    const platformFee = grossAmount * PLATFORM_FEE_PERCENTAGE;
    const netAmount = grossAmount - platformFee - INSURANCE_FEE_FIXED;
    const totalDebit = grossAmount + INSURANCE_FEE_FIXED;

    // ═══ WALLET PAYMENT (atomic transaction with row lock) ═══
    if (data.payment_source === 'WALLET') {
      try {
        const booking = await db.transaction(async (tx) => {
          // SECURITY: SELECT FOR UPDATE prevents race conditions (double-spending)
          const walletRows = await tx.execute(
            sql`SELECT * FROM condo_wallets WHERE condo_id = ${data.condo_id} FOR UPDATE`
          );
          const wallet = (walletRows as any).rows?.[0] || (walletRows as any)[0];

          if (!wallet || Number(wallet.balance) < totalDebit) {
            throw new Error('INSUFFICIENT_BALANCE');
          }

          const [newBooking] = await tx
            .insert(bookings)
            .values({
              contratante_id: userId,
              profissional_id: data.profissional_id,
              condo_id: data.condo_id,
              category_id: data.category_id,
              scheduled_date: data.scheduled_date,
              scheduled_start: data.scheduled_start,
              scheduled_end: data.scheduled_end,
              hourly_rate: String(serverHourlyRate),
              total_hours: totalHours,
              gross_amount: String(grossAmount),
              platform_fee: String(platformFee),
              insurance_fee: String(INSURANCE_FEE_FIXED),
              net_professional_amount: String(netAmount),
              notes: data.notes,
              status: 'PENDING',
              payment_status: 'PAID',
              contract_accepted_contratante: true,
            })
            .returning();

          await tx
            .update(condoWallets)
            .set({
              balance: sql`${condoWallets.balance} - ${totalDebit}`,
              updated_at: new Date(),
            })
            .where(eq(condoWallets.condo_id, data.condo_id));

          await tx
            .insert(walletTransactions)
            .values({
              wallet_id: wallet.id,
              type: 'DEBIT',
              amount: String(totalDebit),
              booking_id: newBooking.id,
              status: 'CONFIRMED',
            });

          return newBooking;
        });

        // Fire-and-forget: notify professional about new booking
        sendBookingNotification(booking.id, 'BOOKING_CREATED');

        return reply.status(201).send({ success: true, data: booking });
      } catch (error: any) {
        if (error.message === 'INSUFFICIENT_BALANCE') {
          return reply.status(400).send({
            success: false,
            error: 'Saldo insuficiente na CondoWallet. Faça um depósito antes de agendar.',
          });
        }
        throw error;
      }
    }

    // ═══ MERCADO PAGO PAYMENT ═══
    if (!data.payment_method) {
      return reply.status(400).send({
        success: false,
        error: 'Método de pagamento é obrigatório ao pagar via Mercado Pago',
      });
    }

    const [booking] = await db
      .insert(bookings)
      .values({
        contratante_id: userId,
        profissional_id: data.profissional_id,
        condo_id: data.condo_id,
        category_id: data.category_id,
        scheduled_date: data.scheduled_date,
        scheduled_start: data.scheduled_start,
        scheduled_end: data.scheduled_end,
        hourly_rate: String(serverHourlyRate), // SECURITY: always use server-side rate
        total_hours: totalHours,
        gross_amount: String(grossAmount),
        platform_fee: String(platformFee),
        insurance_fee: String(INSURANCE_FEE_FIXED),
        net_professional_amount: String(netAmount),
        notes: data.notes,
        status: 'PENDING',
        payment_status: 'UNPAID',
        contract_accepted_contratante: true,
      })
      .returning();

    const [payer] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const externalRef = `booking_${booking.id}`;
    const description = `CondoDaily - Serviço agendado para ${booking.scheduled_date}`;

    try {
      let mpResult: any;

      if (data.payment_method === 'PIX') {
        mpResult = await mercadoPagoService.createPixPayment({
          amount: totalDebit,
          payerEmail: payer.email,
          payerCpf: payer.cpf,
          payerName: payer.full_name,
          description,
          externalReference: externalRef,
        });
      } else if (data.payment_method === 'CREDIT_CARD') {
        if (!data.card_token) {
          return reply.status(400).send({
            success: false,
            error: 'Token do cartão é obrigatório',
          });
        }
        mpResult = await mercadoPagoService.createCardPayment({
          amount: totalDebit,
          cardToken: data.card_token,
          payerEmail: payer.email,
          payerCpf: payer.cpf,
          payerName: payer.full_name,
          installments: data.installments,
          description,
          externalReference: externalRef,
        });
      } else {
        mpResult = await mercadoPagoService.createBoletoPayment({
          amount: totalDebit,
          payerEmail: payer.email,
          payerCpf: payer.cpf,
          payerName: payer.full_name,
          description,
          externalReference: externalRef,
        });
      }

      const [payment] = await db
        .insert(payments)
        .values({
          booking_id: booking.id,
          payer_id: userId,
          mp_payment_id: mpResult.mp_payment_id,
          mp_external_reference: externalRef,
          amount: String(totalDebit),
          platform_fee: String(platformFee),
          net_amount: String(netAmount),
          payment_method: data.payment_method,
          status: mpResult.status,
          pix_qr_code: mpResult.pix_qr_code ?? null,
          pix_qr_code_base64: mpResult.pix_qr_code_base64 ?? null,
          pix_copy_paste: mpResult.pix_copy_paste ?? null,
          boleto_url: mpResult.boleto_url ?? null,
          boleto_barcode: mpResult.boleto_barcode ?? null,
          boleto_due_date: mpResult.boleto_due_date ?? null,
          card_last_four: mpResult.card_last_four ?? null,
          card_brand: mpResult.card_brand ?? null,
          installments: mpResult.installments ?? data.installments,
          mp_raw_response: mpResult.raw_response,
          expires_at: mpResult.expires_at ? new Date(mpResult.expires_at) : null,
        })
        .returning();

      await db
        .update(bookings)
        .set({ payment_id: payment.id })
        .where(eq(bookings.id, booking.id));

      if (mpResult.status === 'APPROVED') {
        await db
          .update(bookings)
          .set({ payment_status: 'PAID' })
          .where(eq(bookings.id, booking.id));

        await db
          .update(payments)
          .set({ paid_at: new Date() })
          .where(eq(payments.id, payment.id));

        // Notify professional about new booking (payment already confirmed)
        sendBookingNotification(booking.id, 'BOOKING_CREATED');
      }

      return reply.status(201).send({
        success: true,
        data: {
          booking,
          payment: {
            payment_id: payment.id,
            status: mpResult.status,
            payment_method: data.payment_method,
            amount: totalDebit,
            pix_qr_code: mpResult.pix_qr_code ?? null,
            pix_qr_code_base64: mpResult.pix_qr_code_base64 ?? null,
            pix_copy_paste: mpResult.pix_copy_paste ?? null,
            boleto_url: mpResult.boleto_url ?? null,
            boleto_barcode: mpResult.boleto_barcode ?? null,
            boleto_due_date: mpResult.boleto_due_date ?? null,
            card_last_four: mpResult.card_last_four ?? null,
            card_brand: mpResult.card_brand ?? null,
            installments: mpResult.installments ?? data.installments,
            expires_at: mpResult.expires_at ?? null,
          },
        },
      });
    } catch (error: any) {
      await db
        .update(bookings)
        .set({ status: 'CANCELLED' })
        .where(eq(bookings.id, booking.id));

      return reply.status(500).send({
        success: false,
        error: 'Erro ao processar pagamento. O agendamento foi cancelado.',
      });
    }
  });

  // GET /api/bookings - List user's bookings
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };
    const { condo_id } = request.query as { condo_id?: string };
    const field = role === 'CONTRATANTE' ? bookings.contratante_id : bookings.profissional_id;

    const conditions = [eq(field, userId)];
    if (condo_id) {
      conditions.push(eq(bookings.condo_id, condo_id));
    }

    const result = await db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(sql`${bookings.created_at} DESC`);

    return reply.send({ success: true, data: result });
  });

  // GET /api/bookings/:id
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: bookingId } = request.params as { id: string };

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' });
    }

    // SECURITY: Only contratante or profissional of this booking can view details
    if (booking.contratante_id !== userId && booking.profissional_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Sem permissão para acessar este agendamento' });
    }

    // Incluir dados do condomínio + áreas comuns
    let condo = null;
    if (booking.condo_id) {
      const [condoData] = await db
        .select()
        .from(condos)
        .where(eq(condos.id, booking.condo_id))
        .limit(1);

      if (condoData) {
        const areas = await db
          .select()
          .from(condoAreas)
          .where(eq(condoAreas.condo_id, condoData.id));

        condo = {
          id: condoData.id,
          nome_fantasia: condoData.nome_fantasia,
          razao_social: condoData.razao_social,
          endereco: condoData.endereco,
          numero: condoData.numero,
          complemento: condoData.complemento,
          cidade: condoData.cidade,
          uf: condoData.uf,
          cep: condoData.cep,
          num_torres: condoData.num_torres,
          num_unidades: condoData.num_unidades,
          porte: condoData.porte,
          metragem_total: condoData.metragem_total,
          tem_portaria: condoData.tem_portaria,
          num_andares_por_torre: condoData.num_andares_por_torre,
          num_elevadores: condoData.num_elevadores,
          regras_lixo: condoData.regras_lixo,
          horario_mudanca: condoData.horario_mudanca,
          horario_obra: condoData.horario_obra,
          areas,
        };
      }
    }

    return reply.send({ success: true, data: { ...booking, condo } });
  });

  // POST /api/bookings/:id/accept
  app.post('/:id/accept', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: bookingId } = request.params as { id: string };

    // Verificar se profissional está bloqueado
    const [profile] = await db
      .select()
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    if (profile?.is_blocked) {
      return reply.status(403).send({
        success: false,
        error: 'Sua conta está bloqueada devido a múltiplos cancelamentos/faltas. Entre em contato com o suporte.',
      });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.profissional_id, userId)))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' });
    }

    if (booking.status !== 'PENDING') {
      return reply.status(400).send({ success: false, error: 'Este agendamento não pode ser aceito' });
    }

    if (booking.payment_status !== 'PAID') {
      return reply.status(400).send({
        success: false,
        error: 'O pagamento ainda não foi confirmado para este agendamento',
      });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: 'ACCEPTED', contract_accepted_profissional: true })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Notify contratante that professional accepted
    sendBookingNotification(bookingId, 'BOOKING_ACCEPTED');

    return reply.send({ success: true, data: updated });
  });

  // POST /api/bookings/:id/check-in
  app.post('/:id/check-in', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: bookingId } = request.params as { id: string };
    const geoSchema = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    });
    const geoParsed = geoSchema.safeParse(request.body);
    if (!geoParsed.success) {
      return reply.status(400).send({ success: false, error: 'Coordenadas inválidas', details: geoParsed.error.flatten().fieldErrors });
    }
    const { latitude, longitude } = geoParsed.data;

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.profissional_id, userId)))
      .limit(1);

    if (!booking || booking.status !== 'ACCEPTED') {
      return reply.status(400).send({ success: false, error: 'Check-in não permitido' });
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: 'IN_PROGRESS',
        check_in_at: new Date(),
        check_in_lat: latitude,
        check_in_lng: longitude,
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return reply.send({ success: true, data: updated, message: 'Check-in realizado. Seguro ativado.' });
  });

  // POST /api/bookings/:id/check-out
  app.post('/:id/check-out', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: bookingId } = request.params as { id: string };
    const geoSchemaOut = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    });
    const geoParsedOut = geoSchemaOut.safeParse(request.body);
    if (!geoParsedOut.success) {
      return reply.status(400).send({ success: false, error: 'Coordenadas inválidas', details: geoParsedOut.error.flatten().fieldErrors });
    }
    const { latitude, longitude } = geoParsedOut.data;

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.profissional_id, userId)))
      .limit(1);

    if (!booking || booking.status !== 'IN_PROGRESS') {
      return reply.status(400).send({ success: false, error: 'Check-out não permitido' });
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: 'COMPLETED',
        check_out_at: new Date(),
        check_out_lat: latitude,
        check_out_lng: longitude,
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return reply.send({
      success: true,
      data: updated,
      message: 'Check-out realizado. Aguardando confirmação de ambas as partes para liberar pagamento.',
    });
  });

  // POST /api/bookings/:id/confirm-completion
  app.post('/:id/confirm-completion', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };
    const { id: bookingId } = request.params as { id: string };

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' });
    }

    if (booking.status !== 'COMPLETED') {
      return reply.status(400).send({
        success: false,
        error: 'O serviço precisa estar concluído (check-out realizado) para confirmar',
      });
    }

    if (booking.payment_status === 'RELEASED') {
      return reply.status(400).send({
        success: false,
        error: 'O pagamento já foi liberado para este agendamento',
      });
    }

    // Determine who is confirming
    const updateData: Record<string, boolean> = {};
    if (userId === booking.contratante_id && role === 'CONTRATANTE') {
      if (booking.contratante_confirmed) {
        return reply.status(400).send({ success: false, error: 'Você já confirmou este serviço' });
      }
      updateData.contratante_confirmed = true;
    } else if (userId === booking.profissional_id && role === 'PROFISSIONAL') {
      if (booking.profissional_confirmed) {
        return reply.status(400).send({ success: false, error: 'Você já confirmou este serviço' });
      }
      updateData.profissional_confirmed = true;
    } else {
      return reply.status(403).send({ success: false, error: 'Sem permissão' });
    }

    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, bookingId))
      .returning();

    // Notify the other party about confirmation
    if (role === 'CONTRATANTE') {
      sendBookingNotification(bookingId, 'CONTRATANTE_CONFIRMED');
    } else {
      sendBookingNotification(bookingId, 'PROFISSIONAL_CONFIRMED');
    }

    const bothConfirmed = updated.contratante_confirmed && updated.profissional_confirmed;

    if (bothConfirmed && updated.payment_status === 'PAID') {
      try {
        let netAmount = Number(updated.net_professional_amount || 0);

        // Descontar multas pendentes do profissional
        const penaltyDeduction = await deductPendingPenalties(
          updated.profissional_id,
          netAmount,
          bookingId
        );
        netAmount = penaltyDeduction.net_amount;

        const [paymentInfo] = await db
          .select()
          .from(professionalPaymentInfo)
          .where(eq(professionalPaymentInfo.user_id, updated.profissional_id))
          .limit(1);

        if (!paymentInfo || !paymentInfo.pix_key) {
          await db
            .insert(payouts)
            .values({
              professional_id: updated.profissional_id,
              booking_id: bookingId,
              amount: String(netAmount),
              status: 'PENDING',
              error_message: 'Profissional sem chave PIX cadastrada',
            });

          await db
            .update(bookings)
            .set({ payment_status: 'RELEASED' })
            .where(eq(bookings.id, bookingId));

          return reply.send({
            success: true,
            data: updated,
            message: 'Ambos confirmaram! Pagamento será liberado quando o profissional cadastrar dados bancários.',
          });
        }

        const mpResult = await mercadoPagoService.createPixTransfer({
          amount: netAmount,
          pixKey: paymentInfo.pix_key,
          pixKeyType: paymentInfo.pix_key_type || 'CPF',
          description: `CondoDaily - Pagamento serviço ${booking.scheduled_date}`,
          externalReference: `payout_${bookingId}`,
        });

        await db
          .insert(payouts)
          .values({
            professional_id: updated.profissional_id,
            booking_id: bookingId,
            amount: String(netAmount),
            status: 'COMPLETED',
            mp_transfer_id: mpResult.mp_transfer_id,
            pix_key: paymentInfo.pix_key,
            processed_at: new Date(),
          });

        await db
          .update(bookings)
          .set({ payment_status: 'RELEASED' })
          .where(eq(bookings.id, bookingId));

        // Notify both parties about payment release
        sendBookingNotification(bookingId, 'PAYMENT_RELEASED');

        return reply.send({
          success: true,
          data: updated,
          message: 'Ambos confirmaram! Pagamento liberado para o profissional via PIX.',
        });
      } catch (error: any) {
        await db
          .insert(payouts)
          .values({
            professional_id: updated.profissional_id,
            booking_id: bookingId,
            amount: String(Number(updated.net_professional_amount || 0)),
            status: 'FAILED',
            error_message: error.message || 'Erro ao processar transferência',
          });

        return reply.send({
          success: true,
          data: updated,
          message: 'Ambos confirmaram! O pagamento será processado em breve.',
        });
      }
    }

    const who = role === 'CONTRATANTE' ? 'Contratante' : 'Profissional';
    const waiting = role === 'CONTRATANTE' ? 'profissional' : 'contratante';

    return reply.send({
      success: true,
      data: updated,
      message: `${who} confirmou. Aguardando confirmação do ${waiting}.`,
    });
  });

  // POST /api/bookings/:id/cancel
  app.post('/:id/cancel', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id: bookingId } = request.params as { id: string };

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' });
    }

    if (booking.contratante_id !== userId && booking.profissional_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Sem permissão' });
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      return reply.status(400).send({ success: false, error: 'Este agendamento não pode ser cancelado' });
    }

    // Verificar se está dentro do prazo de 48h antes da prestação
    const isProfessionalCancelling = userId === booking.profissional_id;
    const isContratanteCancelling = userId === booking.contratante_id;
    const wasAccepted = booking.status === 'ACCEPTED' || booking.status === 'IN_PROGRESS';

    // Calcular horas até a prestação
    const serviceDate = new Date(`${booking.scheduled_date}T${booking.scheduled_start}:00`);
    const now = new Date();
    const hoursUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithin48h = hoursUntilService < 48;
    const shouldApplyPenalty = wasAccepted && isWithin48h;

    const [updated] = await db
      .update(bookings)
      .set({ status: 'CANCELLED' })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Notify both parties about cancellation
    sendBookingNotification(bookingId, 'BOOKING_CANCELLED');

    // ═══ MULTA: Se cancelou após 48h antes da prestação ═══
    // Ambas as partes podem cancelar gratuitamente até 48h antes
    // Após esse prazo, quem cancelar paga multa de 30%
    let penaltyResult = null;
    if (shouldApplyPenalty) {
      if (isProfessionalCancelling) {
        try {
          penaltyResult = await applyPenalty(userId, bookingId, 'LATE_CANCEL');
        } catch {
          // Log mas não bloqueia o cancelamento
        }
      }
      // Nota: se contratante cancela dentro de 48h, o reembolso NÃO é integral
      // A multa de 30% fica com a plataforma como taxa de cancelamento tardio
    }

    // Refund — se contratante cancela dentro de 48h, desconta 30% como taxa
    if (booking.status === 'PENDING' || booking.status === 'ACCEPTED') {
      const grossAmount = Number(booking.gross_amount || 0);
      const insuranceFee = Number(booking.insurance_fee || 0);
      const fullRefund = grossAmount + insuranceFee;
      // Se cancelamento tardio pelo contratante, cobra 30% de multa
      const lateCancelFee = (isContratanteCancelling && shouldApplyPenalty)
        ? Math.round(grossAmount * 0.3 * 100) / 100
        : 0;
      const refundAmount = fullRefund - lateCancelFee;

      // Refund via Mercado Pago
      if (booking.payment_status === 'PAID' && booking.payment_id) {
        try {
          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.id, booking.payment_id))
            .limit(1);

          if (payment?.mp_payment_id) {
            // Reembolso parcial se houve multa
            if (lateCancelFee > 0) {
              await mercadoPagoService.refundPayment(payment.mp_payment_id, refundAmount);
            } else {
              await mercadoPagoService.refundPayment(payment.mp_payment_id);
            }
            await db
              .update(payments)
              .set({ status: 'REFUNDED', updated_at: new Date() })
              .where(eq(payments.id, payment.id));
          }

          await db
            .update(bookings)
            .set({ payment_status: lateCancelFee > 0 ? 'PARTIAL_REFUND' : 'REFUNDED' })
            .where(eq(bookings.id, bookingId));
        } catch {
          // Log but don't block cancellation
        }
      }

      // Refund via Wallet (no payment_id means wallet payment)
      if (refundAmount > 0 && !booking.payment_id) {
        const [wallet] = await db
          .select()
          .from(condoWallets)
          .where(eq(condoWallets.condo_id, booking.condo_id))
          .limit(1);

        if (wallet) {
          await db
            .update(condoWallets)
            .set({
              balance: sql`${condoWallets.balance} + ${refundAmount}`,
              updated_at: new Date(),
            })
            .where(eq(condoWallets.id, wallet.id));

          await db
            .insert(walletTransactions)
            .values({
              wallet_id: wallet.id,
              type: 'REFUND',
              amount: String(refundAmount),
              booking_id: booking.id,
              status: 'CONFIRMED',
            });

          await db
            .update(bookings)
            .set({ payment_status: 'REFUNDED' })
            .where(eq(bookings.id, bookingId));
        }
      }
    }

    return reply.send({
      success: true,
      data: updated,
      ...(penaltyResult ? {
        penalty: {
          applied: true,
          amount: penaltyResult.penalty_amount,
          total_pending: penaltyResult.total_pending,
          penalty_count: penaltyResult.penalty_count,
          blocked: penaltyResult.blocked,
          message: penaltyResult.blocked
            ? `Você foi bloqueado após ${penaltyResult.penalty_count} cancelamentos/faltas. Entre em contato com o suporte.`
            : `Multa de R$ ${penaltyResult.penalty_amount.toFixed(2)} aplicada. Será descontada da sua próxima diária. (${penaltyResult.penalty_count}/3 antes do bloqueio)`,
        },
      } : {}),
    });
  });

  // POST /api/bookings/:id/report-no-show — Contratante reporta que profissional não compareceu
  app.post('/:id/report-no-show', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };
    const { id: bookingId } = request.params as { id: string };

    if (role !== 'CONTRATANTE') {
      return reply.status(403).send({ success: false, error: 'Apenas contratantes podem reportar faltas' });
    }

    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.contratante_id, userId)))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' });
    }

    if (booking.status !== 'ACCEPTED') {
      return reply.status(400).send({
        success: false,
        error: 'Só é possível reportar falta de agendamentos aceitos que não tiveram check-in',
      });
    }

    // Cancelar o booking
    await db
      .update(bookings)
      .set({ status: 'CANCELLED' })
      .where(eq(bookings.id, bookingId));

    // Aplicar multa por NO_SHOW
    let penaltyResult;
    try {
      penaltyResult = await applyPenalty(booking.profissional_id, bookingId, 'NO_SHOW');
    } catch {
      // Log mas não bloqueia
    }

    // Fazer reembolso ao contratante
    if (booking.payment_status === 'PAID') {
      if (booking.payment_id) {
        try {
          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.id, booking.payment_id))
            .limit(1);

          if (payment?.mp_payment_id) {
            await mercadoPagoService.refundPayment(payment.mp_payment_id);
            await db
              .update(payments)
              .set({ status: 'REFUNDED', updated_at: new Date() })
              .where(eq(payments.id, payment.id));
          }
        } catch {
          // Log
        }
      } else {
        // Wallet refund
        const refundAmount = Number(booking.gross_amount || 0) + Number(booking.insurance_fee || 0);
        const [wallet] = await db
          .select()
          .from(condoWallets)
          .where(eq(condoWallets.condo_id, booking.condo_id))
          .limit(1);

        if (wallet && refundAmount > 0) {
          await db
            .update(condoWallets)
            .set({
              balance: sql`${condoWallets.balance} + ${refundAmount}`,
              updated_at: new Date(),
            })
            .where(eq(condoWallets.id, wallet.id));

          await db.insert(walletTransactions).values({
            wallet_id: wallet.id,
            type: 'REFUND',
            amount: String(refundAmount),
            booking_id: booking.id,
            status: 'CONFIRMED',
          });
        }
      }

      await db
        .update(bookings)
        .set({ payment_status: 'REFUNDED' })
        .where(eq(bookings.id, bookingId));
    }

    sendBookingNotification(bookingId, 'BOOKING_CANCELLED');

    return reply.send({
      success: true,
      message: 'Falta reportada. O profissional recebeu uma multa e o reembolso foi processado.',
      ...(penaltyResult ? {
        penalty: {
          amount: penaltyResult.penalty_amount,
          penalty_count: penaltyResult.penalty_count,
          blocked: penaltyResult.blocked,
        },
      } : {}),
    });
  });
}
