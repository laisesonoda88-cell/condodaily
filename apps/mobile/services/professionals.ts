import { api } from './api';

export const professionalService = {
  getCategories: async () => {
    const { data } = await api.get('/categories');
    return data;
  },

  submitQuiz: async (answers: Record<string, string>) => {
    const { data } = await api.post('/professionals/quiz/submit', { answers });
    return data;
  },

  getProfile: async () => {
    const { data } = await api.get('/users/me');
    return data;
  },

  getMyServices: async () => {
    const { data } = await api.get('/professionals/my-services');
    return data;
  },

  updateServices: async (services: { category_id: string }[]) => {
    const { data } = await api.put('/professionals/services', { services });
    return data;
  },

  updatePricing: async (hourly_rate: number, service_radius_km: number) => {
    const { data } = await api.put('/professionals/pricing', {
      hourly_rate,
      service_radius_km,
    });
    return data;
  },

  searchProfessionals: async (params: {
    q?: string;
    category?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const { data } = await api.get(`/professionals/search?${query.toString()}`);
    return data;
  },

  getProfessionalProfile: async (userId: string) => {
    const { data } = await api.get(`/professionals/${userId}`);
    return data;
  },

  getDashboard: async () => {
    const { data } = await api.get('/professionals/dashboard');
    return data;
  },

  updateAvailability: async (disponivel_fim_semana: boolean, disponivel_feriados: boolean) => {
    const { data } = await api.put('/professionals/availability', {
      disponivel_fim_semana,
      disponivel_feriados,
    });
    return data;
  },
};
