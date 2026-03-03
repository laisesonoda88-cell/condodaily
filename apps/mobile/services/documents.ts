import { api } from './api';

export interface DocStatus {
  status: string;
  documents: {
    rg: boolean;
    cpf: boolean;
    comprovante: boolean;
    selfie: boolean;
  };
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export const documentService = {
  getStatus: async (): Promise<DocStatus> => {
    const { data } = await api.get('/documents/status');
    return data.data;
  },

  uploadDocument: async (docType: 'rg' | 'cpf' | 'comprovante' | 'selfie', imageUri: string) => {
    const formData = new FormData();

    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      pdf: 'application/pdf',
    };

    formData.append(docType, {
      uri: imageUri,
      type: mimeMap[ext] || 'image/jpeg',
      name: `${docType}.${ext}`,
    } as any);

    const { data } = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return data;
  },

  submit: async () => {
    const { data } = await api.post('/documents/submit');
    return data;
  },
};
