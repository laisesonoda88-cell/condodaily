import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { payments, bookings, users } from '../../db/schema.js';
import { mercadoPagoService } from '../../services/mercadopago.js';
import { z } from 'zod';

const createPaymentSchema = z.object({
  booking_id: z.string().uuid(),
  payment_method: z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']),
  card_token: z.string().optional(),
  installments: z.number().int().min(1).max(12).default(1),
});

// L5: Idempotency key store (in-memory, 10min TTL)
const idempotencyStore = new Map<string, { response: any; statusCode: number; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore) {
    if (entry.expiresAt < now) idempotencyStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

export async function mercadoPagoPaymentRoutes(app: FastifyInstance) {
  // POST /api/payments/create - Create a payment for a booking
  app.post('/create', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    // L5: Idempotency key — prevent duplicate payments on network retry
    const idempotencyKey = (request.headers['idempotency-key'] as string) || null;
    if (idempotencyKey) {
      const cached = idempotencyStore.get(idempotencyKey);
      if (cached && cached.expiresAt > Date.now()) {
        return reply.status(cached.statusCode).send(cached.response);
      }
    }

    const parsed = createPaymentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { booking_id, payment_method, card_token, installments } = parsed.data;

    // Get booking
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, booking_id))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' });
    }

    if (booking.contratante_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Sem permissão' });
    }

    if (booking.payment_status !== 'UNPAID') {
      return reply.status(400).send({ success: false, error: 'Este agendamento já possui pagamento' });
    }

    // Get payer info
    const [payer] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const totalAmount = Number(booking.gross_amount || 0) + Number(booking.insurance_fee || 0);
    const externalRef = `booking_${booking.id}`;
    const description = `CondoDaily - Serviço agendado para ${booking.scheduled_date}`;

    try {
      let mpResult: any;

      if (payment_method === 'PIX') {
        mpResult = await mercadoPagoService.createPixPayment({
          amount: totalAmount,
          payerEmail: payer.email,
          payerCpf: payer.cpf,
          payerName: payer.full_name,
          description,
          externalReference: externalRef,
        });
      } else if (payment_method === 'CREDIT_CARD') {
        if (!card_token) {
          return reply.status(400).send({
            success: false,
            error: 'Token do cartão é obrigatório para pagamento com cartão',
          });
        }
        mpResult = await mercadoPagoService.createCardPayment({
          amount: totalAmount,
          cardToken: card_token,
          payerEmail: payer.email,
          payerCpf: payer.cpf,
          payerName: payer.full_name,
          installments,
          description,
          externalReference: externalRef,
        });
      } else {
        mpResult = await mercadoPagoService.createBoletoPayment({
          amount: totalAmount,
          payerEmail: payer.email,
          payerCpf: payer.cpf,
          payerName: payer.full_name,
          description,
          externalReference: externalRef,
        });
      }

      // Save payment record
      const [payment] = await db
        .insert(payments)
        .values({
          booking_id: booking.id,
          payer_id: userId,
          mp_payment_id: mpResult.mp_payment_id,
          mp_external_reference: externalRef,
          amount: String(totalAmount),
          platform_fee: booking.platform_fee,
          net_amount: booking.net_professional_amount,
          payment_method,
          status: mpResult.status,
          pix_qr_code: mpResult.pix_qr_code ?? null,
          pix_qr_code_base64: mpResult.pix_qr_code_base64 ?? null,
          pix_copy_paste: mpResult.pix_copy_paste ?? null,
          boleto_url: mpResult.boleto_url ?? null,
          boleto_barcode: mpResult.boleto_barcode ?? null,
          boleto_due_date: mpResult.boleto_due_date ?? null,
          card_last_four: mpResult.card_last_four ?? null,
          card_brand: mpResult.card_brand ?? null,
          installments: mpResult.installments ?? installments,
          mp_raw_response: mpResult.raw_response,
          expires_at: mpResult.expires_at ? new Date(mpResult.expires_at) : null,
        })
        .returning();

      // Update booking with payment reference
      await db
        .update(bookings)
        .set({ payment_id: payment.id })
        .where(eq(bookings.id, booking.id));

      // If card payment was approved immediately, update payment status
      if (mpResult.status === 'APPROVED') {
        await db
          .update(bookings)
          .set({ payment_status: 'PAID' })
          .where(eq(bookings.id, booking.id));

        await db
          .update(payments)
          .set({ paid_at: new Date() })
          .where(eq(payments.id, payment.id));
      }

      const successResponse = {
        success: true,
        data: {
          payment_id: payment.id,
          mp_payment_id: mpResult.mp_payment_id,
          status: mpResult.status,
          payment_method,
          amount: totalAmount,
          // PIX data
          pix_qr_code: mpResult.pix_qr_code ?? null,
          pix_qr_code_base64: mpResult.pix_qr_code_base64 ?? null,
          pix_copy_paste: mpResult.pix_copy_paste ?? null,
          // Boleto data
          boleto_url: mpResult.boleto_url ?? null,
          boleto_barcode: mpResult.boleto_barcode ?? null,
          boleto_due_date: mpResult.boleto_due_date ?? null,
          // Card data
          card_last_four: mpResult.card_last_four ?? null,
          card_brand: mpResult.card_brand ?? null,
          installments: mpResult.installments ?? installments,
          // Expiration
          expires_at: mpResult.expires_at ?? null,
        },
      };

      // L5: Cache response for idempotency
      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, {
          response: successResponse,
          statusCode: 201,
          expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
        });
      }

      return reply.status(201).send(successResponse);
    } catch (error: any) {
      // Save failed payment attempt
      await db
        .insert(payments)
        .values({
          booking_id: booking.id,
          payer_id: userId,
          mp_external_reference: externalRef,
          amount: String(totalAmount),
          platform_fee: booking.platform_fee,
          net_amount: booking.net_professional_amount,
          payment_method,
          status: 'REJECTED',
          error_message: error.message || 'Erro ao processar pagamento',
          mp_raw_response: JSON.stringify(error),
        });

      return reply.status(500).send({
        success: false,
        error: 'Erro ao processar pagamento. Tente novamente.',
      });
    }
  });

  // GET /api/payments/:id/status - Check payment status
  app.get('/:id/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: paymentId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return reply.status(404).send({ success: false, error: 'Pagamento não encontrado' });
    }

    if (payment.payer_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Sem permissão' });
    }

    // If payment is still pending, check with MP
    if (payment.status === 'PENDING' && payment.mp_payment_id) {
      try {
        const mpStatus = await mercadoPagoService.getPaymentStatus(payment.mp_payment_id);

        if (mpStatus.status !== payment.status) {
          await db
            .update(payments)
            .set({
              status: mpStatus.status as any,
              paid_at: mpStatus.paid_at ? new Date(mpStatus.paid_at) : undefined,
              updated_at: new Date(),
            })
            .where(eq(payments.id, paymentId));

          if (mpStatus.status === 'APPROVED' && payment.booking_id) {
            await db
              .update(bookings)
              .set({ payment_status: 'PAID' })
              .where(eq(bookings.id, payment.booking_id));
          }

          return reply.send({
            success: true,
            data: { status: mpStatus.status, paid_at: mpStatus.paid_at },
          });
        }
      } catch {
        // Fall through to return current status
      }
    }

    return reply.send({
      success: true,
      data: { status: payment.status, paid_at: payment.paid_at },
    });
  });

  // GET /api/payments/:id/pix-data - Get PIX QR code and copy-paste
  app.get('/:id/pix-data', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: paymentId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return reply.status(404).send({ success: false, error: 'Pagamento não encontrado' });
    }

    if (payment.payer_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Sem permissão' });
    }

    if (payment.payment_method !== 'PIX') {
      return reply.status(400).send({ success: false, error: 'Este pagamento não é PIX' });
    }

    return reply.send({
      success: true,
      data: {
        pix_qr_code: payment.pix_qr_code,
        pix_qr_code_base64: payment.pix_qr_code_base64,
        pix_copy_paste: payment.pix_copy_paste,
        status: payment.status,
        expires_at: payment.expires_at,
      },
    });
  });

  // POST /api/payments/:id/refund - Refund a payment
  app.post('/:id/refund', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: paymentId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment) {
      return reply.status(404).send({ success: false, error: 'Pagamento não encontrado' });
    }

    if (payment.payer_id !== userId) {
      return reply.status(403).send({ success: false, error: 'Sem permissão' });
    }

    if (payment.status !== 'APPROVED') {
      return reply.status(400).send({
        success: false,
        error: 'Apenas pagamentos aprovados podem ser estornados',
      });
    }

    // SECURITY: Check booking status — block refund if service already started/completed
    if (payment.booking_id) {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, payment.booking_id))
        .limit(1);

      if (booking && (booking.status === 'IN_PROGRESS' || booking.status === 'COMPLETED')) {
        return reply.status(400).send({
          success: false,
          error: 'Não é possível estornar um pagamento de serviço em andamento ou concluído. Use o fluxo de cancelamento.',
        });
      }

      if (booking && booking.payment_status === 'RELEASED') {
        return reply.status(400).send({
          success: false,
          error: 'Pagamento já foi liberado ao profissional. Estorno não permitido.',
        });
      }
    }

    try {
      if (payment.mp_payment_id) {
        await mercadoPagoService.refundPayment(payment.mp_payment_id);
      }

      await db
        .update(payments)
        .set({ status: 'REFUNDED', updated_at: new Date() })
        .where(eq(payments.id, paymentId));

      if (payment.booking_id) {
        await db
          .update(bookings)
          .set({ payment_status: 'REFUNDED' })
          .where(eq(bookings.id, payment.booking_id));
      }

      return reply.send({ success: true, message: 'Estorno realizado com sucesso' });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao processar estorno. Tente novamente.',
      });
    }
  });
}
