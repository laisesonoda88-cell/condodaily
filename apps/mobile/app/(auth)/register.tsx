import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Input } from '../../components';
import { useAuthStore } from '../../stores/authStore';
import { CityBackground } from '../../components/CityBackground';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { authService } from '../../services/auth';
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, formatPhone as fmtPhone } from '@condodaily/shared';

type UserRole = 'CONTRATANTE' | 'PROFISSIONAL';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1); // 1: choose role, 2: form
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [documentType, setDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatDocument = (value: string) => {
    return documentType === 'CPF' ? formatCPF(value) : formatCNPJ(value);
  };

  const formatPhone = (value: string) => fmtPhone(value);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().split(' ').length < 2)
      newErrors.fullName = 'Informe nome e sobrenome';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = 'Email invalido';

    // Validação algorítmica de CPF/CNPJ (dígitos verificadores)
    if (documentType === 'CPF') {
      if (!validateCPF(document)) newErrors.document = 'CPF invalido';
    } else {
      if (!validateCNPJ(document)) newErrors.document = 'CNPJ invalido';
    }

    if (phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Telefone invalido';
    if (password.length < 6) newErrors.password = 'Minimo 6 caracteres';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Senhas nao conferem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!role || !validate()) return;

    setLoading(true);
    try {
      await authService.register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        cpf: document.replace(/\D/g, ''),
        document_type: documentType,
        phone: phone.replace(/\D/g, ''),
        role,
      });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: email.trim().toLowerCase() },
      });
    } catch (error: any) {
      const message =
        error.response?.data?.error || 'Erro ao criar conta. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Como voce quer usar o CondoDaily?</Text>
          </View>

          <View style={styles.roleCards}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'CONTRATANTE' && styles.roleCardSelected]}
              onPress={() => setRole('CONTRATANTE')}
            >
              <MaterialCommunityIcons name="office-building" size={40} color={role === 'CONTRATANTE' ? COLORS.primary : COLORS.textSecondary} style={{ marginBottom: SPACING.sm }} />
              <Text
                style={[
                  styles.roleTitle,
                  role === 'CONTRATANTE' && styles.roleTitleSelected,
                ]}
              >
                Sou Contratante
              </Text>
              <Text style={styles.roleDesc}>
                Síndico, administradora ou condomínio buscando profissionais
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'PROFISSIONAL' && styles.roleCardSelected]}
              onPress={() => setRole('PROFISSIONAL')}
            >
              <MaterialCommunityIcons name="hard-hat" size={40} color={role === 'PROFISSIONAL' ? COLORS.primary : COLORS.textSecondary} style={{ marginBottom: SPACING.sm }} />
              <Text
                style={[
                  styles.roleTitle,
                  role === 'PROFISSIONAL' && styles.roleTitleSelected,
                ]}
              >
                Sou Profissional
              </Text>
              <Text style={styles.roleDesc}>
                Prestador autonomo buscando diarias em condominios
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Continuar"
            onPress={() => setStep(2)}
            disabled={!role}
            size="lg"
            style={styles.continueButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Seus Dados</Text>
            <Text style={styles.subtitle}>
              {role === 'CONTRATANTE'
                ? 'Cadastro de contratante'
                : 'Cadastro de profissional'}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nome Completo"
              placeholder="Seu nome completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              error={errors.fullName}
            />

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            {role === 'CONTRATANTE' && (
              <View style={styles.documentTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.documentTypeButton,
                    documentType === 'CPF' && styles.documentTypeButtonActive,
                  ]}
                  onPress={() => {
                    setDocumentType('CPF');
                    setDocument('');
                  }}
                >
                  <Text
                    style={[
                      styles.documentTypeText,
                      documentType === 'CPF' && styles.documentTypeTextActive,
                    ]}
                  >
                    CPF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.documentTypeButton,
                    documentType === 'CNPJ' && styles.documentTypeButtonActive,
                  ]}
                  onPress={() => {
                    setDocumentType('CNPJ');
                    setDocument('');
                  }}
                >
                  <Text
                    style={[
                      styles.documentTypeText,
                      documentType === 'CNPJ' && styles.documentTypeTextActive,
                    ]}
                  >
                    CNPJ
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Input
              label={role === 'CONTRATANTE' ? documentType : 'CPF'}
              placeholder={documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
              value={document}
              onChangeText={(text) => setDocument(formatDocument(text))}
              keyboardType="numeric"
              maxLength={documentType === 'CNPJ' ? 18 : 14}
              error={errors.document}
            />

            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
              error={errors.phone}
            />

            <Input
              label="Senha"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
            />

            <Input
              label="Confirmar Senha"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={errors.confirmPassword}
            />

            <Text style={styles.termsText}>
              Ao criar sua conta, você concorda com nossos{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/(auth)/terms')}
              >
                Termos de Uso
              </Text>
              {' '}e{' '}
              <Text
                style={styles.termsLink}
                onPress={() => router.push('/(auth)/privacy')}
              >
                Política de Privacidade
              </Text>
              .
            </Text>

            <Button
              title="Criar Conta"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={styles.registerButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ja tem conta?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}> Entrar</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
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
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  header: {
    marginTop: SPACING.md,
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
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  roleCards: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.md,
  },
  roleCard: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  // roleEmoji removed - using vector icons
  roleTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  roleTitleSelected: {
    color: COLORS.primary,
  },
  roleDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  continueButton: {
    width: '100%',
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  documentTypeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  documentTypeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  documentTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  documentTypeText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semibold,
    color: COLORS.textSecondary,
  },
  documentTypeTextActive: {
    color: COLORS.primary,
  },
  form: {
    gap: SPACING.xs,
  },
  termsText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.md,
    fontFamily: FONTS.regular,
  },
  termsLink: {
    color: COLORS.primary,
    fontFamily: FONTS.semibold,
    textDecorationLine: 'underline' as const,
  },
  registerButton: {
    width: '100%',
    marginTop: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
