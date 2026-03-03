import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button, Input } from '../../components';
import { api } from '../../services/api';
import { condoService } from '../../services/condos';
import { professionalService } from '../../services/professionals';
import { walletService } from '../../services/wallet';
import { useCondoStore } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface EstimationData {
  disponivel?: boolean;
  mensagem?: string;
  condo_id?: string;
  category?: string;
  metragem_total?: number;
  m2_por_hora?: number;
  horas_recomendadas?: number;
  min_horas?: number;
  max_horas?: number;
  tipo_recomendado?: string;
  descricao?: string;
}

interface ProfessionalData {
  hourly_rate: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  full_name: string;
  services: { category_name: string; category_slug: string; category_icon: string; is_certified: boolean }[];
}

// Helper: gerar lista de horários (HH:MM) em intervalos de 30min
function generateTimeSlots(start: string, end: string): string[] {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  const slots: string[] = [];
  for (let m = startMin; m <= endMin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
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
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [contractAccepted, setContractAccepted] = useState(false);

  // Professional data
  const [proData, setProData] = useState<ProfessionalData | null>(null);
  const [loadingPro, setLoadingPro] = useState(true);

  // Date picker
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time selection
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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

  // Auto-preencher horários quando profissional carregar
  useEffect(() => {
    if (proData) {
      const inicio = proData.horario_inicio || '08:00';
      const fim = proData.horario_fim || '17:00';
      if (!startTime) setStartTime(inicio);
      if (!endTime) setEndTime(fim);
    }
  }, [proData]);

  const loadData = async () => {
    try {
      const [catRes, walletRes, proRes] = await Promise.all([
        api.get('/categories'),
        walletService.getBalance().catch(() => ({ data: { total_balance: 0 } })),
        professionalService.getProfessionalProfile(professional_id!),
      ]);
      setCategories(catRes.data.data);
      setWalletBalance(walletRes.data?.total_balance || 0);
      setProData(proRes.data);
    } catch {
      // silently fail
    } finally {
      setLoadingPro(false);
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

  // Hourly rate do profissional (read-only)
  const hourlyRate = proData ? Number(proData.hourly_rate) : 0;

  // Slots de horário disponíveis
  const proInicio = proData?.horario_inicio || '08:00';
  const proFim = proData?.horario_fim || '17:00';
  const timeSlots = generateTimeSlots(proInicio, proFim);

  // Slots válidos para término (depois do início selecionado)
  const endTimeSlots = startTime
    ? timeSlots.filter((t) => t > startTime)
    : [];

  // Formato de data BR
  const formatDateBR = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateISO = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const calculateTotal = () => {
    if (!startTime || !endTime || !hourlyRate) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    if (isNaN(sH) || isNaN(eH)) return null;
    const hours = (eH + (eM || 0) / 60) - (sH + (sM || 0) / 60);
    if (hours <= 0) return null;
    const gross = hours * hourlyRate;
    const platformFee = gross * 0.05;
    const insuranceFee = 5.0;
    return { hours, gross, platformFee, insuranceFee, total: gross + insuranceFee };
  };

  const calc = calculateTotal();

  // Verifica se horas selecionadas estão abaixo do mínimo/recomendado
  const getHoursWarning = (): { type: 'block' | 'warn' | null; message: string } => {
    if (!calc || !estimation || estimation.disponivel === false) return { type: null, message: '' };
    if ((estimation.min_horas ?? 0) > 0 && calc.hours < (estimation.min_horas ?? 0)) {
      return {
        type: 'block',
        message: `Minimo de ${estimation.min_horas}h necessarias para este servico neste condominio (${estimation.metragem_total ?? 0}m²). Aumente o horario de termino.`,
      };
    }
    if ((estimation.horas_recomendadas ?? 0) > 0 && calc.hours < (estimation.horas_recomendadas ?? 0)) {
      return {
        type: 'warn',
        message: `Recomendamos pelo menos ${estimation.horas_recomendadas}h para este servico neste condominio (${estimation.metragem_total ?? 0}m²). Voce selecionou ${calc.hours.toFixed(1)}h — o profissional pode nao conseguir entregar um bom servico com menos tempo.`,
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

    if (!selectedCategory || !selectedDate || !startTime || !endTime) {
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
        scheduled_date: formatDateISO(selectedDate),
        scheduled_start: startTime,
        scheduled_end: endTime,
        hourly_rate: String(hourlyRate),
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

  // Filtra categorias para mostrar somente as que o profissional oferece
  const proServiceSlugs = proData?.services?.map((s) => s.category_slug) || [];
  const filteredCategories = categories.filter((cat) => {
    // Precisa buscar por nome já que não temos slug nas categorias carregadas
    // Se proData ainda não carregou, mostra todas
    if (!proData || proServiceSlugs.length === 0) return true;
    return proData.services.some((s) => s.category_name === cat.name);
  });

  if (loadingPro) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando dados do profissional...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Novo Agendamento</Text>
        <Text style={styles.subtitle}>com {professional_name}</Text>

        {/* Professional Info Card */}
        <View style={styles.proCard}>
          <View style={styles.proAvatar}>
            <Text style={styles.proAvatarText}>
              {(professional_name || 'P')[0]}
            </Text>
          </View>
          <View style={styles.proInfo}>
            <Text style={styles.proName}>{professional_name}</Text>
            <View style={styles.proDetails}>
              <View style={styles.proTag}>
                <Feather name="dollar-sign" size={12} color={COLORS.primary} />
                <Text style={styles.proTagText}>
                  R$ {hourlyRate > 0 ? hourlyRate.toFixed(0) : '--'}/hora
                </Text>
              </View>
              <View style={styles.proTag}>
                <Feather name="clock" size={12} color={COLORS.primary} />
                <Text style={styles.proTagText}>
                  {proInicio} - {proFim}
                </Text>
              </View>
            </View>
          </View>
        </View>

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
            {filteredCategories.map((cat) => (
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

        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Feather name="calendar" size={20} color={COLORS.primary} />
            <Text style={[styles.dateButtonText, !selectedDate && styles.dateButtonPlaceholder]}>
              {selectedDate ? formatDateBR(selectedDate) : 'Selecione a data'}
            </Text>
            <Feather name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              minimumDate={new Date()}
              onChange={onDateChange}
              locale="pt-BR"
            />
          )}
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Horario *
            <Text style={styles.sectionHint}>  (Disponivel: {proInicio} - {proFim})</Text>
          </Text>

          {/* Start Time */}
          <Text style={styles.fieldLabel}>Inicio</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(!showStartPicker)}
          >
            <Feather name="clock" size={18} color={COLORS.primary} />
            <Text style={[styles.dateButtonText, !startTime && styles.dateButtonPlaceholder]}>
              {startTime || 'Selecione'}
            </Text>
            <Feather name={showStartPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showStartPicker && (
            <View style={styles.timeSlotsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeSlotsScroll}>
                {timeSlots.slice(0, -1).map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlot, startTime === slot && styles.timeSlotActive]}
                    onPress={() => {
                      setStartTime(slot);
                      setShowStartPicker(false);
                      // Se endTime é antes do novo start, resetar
                      if (endTime && endTime <= slot) {
                        const nextSlotIdx = timeSlots.indexOf(slot) + 1;
                        setEndTime(nextSlotIdx < timeSlots.length ? timeSlots[nextSlotIdx] : '');
                      }
                    }}
                  >
                    <Text style={[styles.timeSlotText, startTime === slot && styles.timeSlotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* End Time */}
          <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>Termino</Text>
          <TouchableOpacity
            style={[styles.dateButton, !startTime && styles.dateButtonDisabled]}
            onPress={() => startTime && setShowEndPicker(!showEndPicker)}
            disabled={!startTime}
          >
            <Feather name="clock" size={18} color={startTime ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.dateButtonText, !endTime && styles.dateButtonPlaceholder]}>
              {endTime || (startTime ? 'Selecione o termino' : 'Selecione o inicio primeiro')}
            </Text>
            <Feather name={showEndPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showEndPicker && endTimeSlots.length > 0 && (
            <View style={styles.timeSlotsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeSlotsScroll}>
                {endTimeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlot, endTime === slot && styles.timeSlotActive]}
                    onPress={() => {
                      setEndTime(slot);
                      setShowEndPicker(false);
                    }}
                  >
                    <Text style={[styles.timeSlotText, endTime === slot && styles.timeSlotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Duration info */}
          {calc && (
            <View style={styles.durationInfo}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.durationText}>
                Duracao: {calc.hours.toFixed(1)}h ({startTime} - {endTime})
              </Text>
            </View>
          )}
        </View>

        {/* Hours Warning */}
        {hoursWarning.type === 'warn' && (
          <View style={styles.warningCard}>
            <Ionicons name="bulb-outline" size={20} color="#B8860B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Dica</Text>
              <Text style={styles.warningText}>{hoursWarning.message}</Text>
              {estimation?.horas_recomendadas && (
                <Text style={styles.warningHint}>
                  Sugestao: agende pelo menos {estimation.horas_recomendadas}h para um servico de qualidade.
                </Text>
              )}
            </View>
          </View>
        )}
        {hoursWarning.type === 'block' && (
          <View style={styles.blockCard}>
            <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.blockTitle}>Tempo insuficiente</Text>
              <Text style={styles.blockText}>{hoursWarning.message}</Text>
            </View>
          </View>
        )}

        {/* Valor/hora (read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valor</Text>
          <View style={styles.rateCard}>
            <Feather name="dollar-sign" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rateLabel}>Valor por hora do profissional</Text>
              <Text style={styles.rateValue}>R$ {hourlyRate > 0 ? hourlyRate.toFixed(2) : '--'}</Text>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateBadgeText}>Definido pelo profissional</Text>
            </View>
          </View>
        </View>

        {/* Estimation Card */}
        {loadingEstimation && (
          <View style={styles.estimationLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.estimationLoadingText}>Calculando estimativa...</Text>
          </View>
        )}

        {estimation && !loadingEstimation && estimation.disponivel !== false && (
          <View style={styles.estimationCard}>
            <View style={styles.estimationHeader}>
              <Ionicons name="bulb-outline" size={20} color={COLORS.secondary} />
              <Text style={styles.estimationTitle}>Estimativa Inteligente</Text>
            </View>
            <Text style={styles.estimationDescription}>
              Para {estimation.category} neste condominio ({estimation.metragem_total ?? 0}m² de areas comuns):
            </Text>
            <View style={styles.estimationRecommendation}>
              <View style={styles.estimationBadge}>
                <Text style={styles.estimationBadgeText}>
                  {getTipoLabel(estimation.tipo_recomendado || '')}
                </Text>
              </View>
              <Text style={styles.estimationHours}>
                {estimation.horas_recomendadas}h recomendadas
              </Text>
            </View>
            {(estimation.min_horas ?? 0) > 0 && (
              <Text style={styles.estimationMinText}>
                Minimo: {estimation.min_horas}h | Maximo: {estimation.max_horas}h
              </Text>
            )}
            {estimation.descricao && (
              <Text style={styles.estimationDesc}>{estimation.descricao}</Text>
            )}
          </View>
        )}

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
              <Text style={styles.summaryLabel}>Valor/hora</Text>
              <Text style={styles.summaryValue}>R$ {hourlyRate.toFixed(2)}</Text>
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
            !selectedDate ||
            !startTime ||
            !endTime ||
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  loadingText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  backButton: { paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },
  title: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.md, fontFamily: FONTS.regular },

  // Professional card
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  proAvatar: {
    width: 48, height: 48, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  proAvatarText: { color: COLORS.primary, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  proInfo: { flex: 1 },
  proName: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  proDetails: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4, flexWrap: 'wrap' },
  proTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  proTagText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontFamily: FONTS.semibold },

  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sectionHint: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textMuted },
  fieldLabel: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.xs },

  // Condo banner
  condoBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary, ...SHADOWS.sm,
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

  // Date picker button
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  dateButtonDisabled: { opacity: 0.5 },
  dateButtonText: { flex: 1, fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textPrimary },
  dateButtonPlaceholder: { color: COLORS.placeholder },

  // Time slots
  timeSlotsContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...SHADOWS.sm,
  },
  timeSlotsScroll: { gap: SPACING.xs },
  timeSlot: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  timeSlotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  timeSlotText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textSecondary },
  timeSlotTextActive: { color: COLORS.primary },

  // Duration info
  durationInfo: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    marginTop: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm,
  },
  durationText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.primary },

  // Rate card (read-only)
  rateCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  rateLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: FONTS.regular },
  rateValue: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginTop: 2 },
  rateBadge: {
    backgroundColor: '#E8F5E9', paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.sm,
  },
  rateBadgeText: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.success },

  // Estimation
  estimationLoading: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.md, paddingVertical: SPACING.sm,
  },
  estimationLoadingText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  estimationCard: {
    backgroundColor: '#F2FAF8', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.primaryLight || '#E8F5F2',
  },
  estimationHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  estimationTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.primary },
  estimationDescription: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular, marginBottom: SPACING.sm },
  estimationRecommendation: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs,
  },
  estimationBadge: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  estimationBadgeText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semibold, color: COLORS.white },
  estimationHours: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  estimationMinText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 4 },
  estimationDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular, marginTop: SPACING.xs, fontStyle: 'italic' },

  // Warning / Block
  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: '#FFF8E1', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, borderLeftWidth: 4, borderLeftColor: '#F5A623',
  },
  warningTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, color: '#8B6914', marginBottom: 2 },
  warningText: { fontSize: FONTS.sizes.sm, color: '#8B6914', fontFamily: FONTS.regular, lineHeight: 20 },
  warningHint: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontFamily: FONTS.semibold, marginTop: SPACING.xs },
  blockCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: '#FFEBEE', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, borderLeftWidth: 4, borderLeftColor: COLORS.error,
  },
  blockTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, color: COLORS.error, marginBottom: 2 },
  blockText: { fontSize: FONTS.sizes.sm, color: COLORS.error, fontFamily: FONTS.regular, lineHeight: 20 },

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
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    marginBottom: SPACING.md, paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  contractText: {
    fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular,
    flex: 1, lineHeight: 18,
  },

  submitButton: { width: '100%', marginTop: SPACING.sm },
});
