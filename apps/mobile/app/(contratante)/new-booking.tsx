import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components';
import { api } from '../../services/api';
import { condoService } from '../../services/condos';
import { walletService } from '../../services/wallet';
import { useCondoStore } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface EstimationData {
  condo_id: string;
  category: string;
  metragem_total: number;
  m2_por_hora: number;
  horas_recomendadas: number;
  min_horas: number;
  max_horas: number;
  tipo_recomendado: string;
  descricao: string;
}

export default function NewBookingScreen() {
  const router = useRouter();
  const { professional_id, professional_name } = useLocalSearchParams<{
    professional_id: string;
    professional_name: string;
  }>();

  const { activeCondo } = useCondoStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [contractAccepted, setContractAccepted] = useState(false);

  // Estimativa
  const [estimation, setEstimation] = useState<EstimationData | null>(null);
  const [loadingEstimation, setLoadingEstimation] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory && activeCondo?.id) {
      loadEstimation(activeCondo.id, selectedCategory);
    } else {
      setEstimation(null);
    }
  }, [selectedCategory, activeCondo?.id]);

  const loadData = async () => {
    try {
      const [catRes, walletRes] = await Promise.all([
        api.get('/categories'),
        walletService.getBalance().catch(() => ({ data: { total_balance: 0 } })),
      ]);
      setCategories(catRes.data.data);
      setWalletBalance(walletRes.data?.total_balance || 0);
    } catch {
      // silently fail
    }
  };

  const loadEstimation = async (condoId: string, categoryId: string) => {
    try {
      setLoadingEstimation(true);
      const result = await condoService.getEstimate(condoId, categoryId);
      setEstimation(result.data);
    } catch {
      setEstimation(null);
    } finally {
      setLoadingEstimation(false);
    }
  };

  const formatDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const formatTime = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const parseDate = (dateStr: string): string => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const calculateTotal = () => {
    if (!startTime || !endTime || !hourlyRate) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    if (isNaN(sH) || isNaN(eH)) return null;
    const hours = (eH + (eM || 0) / 60) - (sH + (sM || 0) / 60);
    if (hours <= 0) return null;
    const gross = hours * Number(hourlyRate);
    const platformFee = gross * 0.05;
    const insuranceFee = 5.0;
    return { hours, gross, platformFee, insuranceFee, total: gross + insuranceFee };
  };

  const calc = calculateTotal();

  // Verifica se horas selecionadas estão abaixo do mínimo/recomendado
  const getHoursWarning = (): { type: 'block' | 'warn' | null; message: string } => {
    if (!calc || !estimation) return { type: null, message: '' };
    if (estimation.min_horas > 0 && calc.hours < estimation.min_horas) {
      return {
        type: 'block',
        message: `Minimo de ${estimation.min_horas}h necessarias para este servico neste condominio (${estimation.metragem_total}m²).`,
      };
    }
    if (estimation.horas_recomendadas > 0 && calc.hours < estimation.horas_recomendadas) {
      return {
        type: 'warn',
        message: `Recomendamos pelo menos ${estimation.horas_recomendadas}h para ${estimation.category} neste condominio (${estimation.metragem_total}m²). Voce selecionou ${calc.hours.toFixed(1)}h.`,
      };
    }
    return { type: null, message: '' };
  };

  const hoursWarning = getHoursWarning();

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'MEIA_DIARIA': return 'Meia diaria (4h)';
      case 'DIARIA': return 'Diaria completa (8h)';
      case 'DIARIA_ESTENDIDA': return 'Diaria estendida (12h)';
      default: return tipo;
    }
  };

  const handleSubmit = () => {
    if (!activeCondo) {
      Alert.alert('Erro', 'Selecione um condominio primeiro');
      router.push('/(contratante)/select-condo');
      return;
    }

    if (!selectedCategory || !date || !startTime || !endTime || !hourlyRate) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatorios');
      return;
    }

    if (!calc || calc.hours <= 0) {
      Alert.alert('Erro', 'Horarios invalidos');
      return;
    }

    if (hoursWarning.type === 'block') {
      Alert.alert('Horas insuficientes', hoursWarning.message);
      return;
    }

    if (!contractAccepted) {
      Alert.alert('Contrato', 'Voce precisa aceitar os termos do contrato para prosseguir.');
      return;
    }

    router.push({
      pathname: '/(contratante)/checkout',
      params: {
        profissional_id: professional_id!,
        professional_name: professional_name || '',
        condo_id: activeCondo.id,
        category_id: selectedCategory,
        scheduled_date: parseDate(date),
        scheduled_start: startTime,
        scheduled_end: endTime,
        hourly_rate: hourlyRate,
        notes: notes || '',
        gross_amount: String(calc.gross),
        insurance_fee: String(calc.insuranceFee),
        total_amount: String(calc.total),
        platform_fee: String(calc.platformFee),
        hours: String(calc.hours),
        has_wallet_balance: String(walletBalance > 0),
        wallet_balance: String(walletBalance),
        accept_contract: 'true',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Novo Agendamento</Text>
        <Text style={styles.subtitle}>com {professional_name}</Text>

        {/* Condo Ativo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condominio</Text>
          {activeCondo ? (
            <TouchableOpacity
              style={styles.condoBanner}
              onPress={() => router.push('/(contratante)/select-condo')}
            >
              <View style={styles.condoBannerLeft}>
                <MaterialCommunityIcons name="office-building" size={20} color={COLORS.primary} />
                <View>
                  <Text style={styles.condoName}>
                    {activeCondo.nome_fantasia || activeCondo.razao_social}
                  </Text>
                  <Text style={styles.condoDetail}>
                    {activeCondo.cidade}/{activeCondo.uf}
                    {activeCondo.metragem_total ? ` - ${activeCondo.metragem_total}m²` : ''}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => router.push('/(contratante)/select-condo')}
            >
              <Text style={styles.alertText}>
                Selecione um condominio para continuar. Toque aqui.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Select Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Servico *</Text>
          <View style={styles.optionsRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.optionChip, selectedCategory === cat.id && styles.optionChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.optionText, selectedCategory === cat.id && styles.optionTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Estimation Card */}
        {loadingEstimation && (
          <View style={styles.estimationLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.estimationLoadingText}>Calculando estimativa...</Text>
          </View>
        )}

        {estimation && !loadingEstimation && (
          <View style={styles.estimationCard}>
            <View style={styles.estimationHeader}>
              <Ionicons name="bulb-outline" size={20} color={COLORS.secondary} />
              <Text style={styles.estimationTitle}>Estimativa Inteligente</Text>
            </View>
            <Text style={styles.estimationDescription}>
              Para {estimation.category} neste condominio ({estimation.metragem_total}m² de areas comuns):
            </Text>
            <View style={styles.estimationRecommendation}>
              <View style={styles.estimationBadge}>
                <Text style={styles.estimationBadgeText}>
                  {getTipoLabel(estimation.tipo_recomendado)}
                </Text>
              </View>
              <Text style={styles.estimationHours}>
                {estimation.horas_recomendadas}h recomendadas
              </Text>
            </View>
            {estimation.min_horas > 0 && (
              <Text style={styles.estimationMinText}>
                Minimo: {estimation.min_horas}h | Maximo: {estimation.max_horas}h
              </Text>
            )}
            {estimation.descricao && (
              <Text style={styles.estimationDesc}>{estimation.descricao}</Text>
            )}
          </View>
        )}

        {/* Date and Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e Horario *</Text>
          <Input
            label="Data"
            placeholder="DD/MM/AAAA"
            value={date}
            onChangeText={(t) => setDate(formatDate(t))}
            keyboardType="numeric"
            maxLength={10}
          />
          <View style={styles.row}>
            <Input
              label="Inicio"
              placeholder="08:00"
              value={startTime}
              onChangeText={(t) => setStartTime(formatTime(t))}
              keyboardType="numeric"
              maxLength={5}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Termino"
              placeholder="17:00"
              value={endTime}
              onChangeText={(t) => setEndTime(formatTime(t))}
              keyboardType="numeric"
              maxLength={5}
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        {/* Hours Warning */}
        {hoursWarning.type === 'warn' && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={18} color="#B8860B" />
            <Text style={styles.warningText}>{hoursWarning.message}</Text>
          </View>
        )}
        {hoursWarning.type === 'block' && (
          <View style={styles.blockCard}>
            <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.blockText}>{hoursWarning.message}</Text>
          </View>
        )}

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valor *</Text>
          <Input
            label="Valor por hora (R$)"
            placeholder="25"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            keyboardType="numeric"
          />
        </View>

        {/* Notes */}
        <Input
          label="Observacoes (opcional)"
          placeholder="Detalhes do servico..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Summary */}
        {calc && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duracao</Text>
              <Text style={styles.summaryValue}>{calc.hours.toFixed(1)}h</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Valor bruto</Text>
              <Text style={styles.summaryValue}>R$ {calc.gross.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxa de seguro</Text>
              <Text style={styles.summaryValue}>R$ {calc.insuranceFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.totalLabel}>Total a debitar</Text>
              <Text style={styles.totalValue}>R$ {calc.total.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Contract Acceptance */}
        <TouchableOpacity
          style={styles.contractRow}
          onPress={() => setContractAccepted(!contractAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, contractAccepted && styles.checkboxActive]}>
            {contractAccepted && (
              <Feather name="check" size={14} color={COLORS.white} />
            )}
          </View>
          <Text style={styles.contractText}>
            Aceito os termos do contrato de prestacao de servico, incluindo a politica de cancelamento (multa de 30% se cancelado com menos de 48h de antecedencia) e a obrigatoriedade do comparecimento.
          </Text>
        </TouchableOpacity>

        <Button
          title="Ir para pagamento"
          onPress={handleSubmit}
          disabled={
            !selectedCategory ||
            !activeCondo ||
            !date ||
            !startTime ||
            !endTime ||
            !hourlyRate ||
            !contractAccepted ||
            hoursWarning.type === 'block'
          }
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  backButton: { paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },
  title: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.lg, fontFamily: FONTS.regular },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.sm },

  // Condo banner
  condoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  condoBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  condoName: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  condoDetail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },

  // Options
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  optionChip: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  optionChipActive: { borderColor: COLORS.primary, backgroundColor: '#F0F5FF' },
  optionText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  optionTextActive: { color: COLORS.primary, fontFamily: FONTS.semibold },

  // Alert
  alertCard: {
    backgroundColor: '#FFF4E0', padding: SPACING.md, borderRadius: RADIUS.md,
    borderLeftWidth: 4, borderLeftColor: COLORS.secondary,
  },
  alertText: { fontSize: FONTS.sizes.sm, color: COLORS.secondaryDark, fontFamily: FONTS.regular },

  // Estimation
  estimationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  estimationLoadingText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  estimationCard: {
    backgroundColor: '#F2FAF8',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight || '#E8F5F2',
  },
  estimationHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  estimationTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.primary },
  estimationDescription: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular, marginBottom: SPACING.sm },
  estimationRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  estimationBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  estimationBadgeText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semibold, color: COLORS.white },
  estimationHours: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  estimationMinText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 4 },
  estimationDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular, marginTop: SPACING.xs, fontStyle: 'italic' },

  // Warning / Block
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#B8860B',
  },
  warningText: { fontSize: FONTS.sizes.sm, color: '#8B6914', fontFamily: FONTS.regular, flex: 1 },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  blockText: { fontSize: FONTS.sizes.sm, color: COLORS.error, fontFamily: FONTS.regular, flex: 1 },

  // Form
  row: { flexDirection: 'row', gap: SPACING.sm },
  halfInput: { flex: 1 },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.lg, ...SHADOWS.sm,
  },
  summaryTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  summaryLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  summaryValue: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  summaryTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.xs, paddingTop: SPACING.sm },
  totalLabel: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  totalValue: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.primary },

  // Contract
  contractRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  contractText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 18,
  },

  submitButton: { width: '100%', marginTop: SPACING.sm },
});
