import { api } from './api';

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  register: async (payload: {
    email: string;
    password: string;
    full_name: string;
    cpf: string;
    phone: string;
    role: 'CONTRATANTE' | 'PROFISSIONAL';
  }) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  refreshToken: async (refresh_token: string) => {
    const { data } = await api.post('/auth/refresh', { refresh_token });
    return data;
  },
};
