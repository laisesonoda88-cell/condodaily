import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Button } from '../../components';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

export default function RateServiceScreen() {
  const router = useRouter();
  const { booking_id, professional_id } = useLocalSearchParams<{
    booking_id: string;
    professional_id: string;
  }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Erro', 'Selecione uma avaliacao');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews', {
        booking_id,
        rating,
        comment: comment || undefined,
      });

      Alert.alert('Obrigado!', 'Sua avaliacao foi enviada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar avaliacao');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Feather name="arrow-left" size={20} color={COLORS.primary} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons name="star" size={56} color={COLORS.secondary} style={{ marginBottom: SPACING.md }} />
        <Text style={styles.title}>Avaliar Servico</Text>
        <Text style={styles.subtitle}>Como foi a experiencia com o profissional?</Text>

        {/* Star Rating */}
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              {star <= rating ? (
                <Ionicons name="star" size={36} color={COLORS.secondary} />
              ) : (
                <Ionicons name="star-outline" size={36} color={COLORS.border} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'Toque para avaliar' : rating <= 2 ? 'Pode melhorar' : rating <= 4 ? 'Bom servico' : 'Excelente!'}
        </Text>

        {/* Comment */}
        <TextInput
          style={styles.commentInput}
          placeholder="Deixe um comentario (opcional)..."
          placeholderTextColor={COLORS.placeholder}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Button
          title="Enviar Avaliacao"
          onPress={handleSubmit}
          loading={submitting}
          disabled={rating === 0}
          size="lg"
          style={styles.submitButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  title: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs, fontFamily: FONTS.regular },
  stars: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  ratingLabel: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.sm, fontFamily: FONTS.medium },
  commentInput: {
    width: '100%', minHeight: 100, backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    marginTop: SPACING.xl, fontFamily: FONTS.regular,
  },
  submitButton: { width: '100%', marginTop: SPACING.lg },
});
