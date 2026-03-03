import { api } from './api';

export interface ChatConversation {
  id: string;
  booking_id: string;
  contratante_id: string;
  profissional_id: string;
  last_message_at: string | null;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export const chatService = {
  getConversations: async (): Promise<ChatConversation[]> => {
    const { data } = await api.get('/chat/conversations');
    return data.data;
  },

  createConversation: async (bookingId: string) => {
    const { data } = await api.post('/chat/conversations', { booking_id: bookingId });
    return data.data;
  },

  getMessages: async (conversationId: string, before?: string): Promise<ChatMessage[]> => {
    const params = before ? `?before=${before}&limit=50` : '?limit=50';
    const { data } = await api.get(`/chat/conversations/${conversationId}/messages${params}`);
    return data.data;
  },

  sendMessage: async (conversationId: string, content: string): Promise<ChatMessage> => {
    const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
    return data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get('/chat/unread-count');
    return data.data.unread_count;
  },
};
