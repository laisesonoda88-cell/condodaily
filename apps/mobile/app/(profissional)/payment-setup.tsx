import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Input } from '../../components';
import { paymentService } from '../../services/payments';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

const PIX_KEY_OPTIONS: { type: PixKeyType; label: string; icon: string }[] = [
  { type: 'CPF', label: 'CPF', icon: 'person-outline' },
  { type: 'CNPJ', label: 'CNPJ', icon: 'business-outline' },
  { type: 'EMAIL', label: 'E-mail', icon: 'mail-outline' },
  { type: 'PHONE', label: 'Celular', icon: 'call-outline' },
  { type: 'RANDOM', label: 'Chave aleatória', icon: 'key-outline' },
];

export default function PaymentSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('CPF');
  const [pixKey, setPixKey] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    loadPaymentInfo();
  }, []);

  const loadPaymentInfo = async () => {
    try {
      const result = await paymentService.getPaymentInfo();
      if (result.data) {
        setPixKeyType(result.data.pix_key_type || 'CPF');
        setPixKey(result.data.pix_key || '');
        setIsVerified(result.data.is_verified || false);
        setHasExisting(true);
      }
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    if (!pixKey.trim()) {
      Alert.alert('Erro', 'Informe sua chave PIX');
      return;
    }

    setSaving(true);
    try {
      await paymentService.savePaymentInfo({
        pix_key_type: pixKeyType,
        pix_key: pixKey.trim(),
      });
      Alert.alert('Sucesso', 'Dados de pagamento salvos com sucesso!');
      setHasExisting(true);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar dados');
    } finally {
      setSaving(false);
    }
  };

  const getPlaceholder = () => {
    switch (pixKeyType) {
      case 'CPF': return '000.000.000-00';
      case 'CNPJ': return '00.000.000/0000-00';
      case 'EMAIL': return 'seu@email.com';
      case 'PHONE': return '+55 41 99999-9999';
      case 'RANDOM': return 'Chave aleatória';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Dados de Pagamento</Text>
        <Text style={styles.subtitle}>
          Configure como você deseja receber seus pagamentos
        </Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Após a conclusão e confirmação do serviço por ambas as partes, o pagamento será transferido automaticamente via PIX para a chave cadastrada.
          </Text>
        </View>

        {/* PIX Key Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de chave PIX</Text>
          <View style={styles.keyTypesContainer}>
            {PIX_KEY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.keyTypeCard,
                  pixKeyType === option.type && styles.keyTypeCardActive,
                ]}
                onPress={() => {
                  setPixKeyType(option.type);
                  setPixKey('');
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={pixKeyType === option.type ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.keyTypeText,
                    pixKeyType === option.type && styles.keyTypeTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PIX Key Input */}
        <View style={styles.section}>
          <Input
            label="Chave PIX"
            placeholder={getPlaceholder()}
            value={pixKey}
            onChangeText={setPixKey}
            keyboardType={pixKeyType === 'EMAIL' ? 'email-address' : pixKeyType === 'PHONE' ? 'phone-pad' : 'default'}
          />
        </View>

        {/* Status Badge */}
        {hasExisting && (
          <View style={[styles.statusBadge, isVerified ? styles.statusVerified : styles.statusPending]}>
            <Ionicons
              name={isVerified ? 'checkmark-circle' : 'time-outline'}
              size={18}
              color={isVerified ? COLORS.success : COLORS.warning}
            />
            <Text style={[styles.statusText, isVerified ? styles.statusVerifiedText : styles.statusPendingText]}>
              {isVerified ? 'Chave verificada' : 'Verificação pendente'}
            </Text>
          </View>
        )}

        <Button
          title={hasExisting ? 'Atualizar dados' : 'Salvar dados'}
          onPress={handleSave}
          loading={saving}
          disabled={!pixKey.trim()}
          size="lg"
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  backButton: { paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },
  title: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  infoCard: {
    flexDirection: 'row', backgroundColor: '#E3F2FD', padding: SPACING.md,
    borderRadius: RADIUS.md, gap: SPACING.sm, marginBottom: SPACING.lg,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.gray700, lineHeight: 20 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  keyTypesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  keyTypeCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  keyTypeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySubtle },
  keyTypeText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  keyTypeTextActive: { color: COLORS.primary, fontFamily: FONTS.semibold },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm, marginBottom: SPACING.lg,
  },
  statusVerified: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: COLORS.secondaryLight },
  statusText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold },
  statusVerifiedText: { color: COLORS.success },
  statusPendingText: { color: COLORS.secondaryDark },
  saveButton: { width: '100%' },
});
