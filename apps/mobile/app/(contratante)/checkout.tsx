import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components';
import { PixQRCode } from '../../components/PixQRCode';
import { CardTokenizer } from '../../components/CardTokenizer';
import { bookingService } from '../../services/bookings';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'WALLET';
type Step = 'select' | 'processing' | 'pix' | 'card' | 'boleto' | 'success';

const MP_PUBLIC_KEY = process.env.EXPO_PUBLIC_MP_PUBLIC_KEY || '';

if (__DEV__ && !MP_PUBLIC_KEY) {
  console.warn('[Checkout] EXPO_PUBLIC_MP_PUBLIC_KEY não configurado — pagamento com cartão não funcionará');
}

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    profissional_id: string;
    professional_name: string;
    condo_id: string;
    category_id: string;
    scheduled_date: string;
    scheduled_start: string;
    scheduled_end: string;
    hourly_rate: string;
    notes: string;
    gross_amount: string;
    insurance_fee: string;
    total_amount: string;
    platform_fee: string;
    hours: string;
    has_wallet_balance: string;
    wallet_balance: string;
  }>();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [submitting, setSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const totalAmount = Number(params.total_amount || 0);
  const grossAmount = Number(params.gross_amount || 0);
  const insuranceFee = Number(params.insurance_fee || 0);
  const platformFee = Number(params.platform_fee || 0);
  const hours = Number(params.hours || 0);
  const hasWalletBalance = params.has_wallet_balance === 'true';
  const walletBalance = Number(params.wallet_balance || 0);

  const handlePayWithWallet = async () => {
    setSubmitting(true);
    try {
      await bookingService.create({
        profissional_id: params.profissional_id!,
        condo_id: params.condo_id!,
        category_id: params.category_id!,
        scheduled_date: params.scheduled_date!,
        scheduled_start: params.scheduled_start!,
        scheduled_end: params.scheduled_end!,
        hourly_rate: Number(params.hourly_rate),
        notes: params.notes || undefined,
        payment_source: 'WALLET',
      });
      setStep('success');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao processar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayWithMercadoPago = async (method: 'PIX' | 'CREDIT_CARD' | 'BOLETO', cardToken?: string, installments?: number) => {
    setSubmitting(true);
    try {
      const result = await bookingService.create({
        profissional_id: params.profissional_id!,
        condo_id: params.condo_id!,
        category_id: params.category_id!,
        scheduled_date: params.scheduled_date!,
        scheduled_start: params.scheduled_start!,
        scheduled_end: params.scheduled_end!,
        hourly_rate: Number(params.hourly_rate),
        notes: params.notes || undefined,
        payment_source: 'MERCADO_PAGO',
        payment_method: method,
        card_token: cardToken,
        installments,
      });

      setPaymentData(result.data?.payment || result.data);

      if (method === 'PIX') {
        setStep('pix');
      } else if (method === 'BOLETO') {
        setStep('boleto');
      } else if (method === 'CREDIT_CARD') {
        if (result.data?.payment?.status === 'APPROVED') {
          setStep('success');
        } else {
          Alert.alert('Pagamento em análise', 'Seu pagamento está sendo processado. Você será notificado quando for aprovado.');
          router.back();
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao processar pagamento');
      setStep('select');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === 'WALLET') {
      if (!hasWalletBalance || walletBalance < totalAmount) {
        Alert.alert('Saldo insuficiente', 'Sua CondoWallet não tem saldo suficiente.');
        return;
      }
      handlePayWithWallet();
    } else if (method === 'PIX') {
      setStep('processing');
      await handlePayWithMercadoPago('PIX');
    } else if (method === 'CREDIT_CARD') {
      setStep('card');
    } else if (method === 'BOLETO') {
      setStep('processing');
      await handlePayWithMercadoPago('BOLETO');
    }
  };

  const handleCardTokenGenerated = async (token: string, cardInfo: { lastFour: string; brand: string }) => {
    setStep('processing');
    await handlePayWithMercadoPago('CREDIT_CARD', token, 1);
  };

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          <Text style={styles.successTitle}>Agendamento criado!</Text>
          <Text style={styles.successSubtitle}>
            Pagamento confirmado. Aguardando aceite do profissional.
          </Text>
          <Button
            title="Ver meus agendamentos"
            onPress={() => router.replace('/(contratante)/bookings')}
            size="lg"
            style={styles.successButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Pagamento</Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumo do serviço</Text>
          <Text style={styles.professionalName}>{params.professional_name}</Text>
          <Text style={styles.dateText}>{params.scheduled_date} | {params.scheduled_start} - {params.scheduled_end}</Text>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duração</Text>
            <Text style={styles.summaryValue}>{hours.toFixed(1)}h</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valor bruto</Text>
            <Text style={styles.summaryValue}>R$ {grossAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxa de seguro</Text>
            <Text style={styles.summaryValue}>R$ {insuranceFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        {step === 'select' && (
          <View style={styles.methodsContainer}>
            <Text style={styles.methodsTitle}>Escolha como pagar</Text>

            {hasWalletBalance && walletBalance >= totalAmount && (
              <TouchableOpacity
                style={[styles.methodCard, selectedMethod === 'WALLET' && styles.methodCardActive]}
                onPress={() => handleMethodSelect('WALLET')}
              >
                <MaterialCommunityIcons name="wallet-outline" size={24} color={COLORS.primary} />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>CondoWallet</Text>
                  <Text style={styles.methodDesc}>Saldo: R$ {walletBalance.toFixed(2)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'PIX' && styles.methodCardActive]}
              onPress={() => handleMethodSelect('PIX')}
            >
              <MaterialCommunityIcons name="qrcode" size={24} color="#00BCD4" />
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>PIX</Text>
                <Text style={styles.methodDesc}>Pagamento instantâneo via QR Code</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'CREDIT_CARD' && styles.methodCardActive]}
              onPress={() => handleMethodSelect('CREDIT_CARD')}
            >
              <Ionicons name="card-outline" size={24} color={COLORS.secondary} />
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Cartão de Crédito</Text>
                <Text style={styles.methodDesc}>Parcele em até 12x</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'BOLETO' && styles.methodCardActive]}
              onPress={() => handleMethodSelect('BOLETO')}
            >
              <Ionicons name="barcode-outline" size={24} color={COLORS.gray700} />
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Boleto Bancário</Text>
                <Text style={styles.methodDesc}>Vencimento em 3 dias úteis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
            </TouchableOpacity>
          </View>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <View style={styles.processingContainer}>
            <Button title="Processando pagamento..." loading disabled onPress={() => {}} size="lg" />
          </View>
        )}

        {/* PIX QR Code */}
        {step === 'pix' && paymentData && (
          <PixQRCode
            paymentId={paymentData.payment_id}
            qrCodeBase64={paymentData.pix_qr_code_base64}
            copyPaste={paymentData.pix_copy_paste}
            expiresAt={paymentData.expires_at}
            onPaymentApproved={() => setStep('success')}
            onExpired={() => {
              Alert.alert('PIX expirado', 'O tempo para pagamento expirou. Tente novamente.');
              setStep('select');
            }}
          />
        )}

        {/* Card Form */}
        {step === 'card' && (
          <CardTokenizer
            publicKey={MP_PUBLIC_KEY}
            amount={totalAmount}
            onTokenGenerated={handleCardTokenGenerated}
            onError={(error) => {
              Alert.alert('Erro', error);
              setStep('select');
            }}
          />
        )}

        {/* Boleto */}
        {step === 'boleto' && paymentData && (
          <View style={styles.boletoContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.info} />
            <Text style={styles.boletoTitle}>Boleto gerado!</Text>
            <Text style={styles.boletoSubtitle}>
              Vencimento: {paymentData.boleto_due_date}
            </Text>

            {paymentData.boleto_barcode && (
              <View style={styles.barcodeContainer}>
                <Text style={styles.barcodeText}>{paymentData.boleto_barcode}</Text>
              </View>
            )}

            {paymentData.boleto_url && (
              <Button
                title="Abrir boleto"
                onPress={() => Linking.openURL(paymentData.boleto_url)}
                variant="outline"
                size="lg"
                style={{ width: '100%', marginTop: SPACING.md }}
              />
            )}

            <Button
              title="Ver meus agendamentos"
              onPress={() => router.replace('/(contratante)/bookings')}
              size="lg"
              style={{ width: '100%', marginTop: SPACING.sm }}
            />

            <Text style={styles.boletoNote}>
              O agendamento será confirmado após o pagamento do boleto ser identificado.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  backButton: { paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },
  title: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.lg },
  summaryCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.lg, ...SHADOWS.sm,
  },
  summaryTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs },
  professionalName: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  dateText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  summaryLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  summaryValue: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.xs, paddingTop: SPACING.sm },
  totalLabel: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  totalValue: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, color: COLORS.primary },
  methodsContainer: { marginBottom: SPACING.lg },
  methodsTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.md },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.border, marginBottom: SPACING.sm, gap: SPACING.md,
  },
  methodCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySubtle },
  methodInfo: { flex: 1 },
  methodName: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  methodDesc: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  processingContainer: { paddingVertical: SPACING.xl },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.md },
  successTitle: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.success },
  successSubtitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center' },
  successButton: { width: '100%', marginTop: SPACING.lg },
  boletoContainer: { alignItems: 'center', padding: SPACING.lg, gap: SPACING.sm },
  boletoTitle: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.info },
  boletoSubtitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  barcodeContainer: { backgroundColor: COLORS.gray50, padding: SPACING.md, borderRadius: RADIUS.sm, width: '100%', marginTop: SPACING.sm },
  barcodeText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textPrimary, textAlign: 'center' },
  boletoNote: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },
});
