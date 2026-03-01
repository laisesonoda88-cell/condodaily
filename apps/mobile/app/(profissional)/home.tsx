import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { professionalService } from '../../services/professionals';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

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

export default function ProfissionalHome() {
  const { user } = useAuthStore();
  const router = useRouter();
  const firstName = user?.full_name?.split(' ')[0] || 'Profissional';

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const loadDashboard = async () => {
    try {
      const res = await professionalService.getDashboard();
      setDashboard(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const quizApproved = dashboard?.quiz_approved ?? false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ola, {firstName}!</Text>
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
              <Text style={styles.statLabel}>Servicos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.secondaryLight }]}>
              <Ionicons name="star" size={22} color={COLORS.secondary} />
              <Text style={styles.statValue}>
                {(dashboard?.avg_rating ?? 0) > 0
                  ? Number(dashboard!.avg_rating).toFixed(1)
                  : '--'}
              </Text>
              <Text style={styles.statLabel}>Avaliacao</Text>
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

        {/* Blocked Warning */}
        {dashboard?.is_blocked && (
          <View style={styles.section}>
            <View style={styles.blockedCard}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.blockedTitle}>Conta Bloqueada</Text>
                <Text style={styles.blockedText}>
                  Voce atingiu {dashboard.penalty_count} infracoes. Entre em contato com o suporte.
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
                  {dashboard!.pending_bookings} diaria{dashboard!.pending_bookings > 1 ? 's' : ''} pendente{dashboard!.pending_bookings > 1 ? 's' : ''}
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
                  Faca o Quiz de Postura e Etica para ativar seu perfil e comecar a receber diarias
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
                <Text style={styles.levelTitle}>Nivel Fibonacci {dashboard!.fibonacci_level}</Text>
                <Text style={styles.levelText}>Continue fazendo servicos para subir de nivel</Text>
              </View>
            </View>
          </View>
        )}

        {/* Available Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diarias Disponiveis</Text>
          {quizApproved ? (
            <TouchableOpacity
              style={styles.jobsCard}
              onPress={() => router.push('/(profissional)/jobs')}
            >
              <MaterialCommunityIcons name="briefcase-search-outline" size={36} color={COLORS.primary} />
              <Text style={styles.jobsText}>Ver diarias disponiveis</Text>
              <Feather name="arrow-right" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nenhuma diaria disponivel</Text>
              <Text style={styles.emptySubtext}>
                Complete seu onboarding para ver oportunidades na sua regiao
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
          <Text style={styles.sectionTitle}>Meus Servicos</Text>
          <TouchableOpacity
            style={styles.addServiceCard}
            onPress={() => router.push('/(profissional)/my-services')}
          >
            <Feather name="plus-circle" size={24} color={COLORS.primary} />
            <Text style={styles.addServiceText}>Gerenciar servicos que voce oferece</Text>
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
