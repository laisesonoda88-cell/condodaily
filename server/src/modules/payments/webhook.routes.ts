import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { payments, bookings, webhookEvents } from '../../db/schema.js';
import { mercadoPagoService } from '../../services/mercadopago.js';
import { sendBookingNotification } from '../../services/notifications.js';

export async function webhookRoutes(app: FastifyInstance) {
  // POST /api/webhooks/mercadopago - Receive MP webhook notifications
  // This route is PUBLIC (no JWT auth) - uses signature verification instead
  app.post('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const xSignature = request.headers['x-signature'] as string;
    const xRequestId = request.headers['x-request-id'] as string;
    const body = request.body as {
      id?: string;
      type?: string;
      data?: { id?: string };
      action?: string;
    };

    const dataId = body?.data?.id || body?.id || '';

    // SECURITY: Verify signature BEFORE any processing
    if (!xSignature || !xRequestId) {
      return reply.status(401).send({ error: 'Headers de assinatura ausentes' });
    }

    const isValid = mercadoPagoService.verifyWebhookSignature(
      xSignature,
      xRequestId,
      dataId,
    );

    if (!isValid) {
      // Log failed attempt without processing
      await db
        .insert(webhookEvents)
        .values({
          mp_event_id: body?.id || null,
          event_type: body?.type || body?.action || 'unknown',
          resource_id: dataId,
          resource_type: body?.type || null,
          raw_payload: JSON.stringify(body),
          error_message: 'Assinatura inválida',
        });

      return reply.status(401).send({ error: 'Assinatura inválida' });
    }

    // Log the verified webhook event
    const [event] = await db
      .insert(webhookEvents)
      .values({
        mp_event_id: body?.id || null,
        event_type: body?.type || body?.action || 'unknown',
        resource_id: dataId,
        resource_type: body?.type || null,
        raw_payload: JSON.stringify(body),
      })
      .returning();

    // Process payment notifications
    if (body?.type === 'payment' && dataId) {
      try {
        const mpPaymentId = dataId;

        // Get current status from MP
        const mpStatus = await mercadoPagoService.getPaymentStatus(mpPaymentId);

        // Find our payment record by mp_payment_id
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.mp_payment_id, mpPaymentId))
          .limit(1);

        if (payment) {
          // Update payment status
          await db
            .update(payments)
            .set({
              status: mpStatus.status as any,
              paid_at: mpStatus.paid_at ? new Date(mpStatus.paid_at) : undefined,
              updated_at: new Date(),
            })
            .where(eq(payments.id, payment.id));

          // Update booking payment status + send notifications
          if (payment.booking_id) {
            if (mpStatus.status === 'APPROVED') {
              await db
                .update(bookings)
                .set({ payment_status: 'PAID' })
                .where(eq(bookings.id, payment.booking_id));

              // Notify both parties about approved payment
              sendBookingNotification(payment.booking_id, 'PAYMENT_APPROVED');
            } else if (mpStatus.status === 'REFUNDED' || mpStatus.status === 'CHARGED_BACK') {
              await db
                .update(bookings)
                .set({ payment_status: 'REFUNDED', status: 'CANCELLED' })
                .where(eq(bookings.id, payment.booking_id));
            } else if (mpStatus.status === 'REJECTED' || mpStatus.status === 'CANCELLED') {
              await db
                .update(bookings)
                .set({ payment_status: 'UNPAID' })
                .where(eq(bookings.id, payment.booking_id));

              // Notify contratante about failed payment
              sendBookingNotification(payment.booking_id, 'PAYMENT_FAILED');
            }
          }
        }

        // Mark event as processed
        await db
          .update(webhookEvents)
          .set({ processed: true })
          .where(eq(webhookEvents.id, event.id));
      } catch (error: any) {
        await db
          .update(webhookEvents)
          .set({ error_message: error.message || 'Erro ao processar webhook' })
          .where(eq(webhookEvents.id, event.id));
      }
    } else {
      // Mark non-payment events as processed
      await db
        .update(webhookEvents)
        .set({ processed: true })
        .where(eq(webhookEvents.id, event.id));
    }

    // Always return 200 to acknowledge receipt
    return reply.status(200).send({ received: true });
  });
}
