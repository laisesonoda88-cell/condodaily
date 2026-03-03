import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Button } from '../../components';
import { LogoV2 } from '../../components/LogoV2';
import { CityBackground } from '../../components/CityBackground';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Subtle city skyline at the bottom */}
      <CityBackground variant="day" opacity={0.15} heightFraction={0.3} position="bottom" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <LogoV2 size="large" variant="horizontal" />
          </View>
          <Text style={styles.slogan}>A diária certa, na hora certa.</Text>
        </View>

        <View style={styles.middleSection}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.primaryLight }]}>
              <MaterialCommunityIcons name="office-building" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Para Condomínios</Text>
              <Text style={styles.featureDesc}>
                Encontre profissionais qualificados para serviços avulsos
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.secondaryLight }]}>
              <MaterialCommunityIcons name="hard-hat" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Para Profissionais</Text>
              <Text style={styles.featureDesc}>
                Encontre diárias com segurança e pagamento garantido
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.primaryLight }]}>
              <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Seguro Incluso</Text>
              <Text style={styles.featureDesc}>
                Cobertura durante todo o serviço via check-in/check-out
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Button
            title="Entrar"
            onPress={() => router.push('/(auth)/login')}
            variant="primary"
            size="lg"
            style={styles.button}
          />
          <Button
            title="Criar Conta"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
            size="lg"
            style={styles.button}
          />
          <TouchableOpacity
            style={styles.howItWorks}
            onPress={() => router.push('/(auth)/onboarding')}
          >
            <Feather name="play-circle" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.howItWorksText}>Como funciona?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logoImage: {
    width: 220,
    height: 80,
  },
  slogan: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  middleSection: {
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bottomSection: {
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  button: {
    width: '100%',
  },
  howItWorks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  howItWorksText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
});
