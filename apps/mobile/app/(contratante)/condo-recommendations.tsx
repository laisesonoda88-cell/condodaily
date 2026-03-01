import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { condoService } from '../../services/condos';
import { useCondoStore } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

interface ServiceRecommendation {
  category_id: string;
  name: string;
  slug: string;
  icon: string;
  reason: string;
  professional_count: number;
  prefer_weekend: boolean;
  weekend_professional_count: number;
}

interface MaintenanceItem {
  id: string;
  name: string;
  description: string;
  frequency: string;
  category_slug: string;
  icon: string;
  is_mandatory: boolean;
  last_done: string | null;
  next_due: string | null;
  status: string;
}

const FREQ_LABELS: Record<string, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
  BIENAL: 'A cada 2 anos',
  QUINQUENAL: 'A cada 5 anos',
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  EM_DIA: { color: COLORS.success, label: 'Em dia', icon: 'checkmark-circle' },
  VENCENDO: { color: COLORS.secondary, label: 'Vencendo', icon: 'alert-circle' },
  VENCIDO: { color: COLORS.error, label: 'Vencido', icon: 'close-circle' },
  NAO_INFORMADO: { color: COLORS.textMuted, label: 'Nao informado', icon: 'help-circle' },
};

const ICON_MAP: Record<string, string> = {
  'shield-check': 'shield-check',
  'fire-extinguisher': 'fire-extinguisher',
  flash: 'flash',
  water: 'water',
  'water-outline': 'water-outline',
  bug: 'bug',
  elevator: 'elevator-passenger',
  pool: 'pool',
  leaf: 'leaf',
  'format-paint': 'format-paint',
  'shield-home': 'shield-home',
  broom: 'broom',
  eye: 'eye',
};

