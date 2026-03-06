import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { professionalService } from '../../services/professionals';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

interface DashboardData {
  total_services: number;
  avg_rating: number;
  total_earnings: number;
  pending_bookings: number;
  quiz_approved: boolean;
  penalty_count: number;
  is_blocked: boolean;
  fibonacci_level: number;
}

interface OpportunitiesData {
  available_bookings: number;
  active_sindicos: number;
  avg_monthly_earnings: number;
  completed_last_30_days: number;
  active_professionals: number;
  platform_avg_rating: number;
  urgent_today?: number;
  weekend_bookings?: number;
}

export default function ProfissionalHome() {
  const { user } = useAuthStore();
  const router = useRouter();
  const firstName = user?.full_name?.split(' ')[0] || 'Profissional';

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunitiesData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [dashRes, oppRes] = await Promise.all([
        professionalService.getDashboard(),
        professionalService.getOpportunities(),
      ]);
      setDashboard(dashRes.data);
      setOpportunities(oppRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const quizApproved = dashboard?.quiz_approved ?? false;

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="sunset" opacity={0.12} heightFraction={0.3} position="bottom" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ol{'\u00e1'}, {firstName}!</Text>
            <Text style={styles.subtitle}>
              {quizApproved ? 'Veja suas oportunidades' : 'Complete seu onboarding'}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        {loading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
              <MaterialCommunityIcons name="briefcase-check" size={22} color={COLORS.success} />
              <Text style={styles.statValue}>{dashboard?.total_services ?? 0}</Text>
              <Text style={styles.statLabel}>Servi{'\u00e7'}os</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="star" size={22} color={COLORS.secondary} />
              <Text style={styles.statValue}>
                {(dashboard?.avg_rating ?? 0) > 0
                  ? Number(dashboard!.avg_rating).toFixed(1)
                  : '--'}
              </Text>
              <Text style={styles.statLabel}>Avalia{'\u00e7'}{'\u00e3'}o</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
              <MaterialCommunityIcons name="cash" size={22} color={COLORS.primary} />
              <Text style={styles.statValue}>
                R$ {(dashboard?.total_earnings ?? 0) > 0
                  ? Number(dashboard!.total_earnings).toFixed(0)
                  : '0'}
              </Text>
              <Text style={styles.statLabel}>Ganhos</Text>
            </View>
          </View>
        )}

        {/* ═══ OPPORTUNITIES SECTION ═══ */}
        {quizApproved && !loading && opportunities && (
          <View style={styles.section}>
            <View style={styles.oppHeader}>
              <Text style={styles.sectionTitle}>Oportunidades</Text>
              <View style={styles.oppLiveBadge}>
                <View style={styles.oppLiveDot} />
                <Text style={styles.oppLiveText}>Ao vivo</Text>
              </View>
            </View>

            <View style={styles.oppGrid}>
              <TouchableOpacity
                style={[styles.oppCard, styles.oppCardHighlight]}
                onPress={() => router.push('/(profissional)/jobs')}
                activeOpacity={0.7}
              >
                {/* Notification badge count */}
                {opportunities.available_bookings > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{opportunities.available_bookings}</Text>
                  </View>
                )}
                <View style={[styles.oppIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <MaterialCommunityIcons name="briefcase-clock" size={24} color={COLORS.success} />
                </View>
                <Text style={styles.oppValue}>{opportunities.available_bookings}</Text>
                <Text style={styles.oppLabel}>Di{'\u00e1'}rias dispon{'\u00ed'}veis</Text>
                {/* Urgency mini-badges */}
                <View style={styles.urgencyMiniRow}>
                  {(opportunities.urgent_today ?? 0) > 0 && (
                    <View style={styles.urgencyMiniBadge}>
                      <MaterialCommunityIcons name="lightning-bolt" size={10} color="#E65100" />
                      <Text style={styles.urgencyMiniText}>{opportunities.urgent_today} hoje</Text>
                    </View>
                  )}
                  {(opportunities.weekend_bookings ?? 0) > 0 && (
                    <View style={[styles.urgencyMiniBadge, { backgroundColor: '#EDE7F6' }]}>
                      <MaterialCommunityIcons name="calendar-weekend" size={10} color="#5E35B1" />
                      <Text style={[styles.urgencyMiniText, { color: '#5E35B1' }]}>{opportunities.weekend_bookings} fim de sem.</Text>
                    </View>
                  )}
                </View>
                {opportunities.available_bookings > 0 && (
                  <View style={styles.oppBadge}>
                    <Text style={styles.oppBadgeText}>Ver agora</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.oppCard}>
                <View style={[styles.oppIconBg, { backgroundColor: COLORS.primaryLight }]}>
                  <MaterialCommunityIcons name="office-building" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.oppValue}>{opportunities.active_sindicos}</Text>
                <Text style={styles.oppLabel}>S{'\u00ed'}ndicos ativos</Text>
              </View>

              <View style={styles.oppCard}>
                <View style={[styles.oppIconBg, { backgroundColor: COLORS.secondaryLight }]}>
                  <MaterialCommunityIcons name="chart-line" size={24} color={COLORS.secondary} />
                </View>
                <Text style={styles.oppValue}>
                  {opportunities.completed_last_30_days}
                </Text>
                <Text style={styles.oppLabel}>Di{'\u00e1'}rias (30 dias)</Text>
              </View>

              <View style={styles.oppCard}>
                <View style={[styles.oppIconBg, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="star" size={24} color={COLORS.secondary} />
                </View>
                <Text style={styles.oppValue}>
                  {opportunities.platform_avg_rating > 0
                    ? opportunities.platform_avg_rating.toFixed(1)
                    : '--'}
                </Text>
                <Text style={styles.oppLabel}>M{'\u00e9'}dia plataforma</Text>
              </View>
            </View>

            {/* Urgency Alerts */}
            {opportunities.available_bookings > 0 && (
              <TouchableOpacity
                style={styles.urgencyAlert}
                onPress={() => router.push('/(profissional)/jobs')}
                activeOpacity={0.7}
              >
                <View style={styles.urgencyDot} />
                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#E65100" />
                <Text style={styles.urgencyAlertText}>
                  <Text style={styles.urgencyBold}>{opportunities.available_bookings} di{'\u00e1'}ria{opportunities.available_bookings > 1 ? 's' : ''}</Text>
                  {' '}esperando aceita{'\u00e7'}{'\u00e3'}o na sua {'\u00e1'}rea
                </Text>
                <Feather name="chevron-right" size={16} color="#E65100" />
              </TouchableOpacity>
            )}

            {opportunities.avg_monthly_earnings > 0 && (
              <View style={styles.earningsBanner}>
                <MaterialCommunityIcons name="trending-up" size={20} color={COLORS.primary} />
                <Text style={styles.earningsBannerText}>
                  Profissionais ganham em m{'\u00e9'}dia{' '}
                  <Text style={styles.earningsBannerValue}>
                    R$ {opportunities.avg_monthly_earnings.toFixed(0)}
                  </Text>
                  {' '}na plataforma
                </Text>
              </View>
            )}

            {/* Demand indicator */}
            {opportunities.active_sindicos > 0 && (
              <View style={styles.demandBanner}>
                <MaterialCommunityIcons name="fire" size={18} color="#D84315" />
                <Text style={styles.demandText}>
                  Alta demanda: <Text style={styles.demandBold}>{opportunities.active_sindicos} s{'\u00ed'}ndico{opportunities.active_sindicos > 1 ? 's' : ''}</Text> buscando profissionais agora
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ PLATFORM TRUST BANNER ═══ */}
        {quizApproved && !loading && (
          <View style={styles.section}>
            <View style={styles.trustBanner}>
              <View style={styles.trustItem}>
                <MaterialCommunityIcons name="shield-check" size={18} color={COLORS.primary} />
                <Text style={styles.trustText}>Seguro incluso</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <MaterialCommunityIcons name="lock" size={18} color={COLORS.primary} />
                <Text style={styles.trustText}>Pagamento garantido</Text>
              </View>
              <View style={styles.trustDivider} />
              <View style={styles.trustItem}>
                <MaterialCommunityIcons name="check-decagram" size={18} color={COLORS.primary} />
                <Text style={styles.trustText}>Verificado</Text>
              </View>
            </View>
          </View>
        )}

        {/* Blocked Warning */}
        {dashboard?.is_blocked && (
          <View style={styles.section}>
            <View style={styles.blockedCard}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.blockedTitle}>Conta Bloqueada</Text>
                <Text style={styles.blockedText}>
                  Voc{'\u00ea'} atingiu {dashboard.penalty_count} infra{'\u00e7'}{'\u00f5'}es. Entre em contato com o suporte.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Pending Bookings Alert */}
        {(dashboard?.pending_bookings ?? 0) > 0 && (
          <TouchableOpacity
            style={styles.section}
            onPress={() => router.push('/(profissional)/jobs')}
            activeOpacity={0.7}
          >
            <View style={styles.pendingCard}>
              <View style={styles.pendingIconBg}>
                <MaterialCommunityIcons name="bell-ring" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>
                  {dashboard!.pending_bookings} di{'\u00e1'}ria{dashboard!.pending_bookings > 1 ? 's' : ''} pendente{dashboard!.pending_bookings > 1 ? 's' : ''}
                </Text>
                <Text style={styles.pendingText}>Toque para ver e aceitar</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Quiz Alert - only if not approved */}
        {!quizApproved && !loading && (
          <TouchableOpacity
            style={styles.section}
            onPress={() => router.push('/(profissional)/quiz')}
            activeOpacity={0.7}
          >
            <View style={styles.alertCard}>
              <View style={styles.alertIconBg}>
                <MaterialCommunityIcons name="school" size={24} color={COLORS.secondary} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Complete seu Onboarding</Text>
                <Text style={styles.alertText}>
                  Fa{'\u00e7'}a o Quiz de Postura e {'\u00c9'}tica para ativar seu perfil e come{'\u00e7'}ar a receber di{'\u00e1'}rias
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.secondary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Fibonacci Level Badge */}
        {(dashboard?.fibonacci_level ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.levelCard}>
              <MaterialCommunityIcons name="trophy" size={28} color={COLORS.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.levelTitle}>N{'\u00ed'}vel Fibonacci {dashboard!.fibonacci_level}</Text>
                <Text style={styles.levelText}>Continue fazendo servi{'\u00e7'}os para subir de n{'\u00ed'}vel</Text>
              </View>
            </View>
          </View>
        )}

        {/* Available Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Di{'\u00e1'}rias Dispon{'\u00ed'}veis</Text>
          {quizApproved ? (
            <TouchableOpacity
              style={styles.jobsCard}
              onPress={() => router.push('/(profissional)/jobs')}
            >
              <MaterialCommunityIcons name="briefcase-search-outline" size={36} color={COLORS.primary} />
              <Text style={styles.jobsText}>Ver di{'\u00e1'}rias dispon{'\u00ed'}veis</Text>
              <Feather name="arrow-right" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nenhuma di{'\u00e1'}ria dispon{'\u00ed'}vel</Text>
              <Text style={styles.emptySubtext}>
                Complete seu onboarding para ver oportunidades na sua regi{'\u00e3'}o
              </Text>
            </View>
          )}
        </View>

        {/* Tutorial Banner */}
        <TouchableOpacity
          style={styles.tutorialBanner}
          onPress={() => router.push({ pathname: '/onboarding', params: { role: 'PROFISSIONAL' } })}
        >
          <Feather name="play-circle" size={28} color={COLORS.white} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tutorialTitle}>Como funciona o CondoDaily?</Text>
            <Text style={styles.tutorialDesc}>Veja o tutorial completo para profissionais</Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.white} />
        </TouchableOpacity>

        {/* My Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meus Servi{'\u00e7'}os</Text>
          <TouchableOpacity
            style={styles.addServiceCard}
            onPress={() => router.push('/(profissional)/my-services')}
          >
            <Feather name="plus-circle" size={24} color={COLORS.primary} />
            <Text style={styles.addServiceText}>Gerenciar servi{'\u00e7'}os que voc{'\u00ea'} oferece</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
  },
  greeting: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  avatar: {
    width: 48, height: 48, borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },

  statsLoading: { paddingVertical: SPACING.xl, alignItems: 'center' },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.lg,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1, borderRadius: RADIUS.md, padding: SPACING.sm,
    alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center' },

  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.md },

  // ═══ OPPORTUNITIES ═══
  oppHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  oppLiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  oppLiveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success,
  },
  oppLiveText: { fontSize: 11, fontFamily: FONTS.semibold, color: COLORS.success },
  oppGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  oppCard: {
    width: '48%' as any,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', ...SHADOWS.sm,
    flexGrow: 1, flexBasis: '45%',
  },
  oppCardHighlight: {
    borderWidth: 2, borderColor: COLORS.primary,
  },
  oppIconBg: {
    width: 44, height: 44, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  oppValue: {
    fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold, color: COLORS.textPrimary,
  },
  oppLabel: {
    fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary,
    textAlign: 'center', marginTop: 2,
  },
  oppBadge: {
    marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  oppBadgeText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.white },
  notifBadge: {
    position: 'absolute', top: -6, right: -6, zIndex: 1,
    backgroundColor: '#E53935', borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5, borderWidth: 2, borderColor: COLORS.card,
  },
  notifBadgeText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.white },
  urgencyMiniRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6, justifyContent: 'center',
  },
  urgencyMiniBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FFF3E0', borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  urgencyMiniText: { fontSize: 9, fontFamily: FONTS.semibold, color: '#E65100' },
  earningsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primarySubtle, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  earningsBannerText: {
    flex: 1, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 20,
  },
  earningsBannerValue: {
    fontFamily: FONTS.bold, color: COLORS.primary,
  },

  // ═══ URGENCY ALERTS ═══
  urgencyAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF3E0', borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: '#E65100',
  },
  urgencyDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#E65100',
  },
  urgencyAlertText: {
    flex: 1, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: '#BF360C', lineHeight: 20,
  },
  urgencyBold: {
    fontFamily: FONTS.bold, color: '#E65100',
  },
  demandBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FBE9E7', borderRadius: RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.xs,
  },
  demandText: {
    flex: 1, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: '#BF360C', lineHeight: 18,
  },
  demandBold: {
    fontFamily: FONTS.bold,
  },

  // ═══ TRUST BANNER ═══
  trustBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { fontSize: 11, fontFamily: FONTS.semibold, color: COLORS.textSecondary },
  trustDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  // ═══ EXISTING STYLES ═══
  blockedCard: {
    backgroundColor: '#FDE8E8', borderRadius: RADIUS.md, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderLeftWidth: 4, borderLeftColor: COLORS.error,
  },
  blockedTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.error },
  blockedText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },

  pendingCard: {
    backgroundColor: COLORS.primarySubtle, borderRadius: RADIUS.md, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  pendingIconBg: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  pendingTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  pendingText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },

  alertCard: {
    backgroundColor: COLORS.secondaryLight, borderRadius: RADIUS.md, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: COLORS.secondary, gap: SPACING.sm,
  },
  alertIconBg: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondaryLight, justifyContent: 'center', alignItems: 'center',
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  alertText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2, lineHeight: 20 },

  levelCard: {
    backgroundColor: '#FFF8E7', borderRadius: RADIUS.md, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  levelTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  levelText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },

  jobsCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, ...SHADOWS.sm,
  },
  jobsText: { flex: 1, fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.primary },

  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm,
  },
  emptyText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptySubtext: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },

  addServiceCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.border,
    borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm,
  },
  addServiceText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.primary },

  tutorialBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.secondary, marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg, padding: SPACING.md,
    borderRadius: RADIUS.md, gap: SPACING.sm,
  },
  tutorialTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, color: COLORS.white },
  tutorialDesc: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});
