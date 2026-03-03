import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { Button } from '../../components';
import { bookingService } from '../../services/bookings';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; iconName: string }> = {
  PENDING: { label: 'Nova Solicitacao', color: '#F5A623', bg: '#FFF8E7', iconName: 'bell-outline' },
  ACCEPTED: { label: 'Aceito', color: '#3498DB', bg: '#E8F4FD', iconName: 'check-circle-outline' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#27AE60', bg: '#E8F8F0', iconName: 'refresh' },
  COMPLETED: { label: 'Concluido', color: '#27AE60', bg: '#E8F8F0', iconName: 'check-circle' },
  CANCELLED: { label: 'Cancelado', color: '#E74C3C', bg: '#FDE8E8', iconName: 'close-circle-outline' },
};

type TabKey = 'active' | 'history';

export default function JobsScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBookings = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const result = await bookingService.getAll();
      setBookings(result.data || []);
    } catch (error) {
      console.log('Erro ao carregar diarias:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadBookings(); }, []));

  const activeBookings = bookings.filter((b: any) => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(b.status));
  const historyBookings = bookings.filter((b: any) => ['COMPLETED', 'CANCELLED'].includes(b.status));
  const currentList = activeTab === 'active' ? activeBookings : historyBookings;
  const pendingCount = bookings.filter((b: any) => b.status === 'PENDING').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await bookingService.accept(id);
      Alert.alert('Sucesso!', 'Diaria aceita! Lembre-se de fazer o check-in no dia.');
      loadBookings();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao aceitar');
    } finally { setActionLoading(null); }
  };

  const handleReject = (id: string) => {
    Alert.alert('Recusar Diaria', 'Tem certeza que deseja recusar esta diaria?', [
      { text: 'Nao', style: 'cancel' },
      { text: 'Sim, recusar', style: 'destructive', onPress: async () => {
        setActionLoading(id);
        try { await bookingService.cancel(id); loadBookings(); }
        catch (error: any) { Alert.alert('Erro', error.response?.data?.error || 'Erro ao recusar'); }
        finally { setActionLoading(null); }
      }},
    ]);
  };

  const handleCheckIn = async (id: string) => {
    Alert.alert('Fazer Check-in', 'Confirma que voce chegou no local? O seguro sera ativado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar Check-in', onPress: async () => {
        setActionLoading(id);
        try {
          await bookingService.checkIn(id, -25.4284, -49.2733);
          Alert.alert('Check-in realizado!', 'Seguro ativado. Bom trabalho!');
          loadBookings();
        } catch (error: any) { Alert.alert('Erro', error.response?.data?.error || 'Erro ao fazer check-in'); }
        finally { setActionLoading(null); }
      }},
    ]);
  };

  const handleCheckOut = async (id: string) => {
    Alert.alert('Fazer Check-out', 'Confirma que finalizou o servico? O pagamento sera processado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar Check-out', onPress: async () => {
        setActionLoading(id);
        try {
          await bookingService.checkOut(id, -25.4284, -49.2733);
          Alert.alert('Check-out realizado!', 'Servico concluido! O pagamento sera processado.');
          loadBookings();
        } catch (error: any) { Alert.alert('Erro', error.response?.data?.error || 'Erro ao fazer check-out'); }
        finally { setActionLoading(null); }
      }},
    ]);
  };

  const renderBookingCard = ({ item }: { item: any }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.PENDING;
    const isLoading = actionLoading === item.id;

    return (
      <View style={[styles.card, item.status === 'PENDING' && styles.cardHighlight]}>
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
            <Text style={styles.cardRowText}>
              {item.scheduled_start} - {item.scheduled_end}
              {item.total_hours ? ` (${Number(item.total_hours).toFixed(1)}h)` : ''}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <MaterialCommunityIcons name="cash" size={16} color={COLORS.secondary} />
            <Text style={styles.cardRowText}>R$ {Number(item.hourly_rate || 0).toFixed(2)}/h</Text>
          </View>
          <View style={styles.cardRow}>
            <MaterialCommunityIcons name="cash-check" size={16} color={COLORS.success} />
            <Text style={[styles.cardRowText, { fontFamily: FONTS.bold, color: COLORS.success }]}>
              Voce recebe: R$ {Number(item.net_professional_amount || 0).toFixed(2)}
            </Text>
          </View>
          {item.notes && (
            <View style={styles.cardRow}>
              <Feather name="file-text" size={15} color={COLORS.textSecondary} />
              <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </View>

        {item.check_in_at && (
          <View style={styles.checkInfo}>
            <View style={styles.checkRow}>
              <MaterialCommunityIcons name="login" size={14} color={COLORS.success} />
              <Text style={styles.checkLabel}>Check-in: {new Date(item.check_in_at).toLocaleString('pt-BR')}</Text>
            </View>
            {item.check_out_at && (
              <View style={styles.checkRow}>
                <MaterialCommunityIcons name="logout" size={14} color={COLORS.error} />
                <Text style={styles.checkLabel}>Check-out: {new Date(item.check_out_at).toLocaleString('pt-BR')}</Text>
              </View>
            )}
          </View>
        )}

        {item.status === 'PENDING' && (
          <View style={styles.actions}>
            <Button title="Aceitar" onPress={() => handleAccept(item.id)} variant="primary" size="sm" loading={isLoading} style={styles.actionBtn} />
            <Button title="Recusar" onPress={() => handleReject(item.id)} variant="outline" size="sm" style={styles.actionBtn} textStyle={{ color: COLORS.error }} />
          </View>
        )}
        {item.status === 'ACCEPTED' && (
          <View style={styles.actions}>
            <Button title="Fazer Check-in" onPress={() => handleCheckIn(item.id)} variant="secondary" size="md" loading={isLoading} style={{ flex: 1 }} />
          </View>
        )}
        {item.status === 'IN_PROGRESS' && (
          <View style={styles.actions}>
            <Button title="Fazer Check-out" onPress={() => handleCheckOut(item.id)} variant="primary" size="md" loading={isLoading} style={{ flex: 1 }} />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loadingText}>Carregando diarias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="sunset" opacity={0.12} heightFraction={0.3} position="bottom" />
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Diarias</Text>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} nova{pendingCount > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.tabActive]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Ativas ({activeBookings.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.tabActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Historico ({historyBookings.length})</Text>
        </TouchableOpacity>
      </View>

      {currentList.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name={activeTab === 'active' ? 'clipboard-text-outline' : 'folder-outline'}
            size={56} color={COLORS.textMuted}
          />
          <Text style={styles.emptyText}>
            {activeTab === 'active' ? 'Nenhuma diaria ativa' : 'Nenhuma diaria no historico'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'active'
              ? 'Quando contratantes agendarem diarias com voce, elas aparecerao aqui'
              : 'Suas diarias concluidas e canceladas aparecerao aqui'}
          </Text>
        </View>
      ) : (
        <FlatList data={currentList} keyExtractor={(item) => item.id} renderItem={renderBookingCard}
          contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(true)} colors={[COLORS.secondary]} tintColor={COLORS.secondary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  pendingBadge: { backgroundColor: COLORS.secondary, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  pendingBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  tabs: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 4, ...SHADOWS.sm },
  tab: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.secondary },
  tabText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  listContainer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  cardHighlight: { borderLeftWidth: 4, borderLeftColor: COLORS.secondary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, gap: 4 },
  statusLabel: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  cardDate: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.medium },
  cardBody: { gap: SPACING.xs },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardRowText: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontFamily: FONTS.medium },
  cardNotes: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flex: 1, fontFamily: FONTS.regular },
  checkInfo: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  checkLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyText: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.semibold, color: COLORS.textPrimary, textAlign: 'center', marginTop: SPACING.md },
  emptySubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.regular },
});
