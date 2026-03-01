import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Button } from '../../components';
import { api } from '../../services/api';
import { professionalService } from '../../services/professionals';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

interface ProfessionalProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  hourly_rate: string;
  service_radius_km: number;
  avg_rating: number;
  total_services: number;
  fibonacci_level: number;
  quiz_approved: boolean;
  services: {
    category_name: string;
    category_slug: string;
    category_icon: string;
    is_certified: boolean;
  }[];
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
}

const ICON_MAP: Record<string, string> = {
  broom: 'trash-2',
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

export default function ProfessionalProfileScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, reviewsRes] = await Promise.all([
        professionalService.getProfessionalProfile(id!),
        api.get(`/reviews/professional/${id}`),
      ]);
      setProfile(profileRes.data);
      setReviews(reviewsRes.data.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.full_name || name || 'Profissional';
  const avgRating = profile?.avg_rating
    ? Number(profile.avg_rating).toFixed(1)
    : reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '--';
  const hourlyRate = profile?.hourly_rate ? Number(profile.hourly_rate) : 0;
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName[0]}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>Profissional CondoDaily</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={16} color={COLORS.secondary} />
                <Text style={styles.statValue}>{avgRating}</Text>
              </View>
              <Text style={styles.statLabel}>Avaliacao</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.total_services || 0}</Text>
              <Text style={styles.statLabel}>Servicos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reviews.length}</Text>
              <Text style={styles.statLabel}>Avaliacoes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={COLORS.success} />
              <Text style={styles.statLabel}>Verificado</Text>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        {profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre</Text>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {/* Info Cards */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Feather name="dollar-sign" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Valor/hora</Text>
              <Text style={styles.infoValue}>
                {hourlyRate > 0 ? `R$ ${hourlyRate.toFixed(0)}` : 'A combinar'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Feather name="map-pin" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Raio de atuacao</Text>
              <Text style={styles.infoValue}>{profile?.service_radius_km || 15} km</Text>
            </View>
          </View>
        </View>

        {/* Services Section */}
        {profile?.services && profile.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Servicos Oferecidos ({profile.services.length})
            </Text>
            <View style={styles.servicesGrid}>
              {profile.services.map((svc, i) => (
                <View key={i} style={styles.serviceChip}>
                  <Feather
                    name={(ICON_MAP[svc.category_icon] || 'tool') as any}
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.serviceChipText}>{svc.category_name}</Text>
                  {svc.is_certified && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={14}
                      color={COLORS.success}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionSection}>
          <Button
            title="Agendar Diaria"
            onPress={() =>
              router.push({
                pathname: '/(contratante)/new-booking',
                params: { professional_id: id, professional_name: displayName },
              })
            }
            size="lg"
            style={styles.bookButton}
          />
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliacoes ({reviews.length})</Text>

          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Text style={styles.emptyText}>Nenhuma avaliacao ainda</Text>
            </View>
          ) : (
            <>
              {displayedReviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                    <View style={styles.reviewRatingRow}>
                      {Array.from({ length: review.rating }, (_, i) => (
                        <Ionicons key={i} name="star" size={14} color={COLORS.secondary} />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              ))}

              {reviews.length > 5 && !showAllReviews && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setShowAllReviews(true)}
                >
                  <Text style={styles.showMoreText}>
                    Ver todas as {reviews.length} avaliacoes
                  </Text>
                  <Feather name="chevron-down" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  backButton: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },

  profileHeader: {
    alignItems: 'center', paddingVertical: SPACING.lg, marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, ...SHADOWS.sm,
  },
  avatar: {
    width: 80, height: 80, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },
  name: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  role: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg,
    paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
    width: '90%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.md },

  bioCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm,
  },
  bioText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22, fontFamily: FONTS.regular },

  infoRow: { flexDirection: 'row', gap: SPACING.sm },
  infoCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm,
  },
  infoLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: SPACING.xs, fontFamily: FONTS.regular },
  infoValue: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginTop: 2 },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  serviceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card, borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  serviceChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontFamily: FONTS.medium },

  actionSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  bookButton: { width: '100%' },

  emptyReviews: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center',
  },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontFamily: FONTS.regular },

  reviewCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  reviewerName: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  reviewRatingRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.xs, fontFamily: FONTS.regular },
  reviewDate: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: FONTS.regular },

  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: SPACING.md, marginBottom: SPACING.xl,
  },
  showMoreText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontFamily: FONTS.semibold },
});
