import { api } from './api';

export const notificationService = {
  registerPushToken: async (push_token: string) => {
    const { data } = await api.put('/users/push-token', { push_token });
    return data;
  },
};
