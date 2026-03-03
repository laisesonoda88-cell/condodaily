import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CityBackground } from '../../components/CityBackground';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { authService } from '../../services/auth';

const CODE_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Start cooldown timer on mount (code was just sent during registration)
  useEffect(() => {
    setResendCooldown(COOLDOWN_SECONDS);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = useCallback(async (fullCode: string) => {
    if (!email) return;

    setLoading(true);
    try {
      await authService.verifyEmail(email, fullCode);
      setVerified(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Codigo invalido. Tente novamente.';
      Alert.alert('Erro', message);
      // Clear code and focus first input
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [email, router]);

  const handleCodeChange = useCallback((text: string, index: number) => {
    // Allow only digits
    const digit = text.replace(/\D/g, '');

    // Handle paste of full code
    if (digit.length > 1) {
      const digits = digit.slice(0, CODE_LENGTH).split('');
      const newCode = Array(CODE_LENGTH).fill('');
      digits.forEach((d, i) => {
        newCode[i] = d;
      });
      setCode(newCode);

      // Focus last filled input or the next empty one
      const focusIndex = Math.min(digits.length, CODE_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();

      // Auto-submit if all digits filled
      if (digits.length === CODE_LENGTH) {
        handleVerify(newCode.join(''));
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < CODE_LENGTH - 1) {
      // Advance to next input
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    const fullCode = newCode.join('');
    if (fullCode.length === CODE_LENGTH && newCode.every((d) => d !== '')) {
      handleVerify(fullCode);
    }
  }, [code, handleVerify]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace') {
      if (code[index] === '' && index > 0) {
        // Move to previous input and clear it
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  }, [code]);

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    try {
      await authService.resendVerification(email);
      setResendCooldown(COOLDOWN_SECONDS);
      Alert.alert('Enviado', 'Um novo codigo foi enviado para seu email.');
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Erro ao reenviar codigo. Tente novamente.';
      Alert.alert('Erro', message);
    }
  };

  if (verified) {
    return (
      <SafeAreaView style={styles.container}>
        <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Email verificado!</Text>
          <Text style={styles.successSubtitle}>
            Redirecionando para o login...
          </Text>
          <ActivityIndicator
            color={COLORS.primary}
            size="small"
            style={{ marginTop: SPACING.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Verifique seu email</Text>
            <Text style={styles.subtitle}>
              Enviamos um codigo de 6 digitos para
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <View style={styles.codeContainer}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  code[index] !== '' && styles.codeInputFilled,
                ]}
                value={code[index]}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={index === 0 ? CODE_LENGTH : 1}
                selectTextOnFocus
                autoFocus={index === 0}
                editable={!loading}
              />
            ))}
          </View>

          {loading && (
            <ActivityIndicator
              color={COLORS.primary}
              size="small"
              style={{ marginTop: SPACING.lg }}
            />
          )}

          <View style={styles.resendContainer}>
            <Text style={styles.resendLabel}>Nao recebeu o codigo?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0}
            >
              <Text
                style={[
                  styles.resendButton,
                  resendCooldown > 0 && styles.resendButtonDisabled,
                ]}
              >
                {resendCooldown > 0
                  ? `Reenviar codigo (${resendCooldown}s)`
                  : 'Reenviar codigo'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ja verificou?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}> Ir para login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    paddingVertical: SPACING.md,
  },
  backText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  header: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  emailText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semibold,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    textAlign: 'center',
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  codeInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.xs,
  },
  resendLabel: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  resendButton: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semibold,
    color: COLORS.primary,
  },
  resendButtonDisabled: {
    color: COLORS.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semibold,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successIconText: {
    fontSize: 36,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
  },
  successTitle: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
});
