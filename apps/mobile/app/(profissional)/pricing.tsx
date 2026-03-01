import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { professionalService } from '../../services/professionals';

export default function PricingScreen() {
  const router = useRouter();
  const [hourlyRate, setHourlyRate] = useState('');
  const [serviceRadius, setServiceRadius] = useState('15');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialRate, setInitialRate] = useState('');
  const [initialRadius, setInitialRadius] = useState('15');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await professionalService.getProfile();
      const profile = res.data;
      if (profile?.professional_profile) {
        const rate = profile.professional_profile.hourly_rate
          ? String(Number(profile.professional_profile.hourly_rate))
          : '';
        const radius = profile.professional_profile.service_radius_km
          ? String(profile.professional_profile.service_radius_km)
          : '15';

        setHourlyRate(rate);
        setServiceRadius(radius);
        setInitialRate(rate);
        setInitialRadius(radius);
      }
    } catch {
      // Silently fail - use defaults
    } finally {
      setLoading(false);
    }
  };

  const checkChanges = (rate: string, radius: string) => {
    setHasChanges(rate !== initialRate || radius !== initialRadius);
  };

  const handleRateChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setHourlyRate(formatted);
    checkChanges(formatted, serviceRadius);
  };

  const handleRadiusChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned || '0');
    const clamped = Math.min(num, 50);
    const result = clamped > 0 ? String(clamped) : cleaned;
    setServiceRadius(result);
    checkChanges(hourlyRate, result);
  };

  const handleSave = async () => {
    const rate = parseFloat(hourlyRate);
    const radius = parseInt(serviceRadius);

    if (!rate || rate <= 0) {
      Alert.alert('Atenção', 'Informe um valor por hora válido');
      return;
    }

    if (!radius || radius < 1 || radius > 50) {
      Alert.alert('Atenção', 'O raio de atuação deve ser entre 1 e 50 km');
      return;
    }

    setSaving(true);
    try {
      await professionalService.updatePricing(rate, radius);
      setInitialRate(hourlyRate);
      setInitialRadius(serviceRadius);
      setHasChanges(false);
      Alert.alert('Sucesso', 'Sua precificação foi atualizada!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate estimated earnings
  const rate = parseFloat(hourlyRate) || 0;
  const dailyEstimate = rate * 8; // 8h/dia
  const monthlyEstimate = dailyEstimate * 22; // 22 dias úteis

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Precificação</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hourly Rate Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cash" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Valor por Hora</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Defina quanto você cobra por hora de serviço. Esse valor será exibido para os contratantes.
            </Text>

            <View style={styles.inputRow}>
              <Text style={styles.currencyLabel}>R$</Text>
              <TextInput
                style={styles.rateInput}
                value={hourlyRate}
                onChangeText={handleRateChange}
                placeholder="0.00"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="decimal-pad"
                maxLength={8}
              />
              <Text style={styles.perHourLabel}>/hora</Text>
            </View>
          </View>

          {/* Earnings Preview */}
          {rate > 0 && (
            <View style={styles.earningsCard}>
              <Text style={styles.earningsTitle}>Estimativa de Ganhos</Text>
              <View style={styles.earningsRow}>
                <View style={styles.earningItem}>
                  <Text style={styles.earningValue}>
                    R$ {dailyEstimate.toFixed(0)}
                  </Text>
                  <Text style={styles.earningLabel}>por dia (8h)</Text>
                </View>
                <View style={styles.earningDivider} />
                <View style={styles.earningItem}>
                  <Text style={styles.earningValue}>
                    R$ {monthlyEstimate.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={styles.earningLabel}>por mês (22 dias)</Text>
                </View>
              </View>
              <Text style={styles.earningsDisclaimer}>
                * Estimativa baseada em 8h/dia e 22 dias úteis. Valores reais podem variar.
              </Text>
            </View>
          )}

          {/* Service Radius Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Raio de Atuação</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Defina a distância máxima que você aceita se deslocar para realizar serviços.
            </Text>

            <View style={styles.radiusContainer}>
              <View style={styles.radiusInputRow}>
                <TextInput
                  style={styles.radiusInput}
                  value={serviceRadius}
                  onChangeText={handleRadiusChange}
                  placeholder="15"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.radiusUnit}>km</Text>
              </View>

              {/* Quick Select Buttons */}
              <View style={styles.quickSelectRow}>
                {[5, 10, 15, 25, 50].map((km) => (
                  <TouchableOpacity
                    key={km}
                    style={[
                      styles.quickSelectButton,
                      serviceRadius === String(km) && styles.quickSelectButtonActive,
                    ]}
                    onPress={() => {
                      setServiceRadius(String(km));
                      checkChanges(hourlyRate, String(km));
                    }}
                  >
                    <Text
                      style={[
                        styles.quickSelectText,
                        serviceRadius === String(km) && styles.quickSelectTextActive,
                      ]}
                    >
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Feather name="info" size={16} color={COLORS.info} />
            <Text style={styles.infoText}>
              A plataforma cobra 5% + R$5,00 de seguro por serviço. Esse valor já é descontado automaticamente do pagamento.
            </Text>
          </View>
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
                <Text style={styles.saveButtonText}>Salvar Precificação</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  currencyLabel: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
  },
  rateInput: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    textAlign: 'center',
  },
  perHourLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  earningsCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  earningsTitle: {
    fontFamily: FONTS.heading,
    fontSize: FONTS.sizes.md,
    color: COLORS.primaryDark,
    marginBottom: SPACING.md,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningValue: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primaryDark,
  },
  earningLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  earningDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    marginHorizontal: SPACING.md,
  },
  earningsDisclaimer: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
  radiusContainer: {
    gap: SPACING.md,
  },
  radiusInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    alignSelf: 'flex-start',
  },
  radiusInput: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    textAlign: 'center',
    minWidth: 60,
  },
  radiusUnit: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickSelectButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  quickSelectButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickSelectText: {
    fontFamily: FONTS.semibold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  quickSelectTextActive: {
    color: COLORS.white,
  },
  infoBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: '#E3F2FD',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.info,
    lineHeight: 20,
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
});
