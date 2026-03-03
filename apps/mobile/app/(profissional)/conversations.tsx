import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { chatService, ChatConversation } from '../../services/chat';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { SERVER_URL } from '../../services/api';

export default function ConversationsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, []),
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const renderItem = ({ item }: { item: ChatConversation }) => {
    const avatarUrl = item.other_user?.avatar_url
      ? `${SERVER_URL}${item.other_user.avatar_url}`
      : null;

    const isMe = item.last_message?.sender_id === user?.id;
    const preview = item.last_message
      ? (isMe ? 'Você: ' : '') + item.last_message.content
      : 'Nenhuma mensagem ainda';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() =>
          router.push({
            pathname: '/(profissional)/chat',
            params: { conversationId: item.id, name: item.other_user?.full_name },
          })
        }
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.other_user?.full_name?.[0] || '?'}
            </Text>
          </View>
        )}

        <View style={styles.conversationContent}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.other_user?.full_name}
            </Text>
            {item.last_message && (
              <Text style={styles.time}>{formatTime(item.last_message.created_at)}</Text>
            )}
          </View>
          <View style={styles.bottomRow}>
            <Text style={[styles.preview, item.unread_count > 0 && styles.previewUnread]} numberOfLines={1}>
              {preview}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensagens</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptySubtext}>
            Suas conversas com profissionais aparecerão aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyText: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.semibold, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptySubtext: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
  list: { paddingHorizontal: SPACING.lg },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  conversationContent: { flex: 1, marginLeft: SPACING.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  name: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, flex: 1 },
  time: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textMuted, marginLeft: SPACING.sm },
  preview: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, flex: 1 },
  previewUnread: { fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: SPACING.sm,
  },
  badgeText: { color: COLORS.white, fontSize: 11, fontFamily: FONTS.bold },
});
