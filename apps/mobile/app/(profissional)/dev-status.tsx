import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

type Status = 'done' | 'partial' | 'pending';

interface Feature {
  name: string;
  status: Status;
  details: string;
}

interface FeatureGroup {
  title: string;
  icon: string;
  features: Feature[];
}

const MVP_FEATURES: FeatureGroup[] = [
  {
    title: 'Autenticacao',
    icon: 'lock',
    features: [
      { name: 'Login / Registro', status: 'done', details: 'JWT + refresh token' },
      { name: 'Onboarding', status: 'done', details: 'Telas por role' },
      { name: 'Splash + Auto-login', status: 'done', details: 'AsyncStorage' },
    ],
  },
  {
    title: 'Profissional',
    icon: 'briefcase',
    features: [
      { name: 'Quiz de Aprovacao', status: 'done', details: '5 perguntas, 80% para passar' },
      { name: 'Meus Servicos', status: 'done', details: 'Grid de categorias, multi-select' },
      { name: 'Precificacao + Raio', status: 'done', details: 'Valor/hora + km' },
      { name: 'Dados de Pagamento PIX', status: 'done', details: 'Chave PIX + banco' },
      { name: 'Home do Profissional', status: 'done', details: 'Dashboard basico' },
      { name: 'Aceitar/Recusar Diarias', status: 'partial', details: 'Backend OK, tela pendente' },
    ],
  },
  {
    title: 'Busca de Profissionais',
    icon: 'search',
    features: [
      { name: 'Busca por nome', status: 'done', details: 'ILIKE no backend + debounce' },
      { name: 'Filtro por categoria', status: 'done', details: 'Slug no backend' },
      { name: 'Ordenacao', status: 'done', details: 'Rating, preco, experiencia' },
      { name: 'Paginacao (infinite scroll)', status: 'done', details: '20 por pagina' },
      { name: 'Perfil completo', status: 'done', details: 'Bio, servicos, taxa, raio, reviews' },
      { name: 'Categorias na Home', status: 'done', details: 'Navega com filtro' },
    ],
  },
  {
    title: 'Agendamento',
    icon: 'calendar',
    features: [
      { name: 'Tela de novo booking', status: 'partial', details: 'Formulario basico existe' },
      { name: 'Checkout / Pagamento', status: 'done', details: 'PIX, cartao, boleto (MP)' },
      { name: 'Booking Details', status: 'partial', details: 'Tela existe, acoes pendentes' },
      { name: 'Confirmar Conclusao', status: 'partial', details: 'Backend OK, UI pendente' },
      { name: 'Historico de Servicos', status: 'partial', details: 'Lista basica' },
      { name: 'Avaliar Profissional', status: 'done', details: 'Estrelas + comentario' },
    ],
  },
  {
    title: 'Pagamentos (Mercado Pago)',
    icon: 'credit-card',
    features: [
      { name: 'PIX (QR Code)', status: 'done', details: 'Gera QR, polling status' },
      { name: 'Cartao de Credito', status: 'done', details: 'Tokenizacao via WebView' },
      { name: 'Boleto', status: 'done', details: 'Gera link + barcode' },
      { name: 'Webhook MP', status: 'done', details: 'HMAC-SHA256 verificado' },
      { name: 'Repasse ao Profissional', status: 'done', details: 'PIX auto apos confirmacao' },
      { name: 'CondoWallet', status: 'partial', details: 'Saldo, mas sem recarga real' },
    ],
  },
  {
    title: 'Notificacoes Push',
    icon: 'bell',
    features: [
      { name: 'Registro de Token', status: 'done', details: 'Expo Push + backend' },
      { name: 'Novo Booking', status: 'done', details: 'Notifica profissional' },
      { name: 'Aceite/Rejeicao', status: 'done', details: 'Notifica contratante' },
      { name: 'Pagamento', status: 'done', details: 'Aprovado/Falhado' },
      { name: 'Confirmacao mutua', status: 'done', details: 'Ambas partes' },
      { name: 'Deep linking', status: 'done', details: 'Abre booking-details' },
    ],
  },
  {
    title: 'Condominio',
    icon: 'home',
    features: [
      { name: 'Cadastro de Condo', status: 'done', details: 'CNPJ, endereco, porte' },
      { name: 'Anti-Habitualidade', status: 'done', details: 'Log 30 dias no backend' },
    ],
  },
  {
    title: 'Pendente no MVP',
    icon: 'alert-circle',
    features: [
      { name: 'Chat em tempo real', status: 'pending', details: 'WebSocket / Firebase' },
      { name: 'Upload de avatar', status: 'pending', details: 'S3 ou Cloudinary' },
      { name: 'Forgot password', status: 'pending', details: 'Email de reset' },
      { name: 'Tela de Booking Details completa', status: 'pending', details: 'Acoes + timeline' },
      { name: 'Geolocation na busca', status: 'pending', details: 'Filtrar por distancia' },
      { name: 'Termos de uso / Privacidade', status: 'pending', details: 'Legal docs' },
    ],
  },
];

