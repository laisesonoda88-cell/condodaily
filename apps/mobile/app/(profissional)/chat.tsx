import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { chatService, ChatMessage } from '../../services/chat';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const POLL_INTERVAL = 5000; // 5 segundos

export default function ChatScreen() {
  const { conversationId, name } = useLocalSearchParams<{ conversationId: string; name: string }>();
  const { user } = useAuthStore();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = async () => {
    if (!conversationId) return;
    try {
      const data = await chatService.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoading(false);
    }
  };

  // Polling para novas mensagens
  useFocusEffect(
    useCallback(() => {
      loadMessages();
      pollRef.current = setInterval(loadMessages, POLL_INTERVAL);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [conversationId]),
  );

  const handleSend = async () => {
    if (!text.trim() || !conversationId || sending) return;

    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user?.id || '',
      content,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const msg = await chatService.sendMessage(conversationId, content);
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? msg : m)));
    } catch {
      // Remover mensagem temp em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setText(content); // Restaurar texto
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.sender_id === user?.id;

    // Mostrar separador de data
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDate = !prevMsg ||
      new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>{item.content}</Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
              {formatTime(item.created_at)}
            </Text>
            {isMe && (
              <Ionicons
                name={item.read_at ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.read_at ? '#34B7F1' : 'rgba(255,255,255,0.6)'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Envie a primeira mensagem!</Text>
              </View>
            }
          />

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Digite uma mensagem..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: { padding: SPACING.xs, marginRight: SPACING.sm },
  headerName: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.semibold, color: COLORS.textPrimary, flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: SPACING.sm },
  messagesList: { padding: SPACING.md, flexGrow: 1 },
  dateHeader: { alignItems: 'center', marginVertical: SPACING.md },
  dateText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textPrimary, lineHeight: 20 },
  myMessageText: { color: COLORS.white },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  messageTime: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  sendBtnDisabled: { backgroundColor: COLORS.textMuted },
});
