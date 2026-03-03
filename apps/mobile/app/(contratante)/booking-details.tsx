import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Button } from '../../components';
import { bookingService } from '../../services/bookings';
import { paymentService } from '../../services/payments';
import { chatService } from '../../services/chat';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Aguardando Aceite', color: COLORS.secondary, bg: COLORS.secondaryLight },
  ACCEPTED: { label: 'Aceito', color: COLORS.info, bg: COLORS.primarySubtle },
  IN_PROGRESS: { label: 'Em Andamento', color: COLORS.success, bg: COLORS.primaryLight },
  COMPLETED: { label: 'Concluído', color: COLORS.success, bg: COLORS.primaryLight },
  CANCELLED: { label: 'Cancelado', color: COLORS.error, bg: '#FDE8E8' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  UNPAID: { label: 'Aguardando Pagamento', color: COLORS.secondary, bg: COLORS.secondaryLight },
  PAID: { label: 'Pago', color: COLORS.info, bg: '#E3F2FD' },
  RELEASED: { label: 'Liberado', color: COLORS.success, bg: '#E8F5E9' },
  REFUNDED: { label: 'Estornado', color: COLORS.error, bg: '#FDE8E8' },
};

export default function BookingDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadBooking();
  }, []);

  const loadBooking = async () => {
    try {
      const result = await bookingService.getById(id!);
      setBooking(result.data);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar o agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancelar Agendamento', 'Tem certeza que deseja cancelar?', [
      { text: 'Nao', style: 'cancel' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await bookingService.cancel(id!);
            loadBooking();
          } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.error || 'Erro ao cancelar');
          }
        },
      },
    ]);
  };

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirmar conclusão',
      'Confirma que o serviço foi realizado conforme combinado?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, confirmar',
          onPress: async () => {
            setConfirming(true);
            try {
              const result = await paymentService.confirmCompletion(id!);
              Alert.alert('Sucesso', result.message || 'Confirmação registrada!');
              loadBooking();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao confirmar');
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      await bookingService.downloadReceipt(id!);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível baixar o comprovante');
    } finally {
      setDownloading(false);
    }
  };

  const canDownloadReceipt =
    booking?.status === 'COMPLETED' ||
    (booking?.payment_status && booking.payment_status !== 'UNPAID');

  const handleOpenChat = async () => {
    try {
      const conversation = await chatService.createConversation(id!);
      router.push({
        pathname: '/(contratante)/chat',
        params: { conversationId: conversation.id, name: booking?.profissional_name || 'Profissional' },
      });
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível abrir o chat');
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

  if (!booking) return null;

  const status = STATUS_MAP[booking.status] || STATUS_MAP.PENDING;

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        {/* Status Badges */}
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg, marginBottom: 0 }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {booking.payment_status && (
            <View style={[styles.statusBadge, { backgroundColor: (PAYMENT_STATUS_MAP[booking.payment_status] || PAYMENT_STATUS_MAP.UNPAID).bg, marginBottom: 0 }]}>
              <Text style={[styles.statusText, { color: (PAYMENT_STATUS_MAP[booking.payment_status] || PAYMENT_STATUS_MAP.UNPAID).color }]}>
                {(PAYMENT_STATUS_MAP[booking.payment_status] || PAYMENT_STATUS_MAP.UNPAID).label}
              </Text>
            </View>
          )}
        </View>

        {/* Chat Button */}
        {booking.status !== 'CANCELLED' && (
          <TouchableOpacity style={styles.chatButton} onPress={handleOpenChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
            <Text style={styles.chatButtonText}>Conversar com Profissional</Text>
          </TouchableOpacity>
        )}

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalhes do Servico</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data</Text>
            <Text style={styles.detailValue}>{booking.scheduled_date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Horario</Text>
            <Text style={styles.detailValue}>{booking.scheduled_start} - {booking.scheduled_end}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valor/hora</Text>
            <Text style={styles.detailValue}>R$ {Number(booking.hourly_rate).toFixed(2)}</Text>
          </View>
          {booking.total_hours && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total horas</Text>
              <Text style={styles.detailValue}>{booking.total_hours.toFixed(1)}h</Text>
            </View>
          )}
        </View>

        {/* Financial Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financeiro</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valor bruto</Text>
            <Text style={styles.detailValue}>R$ {Number(booking.gross_amount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Taxa plataforma (5%)</Text>
            <Text style={styles.detailValue}>R$ {Number(booking.platform_fee || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Taxa seguro</Text>
            <Text style={styles.detailValue}>R$ {Number(booking.insurance_fee || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm }]}>
            <Text style={[styles.detailLabel, { fontFamily: FONTS.bold, color: COLORS.textPrimary }]}>Profissional recebe</Text>
            <Text style={[styles.detailValue, { color: COLORS.success }]}>R$ {Number(booking.net_professional_amount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Check-in/out info */}
        {booking.check_in_at && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Check-in / Check-out</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>
                {new Date(booking.check_in_at).toLocaleString('pt-BR')}
              </Text>
            </View>
            {booking.check_out_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Check-out</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.check_out_at).toLocaleString('pt-BR')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {booking.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Observacoes</Text>
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        )}

        {/* Confirmation Card */}
        {booking.status === 'COMPLETED' && booking.payment_status !== 'RELEASED' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Confirmação do Serviço</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contratante confirmou</Text>
              <Text style={[styles.detailValue, { color: booking.contratante_confirmed ? COLORS.success : COLORS.textSecondary }]}>
                {booking.contratante_confirmed ? 'Sim' : 'Não'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Profissional confirmou</Text>
              <Text style={[styles.detailValue, { color: booking.profissional_confirmed ? COLORS.success : COLORS.textSecondary }]}>
                {booking.profissional_confirmed ? 'Sim' : 'Não'}
              </Text>
            </View>
            {!booking.contratante_confirmed && (
              <Button
                title="Confirmar que o serviço foi realizado"
                onPress={handleConfirmCompletion}
                loading={confirming}
                size="md"
                style={{ marginTop: SPACING.sm }}
              />
            )}
          </View>
        )}

        {/* Actions */}
        {(booking.status === 'PENDING' || booking.status === 'ACCEPTED') && (
          <Button
            title="Cancelar Agendamento"
            onPress={handleCancel}
            variant="outline"
            size="md"
            style={styles.cancelButton}
            textStyle={{ color: COLORS.error }}
          />
        )}

        {booking.status === 'COMPLETED' && booking.payment_status === 'RELEASED' && (
          <Button
            title="Avaliar Profissional"
            onPress={() =>
              router.push({
                pathname: '/(contratante)/rate-service',
                params: { booking_id: booking.id, professional_id: booking.profissional_id },
              })
            }
            variant="secondary"
            size="lg"
            style={styles.rateButton}
          />
        )}

        {/* Download Receipt */}
        {canDownloadReceipt && (
          <TouchableOpacity
            style={styles.receiptButton}
            onPress={handleDownloadReceipt}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            )}
            <Text style={styles.receiptButtonText}>
              {downloading ? 'Gerando...' : 'Baixar Resumo do Serviço'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  backButton: { paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, marginBottom: SPACING.md,
  },
  statusText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  cardTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  detailLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  detailValue: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  notesText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONTS.regular },
  cancelButton: { width: '100%', borderColor: COLORS.error, marginTop: SPACING.sm },
  rateButton: { width: '100%', marginTop: SPACING.sm },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
  },
  receiptButtonText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semibold,
    color: COLORS.primary,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySubtle,
  },
  chatButtonText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semibold,
    color: COLORS.primary,
  },
});