function getStatusColor(status: Status) {
  switch (status) {
    case 'done': return COLORS.success;
    case 'partial': return COLORS.secondary;
    case 'pending': return COLORS.textMuted;
  }
}

function getStatusIcon(status: Status) {
  switch (status) {
    case 'done': return 'check-circle';
    case 'partial': return 'clock';
    case 'pending': return 'circle';
  }
}

function getStatusLabel(status: Status) {
  switch (status) {
    case 'done': return 'Pronto';
    case 'partial': return 'Parcial';
    case 'pending': return 'Pendente';
  }
}

export default function DevStatusScreen() {
  const router = useRouter();

  // Calculate progress
  const allFeatures = MVP_FEATURES.flatMap((g) => g.features);
  const doneCount = allFeatures.filter((f) => f.status === 'done').length;
  const partialCount = allFeatures.filter((f) => f.status === 'partial').length;
  const pendingCount = allFeatures.filter((f) => f.status === 'pending').length;
  const totalCount = allFeatures.length;
  const progressPercent = Math.round(((doneCount + partialCount * 0.5) / totalCount) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Status do MVP</Text>
            <Text style={styles.subtitle}>CondoDaily v0.1.0</Text>
          </View>
          <MaterialCommunityIcons name="rocket-launch-outline" size={28} color={COLORS.primary} />
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
            <Text style={styles.progressLabel}>do MVP concluido</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.statText}>{doneCount} prontos</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: COLORS.secondary }]} />
              <Text style={styles.statText}>{partialCount} parciais</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.statText}>{pendingCount} pendentes</Text>
            </View>
          </View>
        </View>

        {/* Feature Groups */}
        {MVP_FEATURES.map((group, gi) => {
          const groupDone = group.features.filter((f) => f.status === 'done').length;
          const groupTotal = group.features.length;

          return (
            <View key={gi} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Feather name={group.icon as any} size={20} color={COLORS.primary} />
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupCount}>
                  {groupDone}/{groupTotal}
                </Text>
              </View>

              {group.features.map((feature, fi) => (
                <View key={fi} style={styles.featureRow}>
                  <Feather
                    name={getStatusIcon(feature.status) as any}
                    size={16}
                    color={getStatusColor(feature.status)}
                  />
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureName}>{feature.name}</Text>
                    <Text style={styles.featureDetails}>{feature.details}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(feature.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(feature.status) }]}>
                      {getStatusLabel(feature.status)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* Tech Stack */}
        <View style={styles.techCard}>
          <Text style={styles.groupTitle}>Tech Stack</Text>
          <View style={styles.techGrid}>
            {[
              'React Native + Expo 54',
              'Expo Router 6',
              'Fastify 5 + TypeScript',
              'PostgreSQL + Drizzle ORM',
              'Mercado Pago SDK',
              'Zustand',
              'Expo Notifications',
              'JWT Auth',
            ].map((tech, i) => (
              <View key={i} style={styles.techChip}>
                <Text style={styles.techChipText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },

  progressCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.md,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, marginBottom: SPACING.md },
  progressPercent: { fontSize: 42, fontFamily: FONTS.heading, color: COLORS.primary },
  progressLabel: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  progressBarBg: {
    height: 12, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  statText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.medium },

  groupCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  groupTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary, flex: 1 },
  groupCount: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontFamily: FONTS.semibold },

  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  featureInfo: { flex: 1 },
  featureName: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, color: COLORS.textPrimary },
  featureDetails: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 1 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  statusText: { fontSize: 10, fontFamily: FONTS.semibold },

  techCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm,
  },
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  techChip: {
    backgroundColor: COLORS.primarySubtle, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  techChipText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontFamily: FONTS.medium },
});
