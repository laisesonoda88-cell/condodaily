import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { condoService } from '../services/condos';

export interface Condo {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  endereco: string;
  numero: string;
  cidade: string;
  uf: string;
  porte: 'P' | 'M' | 'G';
  num_torres: number;
  num_unidades: number;
  metragem_total: number | null;
  tem_portaria: boolean;
  documento_analisado: boolean;
}

interface CondoState {
  activeCondo: Condo | null;
  condos: Condo[];
  isLoading: boolean;

  loadCondos: () => Promise<void>;
  setActiveCondo: (condo: Condo) => Promise<void>;
  clearActiveCondo: () => Promise<void>;
  restoreActiveCondo: () => Promise<void>;
}

const STORAGE_KEY = '@condodaily:active_condo';

export const useCondoStore = create<CondoState>((set, get) => ({
  activeCondo: null,
  condos: [],
  isLoading: true,

  loadCondos: async () => {
    try {
      set({ isLoading: true });
      const result = await condoService.getMyCondos();
      const condoList = result.data || [];
      set({ condos: condoList, isLoading: false });

      // Se só tem 1 condo, seleciona automaticamente
      if (condoList.length === 1 && !get().activeCondo) {
        await get().setActiveCondo(condoList[0]);
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveCondo: async (condo) => {
    set({ activeCondo: condo });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(condo));
  },

  clearActiveCondo: async () => {
    set({ activeCondo: null });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  restoreActiveCondo: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const condo = JSON.parse(stored) as Condo;
        set({ activeCondo: condo, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
