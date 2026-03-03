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
    document_type?: 'CPF' | 'CNPJ';
  }) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  refreshToken: async (refresh_token: string) => {
    const { data } = await api.post('/auth/refresh', { refresh_token });
    return data;
  },

  verifyEmail: async (email: string, code: string) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    return data;
  },

  resendVerification: async (email: string) => {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (email: string, code: string, new_password: string) => {
    const { data } = await api.post('/auth/reset-password', { email, code, new_password });
    return data;
  },
};
