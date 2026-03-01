import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, bookings, serviceCategories } from '../db/schema.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type NotificationEvent =
  | 'BOOKING_CREATED'
  | 'BOOKING_ACCEPTED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_FAILED'
  | 'CONTRATANTE_CONFIRMED'
  | 'PROFISSIONAL_CONFIRMED'
  | 'PAYMENT_RELEASED';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'default' | 'high';
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000; // 1s, 2s, 4s (exponential backoff)

/**
 * Send push notification to a specific user (with retry + exponential backoff)
 * Still fire-and-forget from caller perspective, but retries network failures.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const [user] = await db
      .select({ push_token: users.push_token })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.push_token) return;

    const message: PushMessage = {
      to: user.push_token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    };

    // L3: Retry with exponential backoff
    await sendWithRetry(message, MAX_RETRIES);
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error('[Notifications] Failed to send push after retries:', err);
  }
}

/**
 * L3: Send HTTP request with retry and exponential backoff
 */
async function sendWithRetry(message: PushMessage, retries: number): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      // 2xx = success, 4xx = don't retry (client error), 5xx = retry
      if (response.ok) return;
      if (response.status >= 400 && response.status < 500) {
        console.warn(`[Notifications] Push rejected (${response.status}), not retrying`);
        return;
      }

      // Server error → retry
      if (attempt < retries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[Notifications] Push failed (${response.status}), retrying in ${delay}ms (${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err) {
      // Network error → retry
      if (attempt < retries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[Notifications] Network error, retrying in ${delay}ms (${attempt + 1}/${retries}):`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Send booking-related notification based on event type
 */
export async function sendBookingNotification(
  bookingId: string,
  event: NotificationEvent,
): Promise<void> {
  try {
    // Get booking with related data
    const [booking] = await db
      .select({
        id: bookings.id,
        contratante_id: bookings.contratante_id,
        profissional_id: bookings.profissional_id,
        scheduled_date: bookings.scheduled_date,
        category_id: bookings.category_id,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) return;

    // Get category name
    const [category] = await db
      .select({ name: serviceCategories.name })
      .from(serviceCategories)
      .where(eq(serviceCategories.id, booking.category_id))
      .limit(1);

    const categoryName = category?.name || 'Serviço';
    const dateFormatted = formatDate(booking.scheduled_date);

    // Get user names for the notification
    const [contratante] = await db
      .select({ full_name: users.full_name })
      .from(users)
      .where(eq(users.id, booking.contratante_id))
      .limit(1);

    const [profissional] = await db
      .select({ full_name: users.full_name })
      .from(users)
      .where(eq(users.id, booking.profissional_id))
      .limit(1);

    const contratanteName = contratante?.full_name?.split(' ')[0] || 'Contratante';
    const profissionalName = profissional?.full_name?.split(' ')[0] || 'Profissional';

    const navData = {
      screen: 'booking-details',
      bookingId: booking.id,
    };

    switch (event) {
      case 'BOOKING_CREATED':
        await sendPushToUser(
          booking.profissional_id,
          'Nova Diária! 🎉',
          `${contratanteName} solicitou ${categoryName} para ${dateFormatted}`,
          navData,
        );
        break;

      case 'BOOKING_ACCEPTED':
        await sendPushToUser(
          booking.contratante_id,
          'Diária Aceita! ✅',
          `${profissionalName} aceitou sua diária de ${categoryName} para ${dateFormatted}`,
          navData,
        );
        break;

      case 'BOOKING_REJECTED':
        await sendPushToUser(
          booking.contratante_id,
          'Diária Recusada',
          `${profissionalName} não pode atender a diária de ${categoryName} para ${dateFormatted}`,
          navData,
        );
        break;

      case 'BOOKING_CANCELLED':
        // Notify both parties
        await sendPushToUser(
          booking.profissional_id,
          'Diária Cancelada',
          `A diária de ${categoryName} para ${dateFormatted} foi cancelada`,
          navData,
        );
        await sendPushToUser(
          booking.contratante_id,
          'Diária Cancelada',
          `A diária de ${categoryName} para ${dateFormatted} foi cancelada`,
          navData,
        );
        break;

      case 'PAYMENT_APPROVED':
        await sendPushToUser(
          booking.profissional_id,
          'Pagamento Confirmado 💰',
          `O pagamento da diária de ${categoryName} para ${dateFormatted} foi aprovado`,
          navData,
        );
        await sendPushToUser(
          booking.contratante_id,
          'Pagamento Aprovado ✅',
          `Seu pagamento para ${categoryName} em ${dateFormatted} foi confirmado`,
          navData,
        );
        break;

      case 'PAYMENT_FAILED':
        await sendPushToUser(
          booking.contratante_id,
          'Pagamento Não Aprovado ❌',
          `O pagamento da diária de ${categoryName} para ${dateFormatted} falhou. Tente novamente.`,
          navData,
        );
        break;

      case 'CONTRATANTE_CONFIRMED':
        await sendPushToUser(
          booking.profissional_id,
          'Serviço Confirmado pelo Contratante ✅',
          `O condomínio confirmou a conclusão de ${categoryName} em ${dateFormatted}`,
          navData,
        );
        break;

      case 'PROFISSIONAL_CONFIRMED':
        await sendPushToUser(
          booking.contratante_id,
          'Serviço Confirmado pelo Profissional ✅',
          `${profissionalName} confirmou a conclusão de ${categoryName} em ${dateFormatted}`,
          navData,
        );
        break;

      case 'PAYMENT_RELEASED':
        await sendPushToUser(
          booking.profissional_id,
          'Pagamento Liberado! 🎉',
          `O valor da diária de ${categoryName} em ${dateFormatted} foi transferido para sua conta`,
          navData,
        );
        await sendPushToUser(
          booking.contratante_id,
          'Pagamento Liberado',
          `O valor da diária de ${categoryName} em ${dateFormatted} foi transferido ao profissional`,
          navData,
        );
        break;
    }
  } catch (err) {
    console.error('[Notifications] Failed to send booking notification:', err);
  }
}

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  } catch {
    return dateStr;
  }
}
