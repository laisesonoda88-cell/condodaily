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
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { bookingService } from '../../services/bookings';
import { useCondoStore } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; iconName: string }> = {
  PENDING: { label: 'Aguardando', color: '#F5A623', bg: '#FFF8E7', iconName: 'clock-outline' },
  ACCEPTED: { label: 'Aceito', color: '#3498DB', bg: '#E8F4FD', iconName: 'check-circle-outline' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#27AE60', bg: '#E8F8F0', iconName: 'refresh' },
  COMPLETED: { label: 'Concluido', color: '#27AE60', bg: '#E8F8F0', iconName: 'check-circle' },
  CANCELLED: { label: 'Cancelado', color: '#E74C3C', bg: '#FDE8E8', iconName: 'close-circle-outline' },
};

type FilterKey = 'ALL' | 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'ACCEPTED', label: 'Aceitos' },
  { key: 'IN_PROGRESS', label: 'Ativos' },
  { key: 'COMPLETED', label: 'Concluidos' },
  { key: 'CANCELLED', label: 'Cancelados' },
];

export default function BookingsScreen() {
  const router = useRouter();
  const { activeCondo } = useCondoStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const loadBookings = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const result = await bookingService.getAll(activeCondo?.id);
      setBookings(result.data || []);
    } catch (error) {
      console.log('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [activeCondo?.id])
  );

  const filteredBookings = activeFilter === 'ALL'
    ? bookings
    : bookings.filter((b: any) => b.status === activeFilter);

  const activeCount = bookings.filter((b: any) =>
    ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(b.status)
  ).length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const renderBookingCard = ({ item }: { item: any }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.PENDING;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/(contratante)/booking-details',
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <MaterialCommunityIcons name={status.iconName as any} size={14} color={status.color} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.scheduled_date)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.cardText}>
              {item.scheduled_start} - {item.scheduled_end}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <MaterialCommunityIcons name="cash" size={16} color={COLORS.secondary} />
            <Text style={styles.cardText}>
              R$ {Number(item.gross_amount || 0).toFixed(2)}
            </Text>
          </View>

          {item.notes && (
            <View style={styles.cardRow}>
              <Feather name="file-text" size={15} color={COLORS.textSecondary} />
              <Text style={styles.cardNotes} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>Ver detalhes</Text>
          <Feather name="chevron-right" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando agendamentos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <View style={styles.header}>
        <Text style={styles.title}>Meus Servicos</Text>
        {activeCount > 0 && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{activeCount} ativo{activeCount > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Condo Banner */}
      {activeCondo && (
        <View style={styles.condoBanner}>
          <Feather name="home" size={14} color={COLORS.primary} />
          <Text style={styles.condoBannerText} numberOfLines={1}>
            {activeCondo.nome_fantasia || activeCondo.razao_social}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(contratante)/select-condo')}>
            <Text style={styles.condoBannerLink}>Trocar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filtersWrapper}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.key;
            const count = item.key === 'ALL'
              ? bookings.length
              : bookings.filter((b: any) => b.status === item.key).length;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(item.key)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {item.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {filteredBookings.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            {activeFilter === 'ALL'
              ? 'Nenhum servico agendado'
              : `Nenhum servico ${FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()}`}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeFilter === 'ALL'
              ? 'Busque profissionais e agende uma diaria!'
              : 'Mude o filtro para ver outros agendamentos'}
          </Text>
          {activeFilter === 'ALL' && (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(contratante)/search')}
            >
              <Feather name="search" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.ctaText}>Buscar Profissionais</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadBookings(true)}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  header: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  activeBadge: {
    backgroundColor: COLORS.success, paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs, borderRadius: RADIUS.full,
  },
  activeBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  filtersWrapper: { marginBottom: SPACING.sm },
  filtersContainer: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.medium },
  filterTextActive: { color: COLORS.white },
  listContainer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs, borderRadius: RADIUS.full, gap: 4,
  },
  statusLabel: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  cardDate: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.medium },
  cardBody: { gap: SPACING.xs },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardText: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontFamily: FONTS.medium },
  cardNotes: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flex: 1, fontFamily: FONTS.regular },
  cardFooter: {
    marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1,
    borderTopColor: COLORS.border, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'flex-end', gap: 4,
  },
  viewDetailsText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontFamily: FONTS.semibold },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyText: {
    fontSize: FONTS.sizes.lg, fontFamily: FONTS.semibold, color: COLORS.textPrimary,
    textAlign: 'center', marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    marginTop: SPACING.xs, textAlign: 'center', fontFamily: FONTS.regular,
  },
  ctaButton: {
    marginTop: SPACING.lg, backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center',
  },
  ctaText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold },
  condoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.primarySubtle, borderRadius: RADIUS.sm,
  },
  condoBannerText: { flex: 1, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, color: COLORS.textPrimary },
  condoBannerLink: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.primary },
});
