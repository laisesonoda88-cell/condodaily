import { api } from './api';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data_json: string | null;
  read_at: string | null;
  created_at: string;
}

export const notificationService = {
  registerPushToken: async (push_token: string) => {
    const { data } = await api.put('/users/push-token', { push_token });
    return data;
  },

  getNotifications: async (page = 1, unreadOnly = false) => {
    const params: Record<string, string | number | boolean> = { page, limit: 20 };
    if (unreadOnly) params.unread = true;
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string) => {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.put('/notifications/read-all');
    return data;
  },
};
