import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useCondoStore, type Condo } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

function PorteBadge({ porte }: { porte: string }) {
  const label = porte === 'P' ? 'Pequeno' : porte === 'M' ? 'Médio' : 'Grande';
  const color = porte === 'P' ? COLORS.info : porte === 'M' ? COLORS.secondary : COLORS.primary;

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function CondoCard({ condo, onSelect }: { condo: Condo; onSelect: () => void }) {
  const nome = condo.nome_fantasia || condo.razao_social;

  return (
    <TouchableOpacity style={styles.card} onPress={onSelect} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name="office-building" size={28} color={COLORS.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{nome}</Text>
        <Text style={styles.cardAddress} numberOfLines={1}>
          {condo.endereco}, {condo.numero} - {condo.cidade}/{condo.uf}
        </Text>
        <View style={styles.cardMeta}>
          <PorteBadge porte={condo.porte} />
          <Text style={styles.cardUnits}>{condo.num_unidades} unidades</Text>
          {condo.documento_analisado && (
            <View style={styles.analyzedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.analyzedText}>Analisado</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={22} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function SelectCondo() {
  const router = useRouter();
  const { condos, isLoading, loadCondos, setActiveCondo } = useCondoStore();

  useEffect(() => {
    loadCondos();
  }, []);

  const handleSelect = async (condo: Condo) => {
    await setActiveCondo(condo);
    router.replace('/(contratante)/home');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando condomínios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <View style={styles.header}>
        <MaterialCommunityIcons name="office-building-cog" size={32} color={COLORS.primary} />
        <Text style={styles.title}>Selecione o Condomínio</Text>
        <Text style={styles.subtitle}>Escolha qual condomínio deseja gerenciar</Text>
      </View>

      {condos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="office-building-plus" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum condomínio cadastrado</Text>
          <Text style={styles.emptySubtitle}>
            Cadastre seu primeiro condomínio para começar a contratar serviços
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(contratante)/condo-setup')}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
            <Text style={styles.addButtonText}>Cadastrar Condomínio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={condos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CondoCard condo={item} onSelect={() => handleSelect(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addCondoButton}
              onPress={() => router.push('/(contratante)/condo-setup')}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addCondoText}>Adicionar Condomínio</Text>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: SPACING.md },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  cardAddress: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, gap: SPACING.sm },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  badgeText: { fontSize: 11, fontFamily: FONTS.semibold },

  cardUnits: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },

  analyzedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  analyzedText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.success },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginTop: SPACING.lg },
  emptySubtitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  addButtonText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.white },

  addCondoButton: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: SPACING.sm,
  },
  addCondoText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.primary },
});
