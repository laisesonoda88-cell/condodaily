import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useCondoStore } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

const CATEGORIES = [
  { icon: 'broom', name: 'Limpeza Geral', slug: 'limpeza-geral', color: COLORS.primary },
  { icon: 'pool', name: 'Piscina', slug: 'limpeza-piscina', color: COLORS.primaryDark },
  { icon: 'flower', name: 'Jardinagem', slug: 'jardinagem', color: COLORS.success },
  { icon: 'flash', name: 'Elétrica', slug: 'manutencao-eletrica', color: COLORS.secondary },
  { icon: 'water-pump', name: 'Hidráulica', slug: 'manutencao-hidraulica', color: COLORS.primaryDark },
  { icon: 'format-paint', name: 'Pintura', slug: 'pintura', color: COLORS.secondaryDark },
  { icon: 'window-closed-variant', name: 'Vidros', slug: 'limpeza-vidros', color: COLORS.primary },
  { icon: 'shield-account', name: 'Portaria', slug: 'portaria', color: COLORS.gray700 },
  { icon: 'elevator-passenger', name: 'Elevador', slug: 'manutencao-elevador', color: COLORS.primary },
  { icon: 'shield-check', name: 'Seguros', slug: 'seguros', color: COLORS.success },
  { icon: 'bug', name: 'Dedetização', slug: 'dedetizacao', color: COLORS.error },
  { icon: 'eye', name: 'Vigilância', slug: 'vigilancia', color: COLORS.gray700 },
];

export default function ContratanteHome() {
  const { user } = useAuthStore();
  const { activeCondo } = useCondoStore();
  const router = useRouter();
  const firstName = user?.full_name?.split(' ')[0] || 'Usuário';
  const condoNome = activeCondo?.nome_fantasia || activeCondo?.razao_social || '';

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Olá, {firstName}!</Text>
            <Text style={styles.subtitle}>O que precisa hoje?</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]}</Text>
          </View>
        </View>

        {/* Condomínio Ativo */}
        {activeCondo && (
          <TouchableOpacity
            style={styles.condoBanner}
            onPress={() => router.push('/(contratante)/select-condo')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="office-building" size={20} color={COLORS.primary} />
            <Text style={styles.condoBannerText} numberOfLines={1}>{condoNome}</Text>
            <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(contratante)/search')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="search" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>Buscar Profissional</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(contratante)/condo-setup')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.primaryLight }]}>
                <MaterialCommunityIcons name="office-building" size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.actionText}>Meu Condomínio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(contratante)/wallet')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.secondaryLight }]}>
                <Ionicons name="wallet" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionText}>CondoWallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(contratante)/bookings')}
            >
              <View style={[styles.actionIconBg, { backgroundColor: COLORS.primarySubtle }]}>
                <MaterialCommunityIcons name="history" size={24} color={COLORS.primaryDark} />
              </View>
              <Text style={styles.actionText}>Histórico</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços Ativos</Text>
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhum serviço ativo</Text>
            <Text style={styles.emptySubtext}>
              Busque profissionais para agendar uma diária
            </Text>
          </View>
        </View>

        {/* Tutorial Banner */}
        <TouchableOpacity
          style={styles.tutorialBanner}
          onPress={() => router.push({ pathname: '/onboarding', params: { role: 'CONTRATANTE' } })}
        >
          <Feather name="play-circle" size={28} color={COLORS.white} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tutorialTitle}>Como funciona o CondoDaily?</Text>
            <Text style={styles.tutorialDesc}>Veja o tutorial completo para contratantes</Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.white} />
        </TouchableOpacity>

        {/* Service Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorias de Serviço</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={i}
                style={styles.categoryChip}
                onPress={() =>
                  router.push({
                    pathname: '/(contratante)/search',
                    params: { category: cat.slug },
                  })
                }
              >
                <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '18' }]}>
                  <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  greeting: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  avatar: {
    width: 48, height: 48, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },

  condoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  condoBannerText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semibold,
    color: COLORS.primary,
  },

  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.md },

  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  actionCard: {
    width: '48%', backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm,
  },
  actionIconBg: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  actionText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary, textAlign: 'center' },

  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm,
  },
  emptyText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptySubtext: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },

  categoryChip: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    alignItems: 'center', marginRight: SPACING.sm, minWidth: 85,
    ...SHADOWS.sm,
  },
  categoryIconBg: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs,
  },
  categoryName: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, color: COLORS.textPrimary },

  tutorialBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg, padding: SPACING.md,
    borderRadius: RADIUS.md, gap: SPACING.sm,
  },
  tutorialTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, color: COLORS.white },
  tutorialDesc: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});
