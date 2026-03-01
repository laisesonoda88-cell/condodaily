import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { walletService } from '../../services/wallet';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

export default function EarningsScreen() {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try { const result = await walletService.getEarnings(); setEarningsData(result.data); }
    catch (error) { console.log('Erro ao carregar ganhos:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const formatDate = (dateStr: string) => { if (!dateStr) return ''; const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; };

  if (loading) return (
    <SafeAreaView style={styles.container}><View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.secondary} /><Text style={styles.loadingText}>Carregando ganhos...</Text>
    </View></SafeAreaView>
  );

  const data = earningsData || { total_earnings: 0, total_services: 0, month: { earnings: 0, gross: 0, hours: 0, services: 0 }, history: [] };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={data.history} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[COLORS.secondary]} tintColor={COLORS.secondary} />}
        ListHeaderComponent={<>
          <View style={styles.header}><Text style={styles.title}>Meus Ganhos</Text></View>
          <View style={styles.earningsCard}>
            <MaterialCommunityIcons name="cash-multiple" size={28} color="rgba(255,255,255,0.7)" />
            <Text style={styles.earningsLabel}>Total acumulado</Text>
            <Text style={styles.earningsValue}>R$ {data.total_earnings.toFixed(2).replace('.', ',')}</Text>
            <Text style={styles.earningsSubtext}>{data.total_services} diaria{data.total_services !== 1 ? 's' : ''} concluida{data.total_services !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.monthCard}>
            <View style={styles.monthTitleRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.monthTitle}>Este Mes</Text>
            </View>
            <View style={styles.monthGrid}>
              <View style={styles.monthItem}><Text style={[styles.monthValue, { color: COLORS.success }]}>R$ {data.month.earnings.toFixed(0)}</Text><Text style={styles.monthLabel}>Liquido</Text></View>
              <View style={styles.monthDivider} />
              <View style={styles.monthItem}><Text style={styles.monthValue}>{data.month.services}</Text><Text style={styles.monthLabel}>Diarias</Text></View>
              <View style={styles.monthDivider} />
              <View style={styles.monthItem}><Text style={styles.monthValue}>{Number(data.month.hours).toFixed(0)}h</Text><Text style={styles.monthLabel}>Horas</Text></View>
              <View style={styles.monthDivider} />
              <View style={styles.monthItem}><Text style={styles.monthValue}>R$ {data.month.gross.toFixed(0)}</Text><Text style={styles.monthLabel}>Bruto</Text></View>
            </View>
          </View>
          <View style={styles.feeInfo}>
            <View style={styles.feeTitleRow}>
              <Feather name="info" size={16} color={COLORS.info} />
              <Text style={styles.feeTitle}>Como funciona</Text>
            </View>
            <View style={styles.feeRow}><Text style={styles.feeLabel}>Taxa da plataforma</Text><Text style={styles.feeValue}>5% do valor bruto</Text></View>
            <View style={styles.feeRow}><Text style={styles.feeLabel}>Seguro diaria</Text><Text style={styles.feeValue}>R$ 5,00 por diaria</Text></View>
            <View style={[styles.feeRow, { borderBottomWidth: 0 }]}><Text style={[styles.feeLabel, { fontFamily: FONTS.bold }]}>Voce recebe</Text><Text style={[styles.feeValue, { fontFamily: FONTS.bold, color: COLORS.success }]}>95% - R$ 5,00</Text></View>
          </View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Historico de Ganhos {data.history.length > 0 ? `(${data.history.length})` : ''}</Text></View>
        </>}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
              <Text style={[styles.historyNet, { color: COLORS.success }]}>+R$ {item.net.toFixed(2)}</Text>
            </View>
            <View style={styles.historyBody}>
              <Text style={styles.historyDetail}>{item.hours.toFixed(1)}h trabalhadas</Text>
              <Text style={styles.historyDetail}>Bruto: R$ {item.gross.toFixed(2)} | Taxa: -R$ {item.platform_fee.toFixed(2)} | Seguro: -R$ {item.insurance_fee.toFixed(2)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="cash-remove" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhum ganho registrado</Text>
            <Text style={styles.emptySubtext}>Complete diarias para comecar a receber</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  listContent: { paddingBottom: SPACING.xxl },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  earningsCard: { margin: SPACING.lg, backgroundColor: COLORS.secondary, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', ...SHADOWS.lg },
  earningsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm, marginTop: SPACING.xs, fontFamily: FONTS.regular },
  earningsValue: { color: COLORS.white, fontSize: 36, fontFamily: FONTS.bold, marginVertical: SPACING.sm },
  earningsSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  monthCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  monthTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  monthTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textSecondary },
  monthGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  monthItem: { alignItems: 'center' },
  monthValue: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  monthLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  monthDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  feeInfo: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  feeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  feeTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  feeLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  feeValue: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontFamily: FONTS.regular },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  historyCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.xs, backgroundColor: COLORS.card, borderRadius: RADIUS.sm, padding: SPACING.sm, ...SHADOWS.sm },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  historyDate: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  historyNet: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  historyBody: { gap: 2 },
  historyDetail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  emptyCard: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm },
  emptyText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptySubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center', fontFamily: FONTS.regular },
});
