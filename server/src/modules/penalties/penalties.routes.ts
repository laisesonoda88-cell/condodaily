import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  professionalPenalties,
  professionalProfiles,
  bookings,
  users,
} from '../../db/schema.js';

// Constantes do sistema de multas
const PENALTY_PERCENTAGE = 0.3; // 30% do valor da diária
const MAX_PENALTIES_BEFORE_BLOCK = 3;

/**
 * Aplica uma multa ao profissional por falta ou cancelamento tardio.
 * - Calcula 30% do valor bruto do booking
 * - Acumula no pending_penalty_amount do profissional
 * - Incrementa penalty_count
 * - Se penalty_count >= 3, bloqueia o profissional
 */
export async function applyPenalty(
  professionalUserId: string,
  bookingId: string,
  reason: 'NO_SHOW' | 'LATE_CANCEL'
) {
  // Buscar booking para calcular multa
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error('Booking não encontrado');

  const grossAmount = Number(booking.gross_amount || booking.hourly_rate);
  const penaltyAmount = Math.round(grossAmount * PENALTY_PERCENTAGE * 100) / 100;

  // Criar registro da multa
  await db.insert(professionalPenalties).values({
    professional_id: professionalUserId,
    booking_id: bookingId,
    reason,
    amount: String(penaltyAmount),
    status: 'PENDING',
    notes: reason === 'NO_SHOW'
      ? 'Profissional não compareceu ao serviço'
      : 'Profissional cancelou após aceitar o serviço',
  });

  // SECURITY: Atomic increment to prevent race conditions (concurrent penalty applications)
  const [updatedProfile] = await db
    .update(professionalProfiles)
    .set({
      penalty_count: sql`${professionalProfiles.penalty_count} + 1`,
      pending_penalty_amount: sql`(${professionalProfiles.pending_penalty_amount}::numeric + ${penaltyAmount})::text`,
    })
    .where(eq(professionalProfiles.user_id, professionalUserId))
    .returning({
      penalty_count: professionalProfiles.penalty_count,
      pending_penalty_amount: professionalProfiles.pending_penalty_amount,
    });

  if (!updatedProfile) throw new Error('Perfil profissional não encontrado');

  const newPenaltyCount = updatedProfile.penalty_count;
  const newPendingAmount = Number(updatedProfile.pending_penalty_amount);
  const shouldBlock = newPenaltyCount >= MAX_PENALTIES_BEFORE_BLOCK;

  // Block if threshold reached (separate update to keep atomic increment clean)
  if (shouldBlock) {
    await db
      .update(professionalProfiles)
      .set({
        is_blocked: true,
        blocked_at: new Date(),
        blocked_reason: `Bloqueado automaticamente após ${newPenaltyCount} faltas/cancelamentos`,
      })
      .where(eq(professionalProfiles.user_id, professionalUserId));
  }

  return {
    penalty_amount: penaltyAmount,
    total_pending: newPendingAmount,
    penalty_count: newPenaltyCount,
    blocked: shouldBlock,
  };
}

/**
 * Desconta multas pendentes de um pagamento ao profissional.
 * Retorna o valor líquido após descontos.
 */
export async function deductPendingPenalties(
  professionalUserId: string,
  paymentAmount: number,
  bookingId: string
): Promise<{ net_amount: number; deducted: number }> {
  const [profile] = await db
    .select()
    .from(professionalProfiles)
    .where(eq(professionalProfiles.user_id, professionalUserId))
    .limit(1);

  if (!profile || Number(profile.pending_penalty_amount) === 0) {
    return { net_amount: paymentAmount, deducted: 0 };
  }

  const pendingAmount = Number(profile.pending_penalty_amount);
  const deducted = Math.min(pendingAmount, paymentAmount);
  const netAmount = paymentAmount - deducted;
  const remainingPenalty = pendingAmount - deducted;

  // Marcar multas como aplicadas (mais antigas primeiro)
  const pendingPenalties = await db
    .select()
    .from(professionalPenalties)
    .where(
      and(
        eq(professionalPenalties.professional_id, professionalUserId),
        eq(professionalPenalties.status, 'PENDING')
      )
    );

  let amountToApply = deducted;
  for (const penalty of pendingPenalties) {
    if (amountToApply <= 0) break;

    const penaltyVal = Number(penalty.amount);
    if (penaltyVal <= amountToApply) {
      await db
        .update(professionalPenalties)
        .set({
          status: 'APPLIED',
          applied_in_booking_id: bookingId,
          applied_at: new Date(),
        })
        .where(eq(professionalPenalties.id, penalty.id));
      amountToApply -= penaltyVal;
    }
  }

  // Atualizar pending_penalty_amount no profile
  await db
    .update(professionalProfiles)
    .set({
      pending_penalty_amount: String(Math.max(0, remainingPenalty)),
    })
    .where(eq(professionalProfiles.user_id, professionalUserId));

  return { net_amount: netAmount, deducted };
}

export async function penaltyRoutes(app: FastifyInstance) {
  // GET /api/penalties/my — Profissional vê suas multas
  app.get('/my', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const penalties = await db
      .select()
      .from(professionalPenalties)
      .where(eq(professionalPenalties.professional_id, userId));

    const [profile] = await db
      .select({
        penalty_count: professionalProfiles.penalty_count,
        pending_penalty_amount: professionalProfiles.pending_penalty_amount,
        is_blocked: professionalProfiles.is_blocked,
        blocked_reason: professionalProfiles.blocked_reason,
      })
      .from(professionalProfiles)
      .where(eq(professionalProfiles.user_id, userId))
      .limit(1);

    return reply.send({
      success: true,
      data: {
        penalties,
        summary: {
          total_penalties: profile?.penalty_count || 0,
          pending_amount: Number(profile?.pending_penalty_amount || 0),
          is_blocked: profile?.is_blocked || false,
          blocked_reason: profile?.blocked_reason,
          max_before_block: MAX_PENALTIES_BEFORE_BLOCK,
        },
      },
    });
  });
}
