import { api } from './api';

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const walletService = {
  getBalance: async () => {
    const { data } = await api.get('/wallet/balance');
    return data;
  },

  deposit: async (condo_id: string, amount: number, payment_method: string = 'PIX') => {
    const { data } = await api.post('/wallet/deposit', {
      condo_id,
      amount,
      payment_method,
    });
    return data;
  },

  getTransactions: async (
    condo_id?: string,
    pagination?: PaginationParams,
  ): Promise<{ success: boolean; data: any[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams();
    if (condo_id) params.set('condo_id', condo_id);
    if (pagination?.page) params.set('page', String(pagination.page));
    if (pagination?.limit) params.set('limit', String(pagination.limit));
    const qs = params.toString();
    const { data } = await api.get(`/wallet/transactions${qs ? `?${qs}` : ''}`);
    return data;
  },

  getSummary: async (condo_id?: string) => {
    const params = condo_id ? `?condo_id=${condo_id}` : '';
    const { data } = await api.get(`/wallet/summary${params}`);
    return data;
  },

  getEarnings: async (
    pagination?: PaginationParams,
  ): Promise<{ success: boolean; data: any; }> => {
    const params = new URLSearchParams();
    if (pagination?.page) params.set('page', String(pagination.page));
    if (pagination?.limit) params.set('limit', String(pagination.limit));
    const qs = params.toString();
    const { data } = await api.get(`/wallet/earnings${qs ? `?${qs}` : ''}`);
    return data;
  },
};
