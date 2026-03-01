import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { serviceCategories } from '../../db/schema.js';

export async function categoryRoutes(app: FastifyInstance) {
  // GET /api/categories
  app.get('/', async (_request, reply) => {
    const categories = await db.select().from(serviceCategories);
    return reply.send({ success: true, data: categories });
  });
}
