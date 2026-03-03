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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components';
import { CityBackground } from '../../components/CityBackground';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { authService } from '../../services/auth';

const CODE_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputRefs = useRef<(TextInput | null)[]>([]);

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

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email e obrigatorio';
    else if (!email.includes('@')) newErrors.email = 'Email invalido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateReset = () => {
    const newErrors: Record<string, string> = {};
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) newErrors.code = 'Digite o codigo completo';
    if (!newPassword) newErrors.newPassword = 'Senha e obrigatoria';
    else if (newPassword.length < 6) newErrors.newPassword = 'Minimo 6 caracteres';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Senhas nao conferem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setResendCooldown(COOLDOWN_SECONDS);
      setStep('reset');
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Erro ao enviar codigo. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateReset()) return;

    setLoading(true);
    try {
      await authService.resetPassword(
        email.trim().toLowerCase(),
        code.join(''),
        newPassword,
      );
      Alert.alert('Sucesso', 'Senha alterada com sucesso!', [
        { text: 'Ir para login', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Erro ao redefinir senha. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = useCallback((text: string, index: number) => {
    const digit = text.replace(/\D/g, '');

    // Handle paste of full code
    if (digit.length > 1) {
      const digits = digit.slice(0, CODE_LENGTH).split('');
      const newCode = Array(CODE_LENGTH).fill('');
      digits.forEach((d, i) => {
        newCode[i] = d;
      });
      setCode(newCode);
      const focusIndex = Math.min(digits.length, CODE_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [code]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace') {
      if (code[index] === '' && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
  }, [code]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setResendCooldown(COOLDOWN_SECONDS);
      Alert.alert('Enviado', 'Um novo codigo foi enviado para seu email.');
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Erro ao reenviar codigo. Tente novamente.';
      Alert.alert('Erro', message);
    }
  };

  // Step 1: Enter email
  if (step === 'email') {
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
              <Text style={styles.title}>Esqueceu a senha?</Text>
              <Text style={styles.subtitle}>
                Digite seu email para receber um codigo de recuperacao
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              <Button
                title="Enviar codigo"
                onPress={handleSendCode}
                loading={loading}
                size="lg"
                style={styles.submitButton}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Lembrou a senha?</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.footerLink}> Voltar ao login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Step 2: Enter code + new password
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
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => {
              setStep('email');
              setCode(Array(CODE_LENGTH).fill(''));
              setNewPassword('');
              setConfirmPassword('');
              setErrors({});
            }}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Nova senha</Text>
            <Text style={styles.subtitle}>
              Digite o codigo enviado para
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <Text style={styles.codeLabel}>Codigo de verificacao</Text>
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
                  errors.code ? styles.codeInputError : null,
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
          {errors.code && (
            <Text style={styles.codeError}>{errors.code}</Text>
          )}

          <View style={styles.resendContainer}>
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

          <View style={styles.form}>
            <Input
              label="Nova senha"
              placeholder="Minimo 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
              error={errors.newPassword}
            />

            <Input
              label="Confirmar nova senha"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={errors.confirmPassword}
            />

            <Button
              title="Redefinir senha"
              onPress={handleResetPassword}
              loading={loading}
              size="lg"
              style={styles.submitButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Lembrou a senha?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}> Voltar ao login</Text>
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
  form: {
    gap: SPACING.xs,
  },
  submitButton: {
    width: '100%',
    marginTop: SPACING.md,
  },
  codeLabel: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
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
  codeInputError: {
    borderColor: COLORS.error,
  },
  codeError: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
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
});
