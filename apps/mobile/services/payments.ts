import { api } from './api';

/** Generate a unique idempotency key for payment requests */
function generateIdempotencyKey(bookingId: string): string {
  return `pay_${bookingId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const paymentService = {
  createPayment: async (
    bookingId: string,
    paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO',
    cardToken?: string,
    installments?: number,
  ) => {
    const idempotencyKey = generateIdempotencyKey(bookingId);
    const { data } = await api.post(
      '/payments/create',
      {
        booking_id: bookingId,
        payment_method: paymentMethod,
        card_token: cardToken,
        installments: installments || 1,
      },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
    return data;
  },

  getPaymentStatus: async (paymentId: string) => {
    const { data } = await api.get(`/payments/${paymentId}/status`);
    return data;
  },

  getPixData: async (paymentId: string) => {
    const { data } = await api.get(`/payments/${paymentId}/pix-data`);
    return data;
  },

  refundPayment: async (paymentId: string) => {
    const { data } = await api.post(`/payments/${paymentId}/refund`);
    return data;
  },

  confirmCompletion: async (bookingId: string) => {
    const { data } = await api.post(`/bookings/${bookingId}/confirm-completion`);
    return data;
  },

  // Professional payment info
  savePaymentInfo: async (info: {
    pix_key_type: string;
    pix_key: string;
    bank_name?: string;
    bank_agency?: string;
    bank_account?: string;
    bank_account_type?: string;
  }) => {
    const { data } = await api.put('/professionals/payment-info', info);
    return data;
  },

  getPaymentInfo: async () => {
    const { data } = await api.get('/professionals/payment-info');
    return data;
  },

  getPayouts: async () => {
    const { data } = await api.get('/professionals/payouts');
    return data;
  },

  // ─── Mercado Pago OAuth ─────────────────────────────

  getMpAuthUrl: async () => {
    const { data } = await api.get('/mp/oauth/auth-url');
    return data;
  },

  getMpConnectionStatus: async () => {
    const { data } = await api.get('/mp/oauth/status');
    return data;
  },

  disconnectMp: async () => {
    const { data } = await api.post('/mp/oauth/disconnect');
    return data;
  },

  refreshMpToken: async () => {
    const { data } = await api.post('/mp/oauth/refresh-token');
    return data;
  },
};
