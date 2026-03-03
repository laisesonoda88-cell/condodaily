import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { notificationService, Notification } from '../../services/notifications';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'BOOKING_NEW':
    case 'BOOKING_ACCEPTED':
    case 'BOOKING_CANCELLED':
      return 'clipboard-outline';
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_RELEASED':
      return 'cash-outline';
    case 'CHAT_MESSAGE':
      return 'chatbubble-outline';
    default:
      return 'notifications-outline';
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async (pageNum = 1, append = false) => {
    try {
      const result = await notificationService.getNotifications(pageNum);
      const items: Notification[] = result.data || [];
      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
      setHasMore(items.length >= 20);
      setPage(pageNum);
    } catch {
      // silently fail
    }
  };

  const loadUnreadCount = async () => {
    try {
      const result = await notificationService.getUnreadCount();
      setUnreadCount(result.data?.count || 0);
    } catch {
      // silently fail
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([loadNotifications(1), loadUnreadCount()]).finally(() =>
        setLoading(false)
      );
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(1), loadUnreadCount()]);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadNotifications(page + 1, true);
    setLoadingMore(false);
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.read_at) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently fail
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.read_at;
    const iconName = getTypeIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.notificationUnread]}
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.7}
      >
        {isUnread && <View style={styles.unreadDot} />}
        <View style={[styles.iconContainer, isUnread && styles.iconContainerUnread]}>
          <Ionicons
            name={iconName}
            size={22}
            color={isUnread ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text
            style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>{formatRelativeTime(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="notifications-outline" size={48} color={COLORS.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Nenhuma notificacao</Text>
        <Text style={styles.emptySubtitle}>
          Quando houver novidades, elas aparecerao aqui.
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificacoes</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Ionicons name="checkmark-done" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBanner} onPress={handleMarkAllAsRead}>
          <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
          <Text style={styles.markAllText}>Marcar todas como lidas</Text>
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={
            notifications.length === 0 ? styles.listEmpty : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.primaryLight,
    gap: SPACING.sm,
  },
  markAllText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  listEmpty: {
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm + 4,
  },
  notificationUnread: {
    backgroundColor: COLORS.primarySubtle,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  unreadDot: {
    position: 'absolute',
    top: SPACING.md + 2,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerUnread: {
    backgroundColor: COLORS.primaryLight,
  },
  notificationContent: {
    flex: 1,
    gap: 2,
  },
  notificationTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
  },
  notificationTitleUnread: {
    fontFamily: FONTS.bold,
  },
  notificationBody: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
});
