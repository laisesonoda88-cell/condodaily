import { api } from './api';

export const bookingService = {
  create: async (payload: {
    profissional_id: string;
    condo_id: string;
    category_id: string;
    scheduled_date: string;
    scheduled_start: string;
    scheduled_end: string;
    hourly_rate: number;
    notes?: string;
    payment_source: 'MERCADO_PAGO' | 'WALLET';
    payment_method?: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
    card_token?: string;
    installments?: number;
  }) => {
    const { data } = await api.post('/bookings', payload);
    return data;
  },

  getAll: async (condo_id?: string) => {
    const params = condo_id ? `?condo_id=${condo_id}` : '';
    const { data } = await api.get(`/bookings${params}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/bookings/${id}`);
    return data;
  },

  accept: async (id: string) => {
    const { data } = await api.post(`/bookings/${id}/accept`);
    return data;
  },

  reject: async (id: string) => {
    const { data } = await api.post(`/bookings/${id}/reject`);
    return data;
  },

  checkIn: async (id: string, latitude: number, longitude: number) => {
    const { data } = await api.post(`/bookings/${id}/check-in`, { latitude, longitude });
    return data;
  },

  checkOut: async (id: string, latitude: number, longitude: number) => {
    const { data } = await api.post(`/bookings/${id}/check-out`, { latitude, longitude });
    return data;
  },

  cancel: async (id: string) => {
    const { data } = await api.post(`/bookings/${id}/cancel`);
    return data;
  },
};
