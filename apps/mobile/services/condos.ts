import { api } from './api';

export const condoService = {
  lookupCnpj: async (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    const { data } = await api.get(`/condos/lookup/${clean}`);
    return data;
  },

  create: async (payload: {
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    cep: string;
    endereco: string;
    numero: string;
    complemento?: string;
    cidade: string;
    uf: string;
    num_torres: number;
    num_unidades: number;
    areas_lazer: string[];
  }) => {
    const { data } = await api.post('/condos', payload);
    return data;
  },

  getMyCondos: async () => {
    const { data } = await api.get('/condos');
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/condos/${id}`);
    return data;
  },

  getAreas: async (condoId: string) => {
    const { data } = await api.get(`/condos/${condoId}/areas`);
    return data;
  },

  uploadDocument: async (condoId: string, fileUri: string, fileName: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const { data } = await api.post(`/condos/${condoId}/upload-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data;
  },

  analyzeDocument: async (condoId: string) => {
    const { data } = await api.post(`/condos/${condoId}/analyze-document`, {}, {
      timeout: 120000,
    });
    return data;
  },

  confirmAnalysis: async (condoId: string, analysisData: any) => {
    const { data } = await api.post(`/condos/${condoId}/confirm-analysis`, analysisData);
    return data;
  },

  getEstimate: async (condoId: string, categoryId: string) => {
    const { data } = await api.get(`/condos/${condoId}/estimate`, {
      params: { category_id: categoryId },
    });
    return data;
  },

  getRecommendations: async (condoId: string) => {
    const { data } = await api.get(`/condos/${condoId}/recommendations`);
    return data;
  },

  getMaintenanceItems: async (condoId: string) => {
    const { data } = await api.get(`/condos/${condoId}/maintenance`);
    return data;
  },

  updateMaintenanceItem: async (condoId: string, itemId: string, lastDone: string) => {
    const { data } = await api.put(`/condos/${condoId}/maintenance/${itemId}`, { last_done: lastDone });
    return data;
  },
};
