import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { Button } from '../../components';
import { walletService } from '../../services/wallet';
import { useCondoStore } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

const TX_TYPE_MAP: Record<string, { label: string; iconName: string; color: string; sign: string }> = {
  DEPOSIT: { label: 'Deposito', iconName: 'cash-plus', color: COLORS.success, sign: '+' },
  DEBIT: { label: 'Pagamento', iconName: 'cash-minus', color: COLORS.error, sign: '-' },
  REFUND: { label: 'Reembolso', iconName: 'cash-refund', color: COLORS.info, sign: '+' },
};

export default function WalletScreen() {
  const router = useRouter();
  const { activeCondo } = useCondoStore();

  const [walletData, setWalletData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const condoId = activeCondo?.id;
      const [balanceRes, txRes, summaryRes] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(condoId),
        walletService.getSummary(condoId),
      ]);
      setWalletData(balanceRes.data);
      setTransactions(txRes.data || []);
      setSummary(summaryRes.data);
    } catch (error) { console.log('Erro ao carregar wallet:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [activeCondo?.id]));

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount.replace(',', '.'));
    if (!amount || amount < 10) { Alert.alert('Valor invalido', 'O deposito minimo e de R$ 10,00'); return; }
    if (!activeCondo) { Alert.alert('Erro', 'Nenhum condominio selecionado'); return; }
    setDepositing(true);
    try {
      const result = await walletService.deposit(activeCondo.id, amount);
      Alert.alert('Deposito Realizado!', `R$ ${amount.toFixed(2)} depositado via PIX.\nNovo saldo: R$ ${result.data.new_balance.toFixed(2)}`);
      setShowDepositModal(false); setDepositAmount(''); loadData();
    } catch (error: any) { Alert.alert('Erro', error.response?.data?.error || 'Erro ao depositar'); }
    finally { setDepositing(false); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const QUICK_AMOUNTS = [50, 100, 200, 500];

  if (loading) return (
    <SafeAreaView style={styles.container}><View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Carregando wallet...</Text>
    </View></SafeAreaView>
  );

  // Saldo filtrado pelo condo ativo
  const activeCondoWallet = activeCondo
    ? walletData?.condos?.find((c: any) => c.condo_id === activeCondo.id)
    : null;
  const displayBalance = activeCondoWallet ? activeCondoWallet.balance : (walletData?.total_balance || 0);
  const totalBalance = walletData?.total_balance || 0;
  const condos = walletData?.condos || [];
  const hasCondo = activeCondo !== null;

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <FlatList data={transactions} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        ListHeaderComponent={<>
          <View style={styles.header}>
            <Text style={styles.title}>CondoWallet</Text>
          </View>

          {/* Condo ativo banner */}
          {activeCondo && (
            <TouchableOpacity
              style={styles.condoBanner}
              onPress={() => router.push('/(contratante)/select-condo')}
            >
              <View style={styles.condoBannerLeft}>
                <MaterialCommunityIcons name="office-building" size={16} color={COLORS.primary} />
                <Text style={styles.condoBannerName} numberOfLines={1}>
                  {activeCondo.nome_fantasia || activeCondo.razao_social}
                </Text>
              </View>
              <View style={styles.condoBannerRight}>
                <Text style={styles.condoBannerSwitch}>Trocar</Text>
                <Feather name="chevron-right" size={14} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.balanceCard}>
            <MaterialCommunityIcons name="wallet" size={28} color="rgba(255,255,255,0.7)" />
            <Text style={styles.balanceLabel}>
              {activeCondo ? 'Saldo deste condominio' : 'Saldo total'}
            </Text>
            <Text style={styles.balanceValue}>R$ {displayBalance.toFixed(2).replace('.', ',')}</Text>
            {activeCondo && condos.length > 1 && totalBalance !== displayBalance && (
              <Text style={styles.totalBalanceHint}>
                Saldo total (todos condominios): R$ {totalBalance.toFixed(2).replace('.', ',')}
              </Text>
            )}
            {hasCondo && (
              <TouchableOpacity style={styles.depositButton} onPress={() => setShowDepositModal(true)} activeOpacity={0.7}>
                <MaterialCommunityIcons name="cash-plus" size={20} color={COLORS.primary} />
                <Text style={styles.depositButtonText}>Depositar via PIX</Text>
              </TouchableOpacity>
            )}
            {!hasCondo && <Text style={styles.noCondo}>Cadastre um condominio para usar a wallet</Text>}
          </View>
          {summary && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                Resumo do Mes{activeCondo ? ` - ${(activeCondo.nome_fantasia || activeCondo.razao_social).substring(0, 20)}` : ''}
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.month_bookings}</Text><Text style={styles.summaryLabel}>Diarias</Text></View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{Number(summary.month_hours).toFixed(0)}h</Text><Text style={styles.summaryLabel}>Horas</Text></View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: COLORS.error }]}>R$ {Number(summary.month_total_spent).toFixed(0)}</Text><Text style={styles.summaryLabel}>Gasto</Text></View>
              </View>
            </View>
          )}
          {condos.length > 1 && !activeCondo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wallets por Condominio</Text>
              {condos.map((c: any) => (
                <View key={c.condo_id} style={styles.condoRow}><Text style={styles.condoName} numberOfLines={1}>{c.condo_name}</Text><Text style={styles.condoBalance}>R$ {c.balance.toFixed(2)}</Text></View>
              ))}
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Extrato{activeCondo ? ` - ${(activeCondo.nome_fantasia || activeCondo.razao_social).substring(0, 20)}` : ''} {transactions.length > 0 ? `(${transactions.length})` : ''}
            </Text>
          </View>
        </>}
        renderItem={({ item }) => {
          const tx = TX_TYPE_MAP[item.type] || TX_TYPE_MAP.DEBIT;
          return (
            <View style={styles.txCard}>
              <View style={styles.txLeft}>
                <View style={[styles.txIconBg, { backgroundColor: tx.color + '15' }]}>
                  <MaterialCommunityIcons name={tx.iconName as any} size={20} color={tx.color} />
                </View>
                <View>
                  <Text style={styles.txLabel}>{tx.label}</Text>
                  <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
                  {!activeCondo && item.condo_name && <Text style={styles.txCondo} numberOfLines={1}>{item.condo_name}</Text>}
                </View>
              </View>
              <Text style={[styles.txAmount, { color: tx.color }]}>{tx.sign}R$ {Number(item.amount).toFixed(2)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="receipt" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhuma transacao</Text>
            <Text style={styles.emptySubtext}>Deposite creditos para comecar a contratar</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <Modal visible={showDepositModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Depositar via PIX</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}><Feather name="x" size={22} color={COLORS.textMuted} /></TouchableOpacity>
            </View>
            {activeCondo && (
              <View style={styles.modalCondoRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.modalCondo}>{activeCondo.nome_fantasia || activeCondo.razao_social}</Text>
              </View>
            )}
            <Text style={styles.quickLabel}>Valores rapidos</Text>
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity key={amt} style={[styles.quickBtn, depositAmount === String(amt) && styles.quickBtnActive]} onPress={() => setDepositAmount(String(amt))}>
                  <Text style={[styles.quickBtnText, depositAmount === String(amt) && styles.quickBtnTextActive]}>R$ {amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Ou digite o valor</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.amountPrefix}>R$</Text>
              <TextInput style={styles.amountInput} value={depositAmount} onChangeText={setDepositAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={COLORS.placeholder} />
            </View>
            <Text style={styles.minText}>Deposito minimo: R$ 10,00</Text>
            <View style={styles.paymentMethod}>
              <View style={styles.pixIconBg}><MaterialCommunityIcons name="cellphone" size={20} color={COLORS.primary} /></View>
              <View><Text style={styles.paymentLabel}>PIX</Text><Text style={styles.paymentDesc}>Confirmacao instantanea</Text></View>
            </View>
            <Button title={`Depositar R$ ${depositAmount ? parseFloat(depositAmount.replace(',', '.')).toFixed(2) : '0.00'}`} onPress={handleDeposit} variant="primary" size="lg" loading={depositing} style={styles.confirmBtn} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Condo banner
  condoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight || '#E8F5F2',
  },
  condoBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1 },
  condoBannerName: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  condoBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  condoBannerSwitch: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontFamily: FONTS.semibold },

  balanceCard: { margin: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', ...SHADOWS.lg },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, marginTop: SPACING.xs, fontFamily: FONTS.regular },
  balanceValue: { color: COLORS.white, fontSize: 36, fontFamily: FONTS.bold, marginVertical: SPACING.sm },
  totalBalanceHint: { color: 'rgba(255,255,255,0.5)', fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, marginBottom: SPACING.xs },
  depositButton: { marginTop: SPACING.sm, backgroundColor: COLORS.white, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  depositButtonText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.primary },
  noCondo: { color: 'rgba(255,255,255,0.6)', fontSize: FONTS.sizes.sm, marginTop: SPACING.sm, textAlign: 'center', fontFamily: FONTS.regular },
  summaryCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  summaryTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  summaryLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  condoRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.card, padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.xs },
  condoName: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, flex: 1, fontFamily: FONTS.regular },
  condoBalance: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, color: COLORS.primary },
  txCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: SPACING.lg, marginBottom: SPACING.xs, padding: SPACING.sm, borderRadius: RADIUS.sm, ...SHADOWS.sm },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  txIconBg: { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  txLabel: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  txDate: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: FONTS.regular },
  txCondo: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, maxWidth: 150, fontFamily: FONTS.regular },
  txAmount: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  emptyCard: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm },
  emptyText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptySubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center', fontFamily: FONTS.regular },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  modalCondoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
  modalCondo: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  quickLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontFamily: FONTS.regular },
  quickAmounts: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  quickBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  quickBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  quickBtnText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  quickBtnTextActive: { color: COLORS.white },
  inputLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs, fontFamily: FONTS.regular },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, marginBottom: SPACING.xs },
  amountPrefix: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginRight: SPACING.xs },
  amountInput: { flex: 1, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary, paddingVertical: SPACING.sm },
  minText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.md, fontFamily: FONTS.regular },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.background, padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.md },
  pixIconBg: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  paymentLabel: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  paymentDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  confirmBtn: { width: '100%' },
});
