import { FastifyInstance } from 'fastify';
import { eq, and, sql, gte, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { condoWallets, walletTransactions, condos, bookings } from '../../db/schema.js';
import { z } from 'zod';

const depositSchema = z.object({
  condo_id: z.string().uuid(),
  amount: z.number().positive().min(10, 'Depósito mínimo de R$ 10,00').max(50000, 'Depósito máximo de R$ 50.000,00'),
  payment_method: z.enum(['PIX', 'CREDIT_CARD', 'BOLETO']).default('PIX'),
});

export async function paymentRoutes(app: FastifyInstance) {
  // GET /api/wallet/balance - Get wallet balance for user's condos
  app.get('/balance', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const userCondos = await db
      .select()
      .from(condos)
      .where(eq(condos.user_id, userId));

    if (userCondos.length === 0) {
      return reply.send({
        success: true,
        data: { condos: [], total_balance: 0 },
      });
    }

    const walletsData = [];
    let totalBalance = 0;

    for (const condo of userCondos) {
      const [wallet] = await db
        .select()
        .from(condoWallets)
        .where(eq(condoWallets.condo_id, condo.id))
        .limit(1);

      const balance = wallet ? Number(wallet.balance) : 0;
      totalBalance += balance;

      walletsData.push({
        condo_id: condo.id,
        condo_name: condo.razao_social,
        wallet_id: wallet?.id,
        balance,
      });
    }

    return reply.send({
      success: true,
      data: { condos: walletsData, total_balance: totalBalance },
    });
  });

  // POST /api/wallet/deposit - Deposit into a condo wallet
  app.post('/deposit', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };

    if (role !== 'CONTRATANTE') {
      return reply.status(403).send({
        success: false,
        error: 'Apenas contratantes podem fazer depósitos',
      });
    }

    const parsed = depositSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { condo_id, amount, payment_method } = parsed.data;

    // Verify condo belongs to user
    const [condo] = await db
      .select()
      .from(condos)
      .where(and(eq(condos.id, condo_id), eq(condos.user_id, userId)))
      .limit(1);

    if (!condo) {
      return reply.status(404).send({
        success: false,
        error: 'Condomínio não encontrado ou não pertence a este usuário',
      });
    }

    // Get wallet
    const [wallet] = await db
      .select()
      .from(condoWallets)
      .where(eq(condoWallets.condo_id, condo_id))
      .limit(1);

    if (!wallet) {
      return reply.status(404).send({
        success: false,
        error: 'Wallet não encontrada para este condomínio',
      });
    }

    // SECURITY: Simulated deposits are only allowed in development
    if (process.env.NODE_ENV === 'production') {
      return reply.status(503).send({
        success: false,
        error: 'Depósito direto não disponível. Use o gateway de pagamento.',
      });
    }

    const simulatedPaymentId = `DEV_PIX_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Atomic transaction: insert record + update balance
    const result = await db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          wallet_id: wallet.id,
          type: 'DEPOSIT',
          amount: String(amount),
          payment_method: payment_method,
          external_payment_id: simulatedPaymentId,
          status: 'CONFIRMED',
        })
        .returning();

      await tx
        .update(condoWallets)
        .set({
          balance: sql`${condoWallets.balance} + ${amount}`,
          updated_at: new Date(),
        })
        .where(eq(condoWallets.id, wallet.id));

      const [updatedWallet] = await tx
        .select()
        .from(condoWallets)
        .where(eq(condoWallets.id, wallet.id))
        .limit(1);

      return { transaction, updatedWallet };
    });

    return reply.status(201).send({
      success: true,
      data: {
        transaction: result.transaction,
        new_balance: Number(result.updatedWallet.balance),
      },
      message: `[DEV] Depósito simulado de R$ ${amount.toFixed(2)} via ${payment_method}`,
    });
  });

  // GET /api/wallet/transactions - Get transaction history (paginated)
  app.get('/transactions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { condo_id, page: pageStr, limit: limitStr } = request.query as {
      condo_id?: string;
      page?: string;
      limit?: string;
    };

    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const userCondos = await db
      .select()
      .from(condos)
      .where(eq(condos.user_id, userId));

    if (userCondos.length === 0) {
      return reply.send({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    // SECURITY: Validate condo_id belongs to user (prevent IDOR)
    const targetCondoIds = condo_id
      ? (userCondos.some(c => c.id === condo_id) ? [condo_id] : [])
      : userCondos.map(c => c.id);

    if (condo_id && targetCondoIds.length === 0) {
      return reply.status(403).send({
        success: false,
        error: 'Condomínio não pertence a este usuário',
      });
    }

    const allTransactions = [];

    for (const condoId of targetCondoIds) {
      const [wallet] = await db
        .select()
        .from(condoWallets)
        .where(eq(condoWallets.condo_id, condoId))
        .limit(1);

      if (wallet) {
        const transactions = await db
          .select()
          .from(walletTransactions)
          .where(eq(walletTransactions.wallet_id, wallet.id))
          .orderBy(desc(walletTransactions.created_at));

        const condoInfo = userCondos.find(c => c.id === condoId);
        allTransactions.push(
          ...transactions.map(t => ({
            ...t,
            amount: Number(t.amount),
            condo_name: condoInfo?.razao_social || '',
          }))
        );
      }
    }

    allTransactions.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = allTransactions.length;
    const paginatedData = allTransactions.slice(offset, offset + limit);

    return reply.send({
      success: true,
      data: paginatedData,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });

  // GET /api/wallet/summary - Monthly financial summary (optional condo_id filter)
  app.get('/summary', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { condo_id } = request.query as { condo_id?: string };

    const userCondos = await db
      .select()
      .from(condos)
      .where(eq(condos.user_id, userId));

    // SECURITY: Validate condo_id belongs to user (prevent IDOR)
    const condoIds = condo_id
      ? (userCondos.some(c => c.id === condo_id) ? [condo_id] : [])
      : userCondos.map(c => c.id);

    if (condo_id && condoIds.length === 0) {
      return reply.status(403).send({
        success: false,
        error: 'Condomínio não pertence a este usuário',
      });
    }

    if (condoIds.length === 0) {
      return reply.send({
        success: true,
        data: { month_total_spent: 0, month_bookings: 0, month_hours: 0 },
      });
    }

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const allMonthBookings = [];
    for (const condoId of condoIds) {
      const result = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.condo_id, condoId),
            gte(bookings.created_at, firstDay)
          )
        );
      allMonthBookings.push(...result);
    }

    const monthTotalSpent = allMonthBookings.reduce((s, b) => s + Number(b.gross_amount || 0), 0);
    const monthHours = allMonthBookings.reduce((s, b) => s + Number(b.total_hours || 0), 0);

    return reply.send({
      success: true,
      data: {
        month_total_spent: monthTotalSpent,
        month_bookings: allMonthBookings.length,
        month_hours: monthHours,
      },
    });
  });

  // ═══ Professional Earnings ═══

  // GET /api/wallet/earnings - Get professional earnings (paginated history)
  app.get('/earnings', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId, role } = request.user as { id: string; role: string };
    const { page: pageStr, limit: limitStr } = request.query as {
      page?: string;
      limit?: string;
    };

    if (role !== 'PROFISSIONAL') {
      return reply.status(403).send({
        success: false,
        error: 'Apenas profissionais podem acessar ganhos',
      });
    }

    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const completedBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.profissional_id, userId),
          eq(bookings.status, 'COMPLETED')
        )
      )
      .orderBy(desc(bookings.created_at));

    const totalEarnings = completedBookings.reduce(
      (sum, b) => sum + Number(b.net_professional_amount || 0), 0
    );

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthBookings = completedBookings.filter(
      b => new Date(b.created_at) >= firstDay
    );

    const monthEarnings = monthBookings.reduce(
      (sum, b) => sum + Number(b.net_professional_amount || 0), 0
    );
    const monthGross = monthBookings.reduce(
      (sum, b) => sum + Number(b.gross_amount || 0), 0
    );
    const monthHours = monthBookings.reduce(
      (sum, b) => sum + Number(b.total_hours || 0), 0
    );

    const history = completedBookings.map(b => ({
      id: b.id,
      date: b.scheduled_date,
      hours: Number(b.total_hours || 0),
      gross: Number(b.gross_amount || 0),
      platform_fee: Number(b.platform_fee || 0),
      insurance_fee: Number(b.insurance_fee || 0),
      net: Number(b.net_professional_amount || 0),
      check_out_at: b.check_out_at,
    }));

    const total = history.length;
    const paginatedHistory = history.slice(offset, offset + limit);

    return reply.send({
      success: true,
      data: {
        total_earnings: totalEarnings,
        total_services: completedBookings.length,
        month: {
          earnings: monthEarnings,
          gross: monthGross,
          hours: monthHours,
          services: monthBookings.length,
        },
        history: paginatedHistory,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });
}
