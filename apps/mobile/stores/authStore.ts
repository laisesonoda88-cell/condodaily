import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'CONTRATANTE' | 'PROFISSIONAL';
  avatar_url: string | null;
  is_verified: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    cpf: string;
    phone: string;
    role: 'CONTRATANTE' | 'PROFISSIONAL';
    document_type?: 'CPF' | 'CNPJ';
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, access_token, refresh_token } = data.data;

    await AsyncStorage.setItem('@condodaily:token', access_token);
    await AsyncStorage.setItem('@condodaily:refresh_token', refresh_token);
    await AsyncStorage.setItem('@condodaily:user', JSON.stringify(user));

    set({ user, isAuthenticated: true });
  },

  register: async (registerData) => {
    const { data } = await api.post('/auth/register', registerData);
    const { user, access_token, refresh_token } = data.data;

    await AsyncStorage.setItem('@condodaily:token', access_token);
    await AsyncStorage.setItem('@condodaily:refresh_token', refresh_token);
    await AsyncStorage.setItem('@condodaily:user', JSON.stringify(user));

    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove([
      '@condodaily:token',
      '@condodaily:refresh_token',
      '@condodaily:user',
    ]);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const userJson = await AsyncStorage.getItem('@condodaily:user');
      const token = await AsyncStorage.getItem('@condodaily:token');

      if (userJson && token) {
        set({ user: JSON.parse(userJson), isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
