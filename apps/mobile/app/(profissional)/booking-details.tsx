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
  PENDING: { label: 'Nova Solicitação', color: COLORS.secondary, bg: COLORS.secondaryLight },
  ACCEPTED: { label: 'Aceito', color: COLORS.info, bg: COLORS.primarySubtle },
  IN_PROGRESS: { label: 'Em Andamento', color: COLORS.success, bg: COLORS.primaryLight },
  COMPLETED: { label: 'Concluído', color: COLORS.success, bg: COLORS.primaryLight },
  CANCELLED: { label: 'Cancelado', color: COLORS.error, bg: '#FDE8E8' },
};

export default function ProfBookingDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
      Alert.alert('Erro', 'Não foi possível carregar a diária');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await bookingService.accept(id!);
      Alert.alert('Sucesso!', 'Diária aceita!');
      loadBooking();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao aceitar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = () => {
    Alert.alert(
      'Fazer Check-in',
      'Confirma que chegou no local? O seguro será ativado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await bookingService.checkIn(id!, -25.4284, -49.2733);
              Alert.alert('Check-in realizado!', 'Seguro ativado.');
              loadBooking();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao fazer check-in');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCheckOut = () => {
    Alert.alert(
      'Fazer Check-out',
      'Confirma que finalizou o serviço?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await bookingService.checkOut(id!, -25.4284, -49.2733);
              Alert.alert('Check-out realizado!', 'Pagamento será processado.');
              loadBooking();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao fazer check-out');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert('Recusar Diária', 'Tem certeza?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, recusar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await bookingService.cancel(id!);
            Alert.alert('Diária recusada');
            router.back();
          } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.error || 'Erro ao recusar');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirmar conclusão',
      'Confirma que o serviço foi concluído conforme combinado?',
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
        pathname: '/(profissional)/chat',
        params: { conversationId: conversation.id, name: booking?.contratante_name || 'Contratante' },
      });
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível abrir o chat');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const status = STATUS_MAP[booking.status] || STATUS_MAP.PENDING;

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="sunset" opacity={0.12} heightFraction={0.3} position="bottom" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.secondary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        {/* Status */}
        <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg, marginBottom: 0 }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {booking.payment_status === 'RELEASED' && (
            <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9', marginBottom: 0 }]}>
              <Text style={[styles.statusText, { color: COLORS.success }]}>Pago</Text>
            </View>
          )}
        </View>

        {/* Earnings highlight */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Você recebe</Text>
          <Text style={styles.earningsValue}>
            R$ {Number(booking.net_professional_amount || 0).toFixed(2)}
          </Text>
        </View>

        {/* Chat Button */}
        {booking.status !== 'CANCELLED' && (
          <TouchableOpacity style={styles.chatButton} onPress={handleOpenChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.chatButtonText}>Conversar com Contratante</Text>
          </TouchableOpacity>
        )}

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalhes da Diária</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data</Text>
            <Text style={styles.detailValue}>{booking.scheduled_date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Horário</Text>
            <Text style={styles.detailValue}>
              {booking.scheduled_start} - {booking.scheduled_end}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valor/hora</Text>
            <Text style={styles.detailValue}>R$ {Number(booking.hourly_rate).toFixed(2)}</Text>
          </View>
          {booking.total_hours && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total horas</Text>
              <Text style={styles.detailValue}>{Number(booking.total_hours).toFixed(1)}h</Text>
            </View>
          )}
        </View>

        {/* Financial breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financeiro</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valor bruto</Text>
            <Text style={styles.detailValue}>R$ {Number(booking.gross_amount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Taxa plataforma (5%)</Text>
            <Text style={[styles.detailValue, { color: COLORS.error }]}>
              -R$ {Number(booking.platform_fee || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Taxa seguro</Text>
            <Text style={[styles.detailValue, { color: COLORS.error }]}>
              -R$ {Number(booking.insurance_fee || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={[styles.detailLabel, { fontFamily: FONTS.bold, color: COLORS.textPrimary }]}>
              Líquido
            </Text>
            <Text style={[styles.detailValue, { color: COLORS.success, fontSize: FONTS.sizes.lg }]}>
              R$ {Number(booking.net_professional_amount || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Check-in/out info */}
        {booking.check_in_at && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Check-in / Check-out</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <MaterialCommunityIcons name="login" size={16} color={COLORS.success} />
                <Text style={styles.detailLabel}>Check-in</Text>
              </View>
              <Text style={styles.detailValue}>
                {new Date(booking.check_in_at).toLocaleString('pt-BR')}
              </Text>
            </View>
            {booking.check_out_at && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <MaterialCommunityIcons name="logout" size={16} color={COLORS.error} />
                  <Text style={styles.detailLabel}>Check-out</Text>
                </View>
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
            <Text style={styles.cardTitle}>Observações do Contratante</Text>
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        )}

        {/* Condo Info */}
        {booking.condo && (
          <View style={styles.card}>
            <View style={styles.condoHeader}>
              <MaterialCommunityIcons name="office-building" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Condomínio</Text>
            </View>
            <Text style={styles.condoName}>
              {booking.condo.nome_fantasia || booking.condo.razao_social}
            </Text>
            <Text style={styles.condoAddress}>
              {booking.condo.endereco}, {booking.condo.numero}
              {booking.condo.complemento ? ` - ${booking.condo.complemento}` : ''}
            </Text>
            <Text style={styles.condoAddress}>
              {booking.condo.cidade}/{booking.condo.uf} - CEP {booking.condo.cep}
            </Text>

            <View style={styles.condoInfoGrid}>
              <View style={styles.condoInfoItem}>
                <Text style={styles.condoInfoValue}>{booking.condo.num_torres}</Text>
                <Text style={styles.condoInfoLabel}>Torres</Text>
              </View>
              <View style={styles.condoInfoItem}>
                <Text style={styles.condoInfoValue}>{booking.condo.num_unidades}</Text>
                <Text style={styles.condoInfoLabel}>Unidades</Text>
              </View>
              {booking.condo.metragem_total && (
                <View style={styles.condoInfoItem}>
                  <Text style={styles.condoInfoValue}>{booking.condo.metragem_total}m²</Text>
                  <Text style={styles.condoInfoLabel}>Área total</Text>
                </View>
              )}
              {booking.condo.num_elevadores > 0 && (
                <View style={styles.condoInfoItem}>
                  <Text style={styles.condoInfoValue}>{booking.condo.num_elevadores}</Text>
                  <Text style={styles.condoInfoLabel}>Elevadores</Text>
                </View>
              )}
            </View>

            {booking.condo.tem_portaria && (
              <View style={styles.condoTag}>
                <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.success} />
                <Text style={styles.condoTagText}>Portaria 24h</Text>
              </View>
            )}

            {/* Regras relevantes */}
            {(booking.condo.horario_mudanca || booking.condo.horario_obra || booking.condo.regras_lixo) && (
              <View style={styles.condoRulesSection}>
                <Text style={styles.condoRulesTitle}>Regras do Condomínio</Text>
                {booking.condo.horario_obra && (
                  <View style={styles.ruleRow}>
                    <Ionicons name="construct-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.ruleText}>Obras: {booking.condo.horario_obra}</Text>
                  </View>
                )}
                {booking.condo.horario_mudanca && (
                  <View style={styles.ruleRow}>
                    <Ionicons name="car-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.ruleText}>Mudança: {booking.condo.horario_mudanca}</Text>
                  </View>
                )}
                {booking.condo.regras_lixo && (
                  <View style={styles.ruleRow}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.ruleText}>Lixo: {booking.condo.regras_lixo}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Áreas comuns */}
            {booking.condo.areas && booking.condo.areas.length > 0 && (
              <View style={styles.condoAreasSection}>
                <Text style={styles.condoRulesTitle}>Áreas Comuns</Text>
                {booking.condo.areas.map((area: any) => (
                  <View key={area.id} style={styles.areaRow}>
                    <Text style={styles.areaName}>{area.nome}</Text>
                    <Text style={styles.areaSize}>{area.metragem}m²</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        {booking.status === 'PENDING' && (
          <View style={styles.actionsRow}>
            <Button
              title="Aceitar Diária"
              onPress={handleAccept}
              variant="primary"
              size="lg"
              loading={actionLoading}
              style={{ flex: 1 }}
            />
            <Button
              title="Recusar"
              onPress={handleReject}
              variant="outline"
              size="lg"
              loading={actionLoading}
              style={{ flex: 0.5 }}
              textStyle={{ color: COLORS.error }}
            />
          </View>
        )}

        {booking.status === 'ACCEPTED' && (
          <Button
            title="Fazer Check-in"
            onPress={handleCheckIn}
            variant="secondary"
            size="lg"
            loading={actionLoading}
            style={styles.fullBtn}
          />
        )}

        {booking.status === 'IN_PROGRESS' && (
          <Button
            title="Fazer Check-out"
            onPress={handleCheckOut}
            variant="primary"
            size="lg"
            loading={actionLoading}
            style={styles.fullBtn}
          />
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
            {!booking.profissional_confirmed && (
              <Button
                title="Confirmar que concluí o serviço"
                onPress={handleConfirmCompletion}
                loading={confirming}
                size="md"
                style={{ marginTop: SPACING.sm }}
              />
            )}
            <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular, marginTop: SPACING.sm, textAlign: 'center' }}>
              O pagamento será liberado quando ambas as partes confirmarem
            </Text>
          </View>
        )}

        {/* Download Receipt */}
        {canDownloadReceipt && (
          <TouchableOpacity
            style={styles.receiptButton}
            onPress={handleDownloadReceipt}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={COLORS.secondary} />
            ) : (
              <Ionicons name="document-text-outline" size={20} color={COLORS.secondary} />
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
  backText: { fontSize: FONTS.sizes.md, color: COLORS.secondary, fontFamily: FONTS.medium },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  statusText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },

  earningsCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  earningsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, marginBottom: SPACING.xs, fontFamily: FONTS.regular },
  earningsValue: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  detailLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginLeft: 0, fontFamily: FONTS.regular },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailValue: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  notesText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONTS.regular },

  // Condo info
  condoHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  condoName: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginBottom: 4 },
  condoAddress: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontFamily: FONTS.regular, lineHeight: 20 },
  condoInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  condoInfoItem: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    minWidth: 70,
  },
  condoInfoValue: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.primary },
  condoInfoLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  condoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.sm,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    alignSelf: 'flex-start',
  },
  condoTagText: { fontSize: FONTS.sizes.xs, color: COLORS.success, fontFamily: FONTS.semibold },
  condoRulesSection: { marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  condoRulesTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  ruleText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular, flex: 1 },
  condoAreasSection: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  areaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  areaName: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  areaSize: { fontSize: FONTS.sizes.xs, color: COLORS.textPrimary, fontFamily: FONTS.semibold },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  fullBtn: { width: '100%', marginTop: SPACING.sm },
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
    color: COLORS.secondary,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondaryLight,
  },
  chatButtonText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semibold,
    color: COLORS.secondary,
  },
});
