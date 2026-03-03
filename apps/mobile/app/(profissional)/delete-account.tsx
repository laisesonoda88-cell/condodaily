import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const CONFIRMATION_TEXT = 'EXCLUIR MINHA CONTA';
  const isConfirmed = confirmation === CONFIRMATION_TEXT;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    Alert.alert(
      'Tem certeza absoluta?',
      'Esta ação é irreversível. Todos os seus dados pessoais serão removidos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, excluir minha conta',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete('/users/me', {
                data: { confirmation: CONFIRMATION_TEXT },
              });
              Alert.alert(
                'Conta excluída',
                'Seus dados foram removidos conforme a LGPD. Obrigado por usar o CondoDaily.',
                [{ text: 'OK', onPress: () => logout() }]
              );
            } catch (error: any) {
              Alert.alert(
                'Erro',
                error.response?.data?.error || 'Não foi possível excluir a conta. Tente novamente.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.secondary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="warning-outline" size={48} color={COLORS.error} />
        </View>

        <Text style={styles.title}>Excluir Minha Conta</Text>
        <Text style={styles.subtitle}>
          Conforme a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a
          exclusão dos seus dados pessoais.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>O que será removido:</Text>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.error} />
            <Text style={styles.infoText}>Nome, email, telefone e CPF</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.error} />
            <Text style={styles.infoText}>Foto de perfil e documentos</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.error} />
            <Text style={styles.infoText}>Acesso à sua conta</Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
          <Text style={styles.warningText}>
            Registros financeiros e histórico de serviços são mantidos por obrigação fiscal (5 anos),
            mas seus dados pessoais serão anonimizados.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error} />
          <Text style={[styles.warningText, { color: COLORS.error }]}>
            Agendamentos ativos devem ser cancelados ou concluídos antes da exclusão.
          </Text>
        </View>

        <Text style={styles.confirmLabel}>
          Para confirmar, digite <Text style={styles.confirmHighlight}>{CONFIRMATION_TEXT}</Text> abaixo:
        </Text>

        <TextInput
          style={styles.input}
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Digite para confirmar"
          placeholderTextColor={COLORS.placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.deleteButton, !isConfirmed && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={!isConfirmed || deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={COLORS.white} />
              <Text style={styles.deleteButtonText}>Excluir Conta Permanentemente</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  backButton: { paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.secondary, fontFamily: FONTS.medium },
  iconContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.heading,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  infoCard: {
    backgroundColor: '#FDE8E8',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    flex: 1,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  warningText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  confirmLabel: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  confirmHighlight: {
    fontFamily: FONTS.bold,
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  deleteButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  deleteButtonText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
});
