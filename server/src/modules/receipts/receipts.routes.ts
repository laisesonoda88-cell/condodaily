import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bookings, users, condos, serviceCategories } from '../../db/schema.js';
import { generateContratanteReceipt, generateProfissionalReceipt } from '../../services/receipt.js';

export async function receiptRoutes(app: FastifyInstance) {
  // GET /api/receipts/:bookingId
  // Gera PDF de resumo do serviço baseado no papel do usuário
  app.get('/:bookingId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { bookingId } = request.params as { bookingId: string };

    // Buscar booking com todos os dados necessários
    const [booking] = await db
      .select({
        id: bookings.id,
        contratante_id: bookings.contratante_id,
        profissional_id: bookings.profissional_id,
        condo_id: bookings.condo_id,
        category_id: bookings.category_id,
        scheduled_date: bookings.scheduled_date,
        scheduled_start: bookings.scheduled_start,
        scheduled_end: bookings.scheduled_end,
        status: bookings.status,
        total_hours: bookings.total_hours,
        hourly_rate: bookings.hourly_rate,
        gross_amount: bookings.gross_amount,
        platform_fee: bookings.platform_fee,
        insurance_fee: bookings.insurance_fee,
        net_professional_amount: bookings.net_professional_amount,
        payment_status: bookings.payment_status,
        notes: bookings.notes,
        check_in_at: bookings.check_in_at,
        check_out_at: bookings.check_out_at,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' });
    }

    // Verificar se o usuário faz parte desse booking
    const isContratante = booking.contratante_id === userId;
    const isProfissional = booking.profissional_id === userId;

    if (!isContratante && !isProfissional) {
      return reply.status(403).send({ success: false, error: 'Acesso negado' });
    }

    // Só gerar resumo para bookings concluídos ou com pagamento
    if (booking.status !== 'COMPLETED' && booking.payment_status === 'UNPAID') {
      return reply.status(400).send({
        success: false,
        error: 'Resumo disponível apenas após pagamento ou conclusão do serviço',
      });
    }

    // Buscar dados complementares
    const [contratante] = await db
      .select({ full_name: users.full_name, cpf: users.cpf })
      .from(users)
      .where(eq(users.id, booking.contratante_id))
      .limit(1);

    const [profissional] = await db
      .select({ full_name: users.full_name, cpf: users.cpf })
      .from(users)
      .where(eq(users.id, booking.profissional_id))
      .limit(1);

    const [condo] = await db
      .select({
        nome_fantasia: condos.nome_fantasia,
        razao_social: condos.razao_social,
        cnpj: condos.cnpj,
        endereco: condos.endereco,
        numero: condos.numero,
        cidade: condos.cidade,
        uf: condos.uf,
      })
      .from(condos)
      .where(eq(condos.id, booking.condo_id))
      .limit(1);

    const [category] = await db
      .select({ name: serviceCategories.name })
      .from(serviceCategories)
      .where(eq(serviceCategories.id, booking.category_id))
      .limit(1);

    const receiptData = {
      booking_id: booking.id,
      scheduled_date: booking.scheduled_date,
      scheduled_start: booking.scheduled_start,
      scheduled_end: booking.scheduled_end,
      total_hours: booking.total_hours,
      notes: booking.notes,
      check_in_at: booking.check_in_at?.toISOString() || null,
      check_out_at: booking.check_out_at?.toISOString() || null,
      category_name: category?.name || 'Serviço',
      hourly_rate: booking.hourly_rate,
      gross_amount: booking.gross_amount || '0',
      platform_fee: booking.platform_fee || '0',
      insurance_fee: booking.insurance_fee || '0',
      net_professional_amount: booking.net_professional_amount || '0',
      payment_status: booking.payment_status,
      contratante_name: contratante?.full_name || '',
      contratante_cpf: contratante?.cpf || '',
      profissional_name: profissional?.full_name || '',
      profissional_cpf: profissional?.cpf || '',
      condo_name: condo?.nome_fantasia || condo?.razao_social || '',
      condo_cnpj: condo?.cnpj || '',
      condo_endereco: `${condo?.endereco || ''}, ${condo?.numero || ''}`,
      condo_cidade: condo?.cidade || '',
      condo_uf: condo?.uf || '',
    };

    // Gerar PDF de resumo baseado no papel do usuário
    const pdfStream = isContratante
      ? generateContratanteReceipt(receiptData)
      : generateProfissionalReceipt(receiptData);

    const filename = isContratante
      ? `resumo-servico-${booking.scheduled_date}.pdf`
      : `resumo-servico-prestado-${booking.scheduled_date}.pdf`;

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`);

    return reply.send(pdfStream);
  });
}