export default function CondoRecommendationsScreen() {
  const router = useRouter();
  const { condo_id } = useLocalSearchParams<{ condo_id?: string }>();
  const { activeCondo } = useCondoStore();

  const condoId = condo_id || activeCondo?.id;
  const condoNome = activeCondo?.nome_fantasia || activeCondo?.razao_social || 'Condominio';

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (condoId) loadData();
  }, [condoId]);

  const loadData = async () => {
    try {
      const result = await condoService.getRecommendations(condoId!);
      if (result.success) {
        setRecommendations(result.data.service_recommendations || []);
        setMaintenanceItems(result.data.maintenance_checklist || []);
      }
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar recomendacoes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCategory = (slug: string) => {
    router.push({ pathname: '/(contratante)/search', params: { category: slug } });
  };

  const handleMarkDone = (itemId: string) => {
    setShowDatePicker(itemId);
    setSelectedDate(new Date());
  };

  const handleDateConfirm = async (date: Date) => {
    const itemId = showDatePicker;
    setShowDatePicker(null);
    if (!itemId || !condoId) return;

    try {
      await condoService.updateMaintenanceItem(condoId, itemId, date.toISOString());
      await loadData(); // Recarregar lista
    } catch {
      Alert.alert('Erro', 'Nao foi possivel atualizar');
    }
  };

  const mandatoryItems = maintenanceItems.filter((i) => i.is_mandatory);
  const recommendedItems = maintenanceItems.filter((i) => !i.is_mandatory);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Analisando seu condominio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="sparkles" size={32} color={COLORS.secondary} />
          <Text style={styles.title}>Recomendacoes</Text>
          <Text style={styles.subtitle}>
            Baseado nas areas do {condoNome}
          </Text>
        </View>

        {/* ═══ RECOMENDAÇÕES DE SERVIÇO ═══ */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicos Recomendados</Text>

            {recommendations.map((rec) => (
              <TouchableOpacity
                key={rec.slug}
                style={styles.recCard}
                onPress={() => handleSearchCategory(rec.slug)}
                activeOpacity={0.7}
              >
                <View style={styles.recIconBg}>
                  <MaterialCommunityIcons
                    name={(ICON_MAP[rec.icon] || 'wrench') as any}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.recContent}>
                  <Text style={styles.recName}>{rec.name}</Text>
                  <Text style={styles.recReason}>{rec.reason}</Text>
                  <View style={styles.recMeta}>
                    <Text style={styles.recCount}>
                      {rec.professional_count} profissiona{rec.professional_count !== 1 ? 'is' : 'l'}
                    </Text>
                    {rec.prefer_weekend && rec.weekend_professional_count > 0 && (
                      <View style={styles.weekendBadge}>
                        <Feather name="calendar" size={12} color={COLORS.secondary} />
                        <Text style={styles.weekendText}>
                          {rec.weekend_professional_count} fim de semana
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ═══ MANUTENÇÕES OBRIGATÓRIAS ═══ */}
        {mandatoryItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.sectionTitle}>Manutencoes Obrigatorias</Text>
            </View>

            {mandatoryItems.map((item) => {
              const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.NAO_INFORMADO;
              return (
                <View key={item.id} style={styles.maintCard}>
                  <View style={styles.maintHeader}>
                    <MaterialCommunityIcons
                      name={(ICON_MAP[item.icon] || 'wrench') as any}
                      size={20}
                      color={COLORS.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.maintName}>{item.name}</Text>
                      <Text style={styles.maintFreq}>
                        Frequencia: {FREQ_LABELS[item.frequency] || item.frequency}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConf.color + '20' }]}>
                      <Ionicons name={statusConf.icon as any} size={14} color={statusConf.color} />
                      <Text style={[styles.statusText, { color: statusConf.color }]}>
                        {statusConf.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.maintDesc}>{item.description}</Text>
                  <View style={styles.maintActions}>
                    <TouchableOpacity
                      style={styles.markDoneBtn}
                      onPress={() => handleMarkDone(item.id)}
                    >
                      <Feather name="check-circle" size={16} color={COLORS.success} />
                      <Text style={styles.markDoneText}>Esta em dia</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quoteBtn}
                      onPress={() => handleSearchCategory(item.category_slug)}
                    >
                      <Feather name="search" size={16} color={COLORS.primary} />
                      <Text style={styles.quoteBtnText}>Cotar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ MANUTENÇÕES RECOMENDADAS ═══ */}
        {recommendedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="bookmark" size={20} color={COLORS.secondary} />
              <Text style={styles.sectionTitle}>Manutencoes Recomendadas</Text>
            </View>

            {recommendedItems.map((item) => {
              const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.NAO_INFORMADO;
              return (
                <View key={item.id} style={styles.maintCard}>
                  <View style={styles.maintHeader}>
                    <MaterialCommunityIcons
                      name={(ICON_MAP[item.icon] || 'wrench') as any}
                      size={20}
                      color={COLORS.secondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.maintName}>{item.name}</Text>
                      <Text style={styles.maintFreq}>
                        Frequencia: {FREQ_LABELS[item.frequency] || item.frequency}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConf.color + '20' }]}>
                      <Ionicons name={statusConf.icon as any} size={14} color={statusConf.color} />
                      <Text style={[styles.statusText, { color: statusConf.color }]}>
                        {statusConf.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.maintActions}>
                    <TouchableOpacity
                      style={styles.markDoneBtn}
                      onPress={() => handleMarkDone(item.id)}
                    >
                      <Feather name="check-circle" size={16} color={COLORS.success} />
                      <Text style={styles.markDoneText}>Esta em dia</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quoteBtn}
                      onPress={() => handleSearchCategory(item.category_slug)}
                    >
                      <Feather name="search" size={16} color={COLORS.primary} />
                      <Text style={styles.quoteBtnText}>Cotar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Botão Ir para Home */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/(contratante)/home')}
        >
          <Text style={styles.homeButtonText}>Ir para Home</Text>
          <Feather name="arrow-right" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </ScrollView>

      {/* DatePicker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event, date) => {
            if (event.type === 'dismissed') {
              setShowDatePicker(null);
              return;
            }
            if (date) handleDateConfirm(date);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  loadingText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontFamily: FONTS.regular },

  header: {
    alignItems: 'center', paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl, paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading,
    color: COLORS.textPrimary, marginTop: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md, fontFamily: FONTS.regular,
    color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center',
  },

  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONTS.sizes.lg, fontFamily: FONTS.heading,
    color: COLORS.textPrimary, marginBottom: SPACING.md,
  },

  // ─── Recommendation Cards ───
  recCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  recIconBg: {
    width: 44, height: 44, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  recContent: { flex: 1 },
  recName: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  recReason: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  recMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  recCount: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, color: COLORS.primary },
  weekendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.secondaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  weekendText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, color: COLORS.secondary },

  // ─── Maintenance Cards ───
  maintCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  maintHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  maintName: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  maintFreq: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  maintDesc: {
    fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular,
    color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },
  maintActions: {
    flexDirection: 'row', gap: SPACING.sm,
    marginTop: SPACING.sm, justifyContent: 'flex-end',
  },
  markDoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.success, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  markDoneText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, color: COLORS.success },
  quoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  quoteBtnText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, color: COLORS.primary },

  // ─── Home Button ───
  homeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg, marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  homeButtonText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.white },
});
