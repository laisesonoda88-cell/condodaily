import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { professionalService } from '../../services/professionals';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

interface ProfessionalService {
  name: string;
  slug: string;
  icon: string;
}

interface Professional {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  hourly_rate: string;
  avg_rating: number;
  total_services: number;
  service_radius_km: number;
  quiz_approved: boolean;
  services: ProfessionalService[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

const SORT_OPTIONS = [
  { value: 'rating', label: 'Melhor Avaliado' },
  { value: 'price_asc', label: 'Menor Preço' },
  { value: 'price_desc', label: 'Maior Preço' },
  { value: 'services', label: 'Mais Experiente' },
];

const PAGE_SIZE = 20;

export default function SearchScreen() {
  const router = useRouter();
  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam || null);
  const [sort, setSort] = useState('rating');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showSortModal, setShowSortModal] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Load categories once
  useEffect(() => {
    professionalService.getCategories().then((res) => {
      setCategories(res.data);
    }).catch(() => {});
  }, []);

  // Reload data when search/filter/sort changes
  useEffect(() => {
    setPage(1);
    setProfessionals([]);
    loadProfessionals(1, true);
  }, [debouncedQuery, selectedCategory, sort]);

  const loadProfessionals = useCallback(async (pageNum: number, isReset: boolean) => {
    if (isReset) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await professionalService.searchProfessionals({
        q: debouncedQuery || undefined,
        category: selectedCategory || undefined,
        sort,
        page: pageNum,
        limit: PAGE_SIZE,
      });

      if (isReset) {
        setProfessionals(res.data);
      } else {
        setProfessionals((prev) => [...prev, ...res.data]);
      }
      setTotal(res.total);
      setPage(pageNum);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [debouncedQuery, selectedCategory, sort]);

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    if (professionals.length >= total) return;
    loadProfessionals(page + 1, false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadProfessionals(1, true);
  };

  const handleCategoryPress = (slug: string | null) => {
    setSelectedCategory(slug);
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Ordenar';

  const renderProfessional = ({ item }: { item: Professional }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/(contratante)/professional-profile',
          params: { id: item.user_id, name: item.full_name },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          <Text style={styles.avatarText}>{item.full_name[0]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.full_name}</Text>
          <Text style={styles.cardBio} numberOfLines={1}>
            {item.bio || 'Profissional CondoDaily'}
          </Text>
        </View>
        <View style={styles.cardRating}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.secondary} />
            <Text style={styles.ratingText}>
              {item.avg_rating > 0 ? Number(item.avg_rating).toFixed(1) : 'Novo'}
            </Text>
          </View>
        </View>
      </View>

      {/* Service tags */}
      {item.services && item.services.length > 0 && (
        <View style={styles.serviceTags}>
          {item.services.slice(0, 3).map((svc, i) => (
            <View key={i} style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>{svc.name}</Text>
            </View>
          ))}
          {item.services.length > 3 && (
            <View style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>+{item.services.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Valor/hora</Text>
          <Text style={styles.detailValue}>
            R$ {Number(item.hourly_rate) > 0 ? Number(item.hourly_rate).toFixed(0) : '--'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Servicos</Text>
          <Text style={styles.detailValue}>{item.total_services}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Raio</Text>
          <Text style={styles.detailValue}>{item.service_radius_km} km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && professionals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Buscando profissionais...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Buscar Profissional</Text>
        <Text style={styles.resultCount}>
          {total} encontrado{total !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nome..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Feather name="x" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Button */}
      <View style={styles.sortRow}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
          <Feather name="sliders" size={16} color={COLORS.primary} />
          <Text style={styles.sortBtnText}>{currentSortLabel}</Text>
          <Feather name="chevron-down" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <FlatList
        horizontal
        data={[{ id: 'all', name: 'Todos', slug: 'todos', icon: '' }, ...categories]}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => {
          const isActive =
            (item.id === 'all' && !selectedCategory) || selectedCategory === item.slug;
          return (
            <TouchableOpacity
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => handleCategoryPress(item.id === 'all' ? null : item.slug)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Results */}
      <FlatList
        data={professionals}
        keyExtractor={(item) => item.id}
        renderItem={renderProfessional}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhum profissional encontrado</Text>
            <Text style={styles.emptySubtext}>Tente buscar por outro nome ou categoria</Text>
          </View>
        }
      />

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ordenar por</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  sort === option.value && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSort(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    sort === option.value && styles.modalOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sort === option.value && (
                  <Feather name="check" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, fontFamily: FONTS.regular },

  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: { padding: SPACING.xs },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary, flex: 1 },
  resultCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },

  searchBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
  },
  searchIcon: { marginRight: SPACING.xs },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  clearBtn: { padding: SPACING.xs },

  sortRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  sortBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontFamily: FONTS.medium },

  filters: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  filterChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.medium },
  filterTextActive: { color: COLORS.white },

  list: { paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl },

  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  cardAvatar: {
    width: 48, height: 48, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  cardInfo: { flex: 1, marginLeft: SPACING.sm },
  cardName: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  cardBio: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  cardRating: { backgroundColor: '#FFF8E7', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold },

  serviceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  serviceTag: {
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primarySubtle,
  },
  serviceTagText: { fontSize: 11, color: COLORS.primary, fontFamily: FONTS.medium },

  cardDetails: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm,
  },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: FONTS.regular },
  detailValue: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginTop: 2 },

  footerLoader: { paddingVertical: SPACING.lg, alignItems: 'center' },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl },
  emptyText: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, fontFamily: FONTS.regular },

  // Sort Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionActive: { borderBottomColor: COLORS.primary + '30' },
  modalOptionText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textPrimary },
  modalOptionTextActive: { fontFamily: FONTS.semibold, color: COLORS.primary },
});
