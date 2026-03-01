import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { professionalService } from '../../services/professionals';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
}

interface MyService {
  id: string;
  category_id: string;
  is_certified: boolean;
  certified_at: string | null;
  category_name: string;
  category_slug: string;
  category_icon: string;
}

// Map category icon names to Feather icon names
const ICON_MAP: Record<string, string> = {
  broom: 'wind',
  pool: 'droplet',
  leaf: 'feather',
  zap: 'zap',
  droplet: 'droplet',
  paintbrush: 'edit-3',
  maximize: 'maximize',
  shield: 'shield',
  'party-popper': 'star',
  wrench: 'tool',
};

export default function MyServicesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [certifiedIds, setCertifiedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set());
  const [disponivelFimSemana, setDisponivelFimSemana] = useState(false);
  const [disponivelFeriados, setDisponivelFeriados] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catRes, myServRes] = await Promise.all([
        professionalService.getCategories(),
        professionalService.getMyServices(),
      ]);

      setCategories(catRes.data || []);

      const myServices: MyService[] = myServRes.data || [];
      const selected = new Set(myServices.map((s) => s.category_id));
      const certified = new Set(
        myServices.filter((s) => s.is_certified).map((s) => s.category_id)
      );

      setSelectedIds(selected);
      setInitialIds(new Set(selected));
      setCertifiedIds(certified);

      // Carregar disponibilidade
      const profileRes = await professionalService.getProfile();
      if (profileRes.data) {
        setDisponivelFimSemana(profileRes.data.disponivel_fim_semana ?? false);
        setDisponivelFeriados(profileRes.data.disponivel_feriados ?? false);
      }
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os servicos');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      // Check if there are changes compared to initial state
      const changed =
        next.size !== initialIds.size ||
        [...next].some((id) => !initialIds.has(id));
      setHasChanges(changed);

      return next;
    });
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um serviço');
      return;
    }

    setSaving(true);
    try {
      const services = [...selectedIds].map((category_id) => ({ category_id }));
      await professionalService.updateServices(services);
      await professionalService.updateAvailability(disponivelFimSemana, disponivelFeriados);

      setInitialIds(new Set(selectedIds));
      setHasChanges(false);
      Alert.alert('Sucesso', 'Seus serviços foram atualizados!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar os servicos. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando serviços...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Serviços</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Selecione os serviços que você oferece. Os contratantes verão seus serviços ao buscar profissionais.
      </Text>

      {/* Selected count */}
      <View style={styles.countBadge}>
        <Feather name="check-circle" size={16} color={COLORS.primary} />
        <Text style={styles.countText}>
          {selectedIds.size} {selectedIds.size === 1 ? 'serviço selecionado' : 'serviços selecionados'}
        </Text>
      </View>

      {/* Disponibilidade especial */}
      <View style={styles.availabilitySection}>
        <Text style={styles.availabilityTitle}>Disponibilidade Especial</Text>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Finais de semana</Text>
            <Text style={styles.toggleDesc}>Sabados e domingos</Text>
          </View>
          <Switch
            value={disponivelFimSemana}
            onValueChange={(v) => { setDisponivelFimSemana(v); setHasChanges(true); }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={disponivelFimSemana ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Feriados</Text>
            <Text style={styles.toggleDesc}>Feriados nacionais e locais</Text>
          </View>
          <Switch
            value={disponivelFeriados}
            onValueChange={(v) => { setDisponivelFeriados(v); setHasChanges(true); }}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={disponivelFeriados ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      </View>

      {/* Categories Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category) => {
          const isSelected = selectedIds.has(category.id);
          const isCertified = certifiedIds.has(category.id);
          const featherIcon = ICON_MAP[category.icon] || 'briefcase';

          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
              onPress={() => toggleCategory(category.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  isSelected ? styles.iconContainerSelected : styles.iconContainerDefault,
                ]}
              >
                <Feather
                  name={featherIcon as any}
                  size={24}
                  color={isSelected ? COLORS.white : COLORS.primary}
                />
              </View>

              <Text
                style={[styles.categoryName, isSelected && styles.categoryNameSelected]}
                numberOfLines={2}
              >
                {category.name}
              </Text>

              {isCertified && (
                <View style={styles.certifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                  <Text style={styles.certifiedText}>Certificado</Text>
                </View>
              )}

              {isSelected && (
                <View style={styles.checkMark}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Feather name="save" size={18} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Salvar Serviços</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  countText: {
    fontFamily: FONTS.semibold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  categoryCard: {
    width: '47.5%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
    ...SHADOWS.sm,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainerDefault: {
    backgroundColor: COLORS.primaryLight,
  },
  iconContainerSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryName: {
    fontFamily: FONTS.semibold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  categoryNameSelected: {
    color: COLORS.primaryDark,
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: SPACING.xs,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  certifiedText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.success,
  },
  checkMark: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  availabilitySection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  availabilityTitle: {
    fontFamily: FONTS.heading,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleLabel: {
    fontFamily: FONTS.semibold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
  },
  toggleDesc: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
