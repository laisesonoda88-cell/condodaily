import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { reviews, bookings, professionalProfiles, users } from '../../db/schema.js';
import { z } from 'zod';

const createReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function reviewRoutes(app: FastifyInstance) {
  // POST /api/reviews
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const parsed = createReviewSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { booking_id, rating, comment } = parsed.data;

    // Verify booking exists and is completed
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, booking_id))
      .limit(1);

    if (!booking || booking.status !== 'COMPLETED') {
      return reply.status(400).send({
        success: false,
        error: 'Avaliação só é permitida após a conclusão do serviço',
      });
    }

    if (booking.contratante_id !== userId) {
      return reply.status(403).send({
        success: false,
        error: 'Apenas o contratante pode avaliar',
      });
    }

    // Check for existing review
    const existingReview = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.booking_id, booking_id), eq(reviews.reviewer_id, userId)))
      .limit(1);

    if (existingReview.length > 0) {
      return reply.status(409).send({
        success: false,
        error: 'Este serviço já foi avaliado',
      });
    }

    const [review] = await db
      .insert(reviews)
      .values({
        booking_id,
        reviewer_id: userId,
        reviewed_id: booking.profissional_id,
        rating,
        comment,
      })
      .returning();

    // Update professional's average rating
    const avgResult = await db
      .select({ avg: sql<number>`avg(${reviews.rating})::real` })
      .from(reviews)
      .where(eq(reviews.reviewed_id, booking.profissional_id));

    if (avgResult[0]) {
      await db
        .update(professionalProfiles)
        .set({
          avg_rating: avgResult[0].avg,
          total_services: sql`${professionalProfiles.total_services} + 1`,
        })
        .where(eq(professionalProfiles.user_id, booking.profissional_id));
    }

    return reply.status(201).send({ success: true, data: review });
  });

  // GET /api/reviews/professional/:id
  app.get('/professional/:id', async (request, reply) => {
    const { id: professionalId } = request.params as { id: string };

    const result = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        created_at: reviews.created_at,
        reviewer_name: users.full_name,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.reviewer_id))
      .where(eq(reviews.reviewed_id, professionalId))
      .orderBy(sql`${reviews.created_at} DESC`);

    return reply.send({ success: true, data: result });
  });
}
