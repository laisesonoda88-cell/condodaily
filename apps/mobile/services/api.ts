import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://api.condodaily.com.br/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@condodaily:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh & account deactivation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 403 = Account deactivated (is_active=false) → force logout
    if (error.response?.status === 403) {
      await AsyncStorage.multiRemove(['@condodaily:token', '@condodaily:refresh_token', '@condodaily:user']);
      // Navigation to login will be handled by auth store
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('@condodaily:refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefresh } = data.data;

        await AsyncStorage.setItem('@condodaily:token', access_token);
        await AsyncStorage.setItem('@condodaily:refresh_token', newRefresh);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        await AsyncStorage.multiRemove(['@condodaily:token', '@condodaily:refresh_token', '@condodaily:user']);
        // Navigation to login will be handled by auth store
      }
    }

    return Promise.reject(error);
  }
);
