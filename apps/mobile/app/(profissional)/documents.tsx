import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { documentService, DocStatus } from '../../services/documents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

type DocType = 'rg' | 'cpf' | 'comprovante' | 'selfie';

interface DocCard {
  type: DocType;
  title: string;
  description: string;
  icon: string;
  required: boolean;
}

const DOCS: DocCard[] = [
  {
    type: 'rg',
    title: 'RG ou CNH',
    description: 'Foto frente e verso do documento de identidade',
    icon: 'card-account-details-outline',
    required: true,
  },
  {
    type: 'selfie',
    title: 'Selfie com Documento',
    description: 'Tire uma selfie segurando o RG/CNH ao lado do rosto',
    icon: 'camera-account',
    required: true,
  },
  {
    type: 'cpf',
    title: 'CPF (comprovante)',
    description: 'Comprovante de CPF ou cartão CPF',
    icon: 'file-document-outline',
    required: false,
  },
  {
    type: 'comprovante',
    title: 'Comprovante de Endereço',
    description: 'Conta de luz, água ou telefone dos últimos 3 meses',
    icon: 'home-outline',
    required: false,
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDENTE: {
    label: 'Não Enviado',
    color: COLORS.textSecondary,
    bg: COLORS.gray100,
    icon: 'clock-outline',
  },
  EM_ANALISE: {
    label: 'Em Análise',
    color: COLORS.info,
    bg: '#E3F2FD',
    icon: 'magnify',
  },
  APROVADO: {
    label: 'Aprovado',
    color: COLORS.success,
    bg: '#E8F5E9',
    icon: 'check-circle-outline',
  },
  REJEITADO: {
    label: 'Rejeitado',
    color: COLORS.error,
    bg: '#FDE8E8',
    icon: 'close-circle-outline',
  },
};

export default function DocumentsScreen() {
  const router = useRouter();
  const [docStatus, setDocStatus] = useState<DocStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await documentService.getStatus();
      setDocStatus(data);
    } catch (err) {
      console.error('Erro ao carregar status:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const pickImage = async (docType: DocType) => {
    const isSelfie = docType === 'selfie';

    if (isSelfie) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar a selfie.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar a imagem.');
        return;
      }
    }

    const result = isSelfie
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [3, 4],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
        });

    if (result.canceled || !result.assets[0]) return;

    setUploading(docType);
    try {
      await documentService.uploadDocument(docType, result.assets[0].uri);
      Alert.alert('Sucesso', `${DOCS.find((d) => d.type === docType)?.title} enviado!`);
      loadStatus();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar documento');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = () => {
    if (!docStatus?.documents.rg || !docStatus?.documents.selfie) {
      Alert.alert('Documentos faltando', 'Envie pelo menos RG/CNH e Selfie para enviar para análise.');
      return;
    }

    Alert.alert(
      'Enviar para Análise',
      'Seus documentos serão analisados em até 48 horas. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setSubmitting(true);
            try {
              const result = await documentService.submit();
              Alert.alert('Enviado!', result.message);
              loadStatus();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar documentos');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
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

  const statusInfo = STATUS_CONFIG[docStatus?.status || 'PENDENTE'] || STATUS_CONFIG.PENDENTE;
  const isEditable = docStatus?.status === 'PENDENTE' || docStatus?.status === 'REJEITADO';
  const allRequiredUploaded = docStatus?.documents.rg && docStatus?.documents.selfie;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.secondary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Verificação de Documentos</Text>
        <Text style={styles.subtitle}>
          Envie seus documentos para verificar sua identidade e poder receber trabalhos.
        </Text>

        {/* Status Badge */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.bg }]}>
          <MaterialCommunityIcons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            {docStatus?.status === 'EM_ANALISE' && (
              <Text style={styles.statusSubtext}>Seus documentos estão sendo analisados. Aguarde até 48h.</Text>
            )}
            {docStatus?.status === 'APROVADO' && (
              <Text style={styles.statusSubtext}>Sua identidade foi verificada com sucesso!</Text>
            )}
            {docStatus?.status === 'REJEITADO' && docStatus.rejection_reason && (
              <Text style={[styles.statusSubtext, { color: COLORS.error }]}>
                Motivo: {docStatus.rejection_reason}
              </Text>
            )}
          </View>
        </View>

        {/* Document Cards */}
        {DOCS.map((doc) => {
          const isUploaded = docStatus?.documents[doc.type] || false;
          const isCurrentlyUploading = uploading === doc.type;

          return (
            <TouchableOpacity
              key={doc.type}
              style={[
                styles.docCard,
                isUploaded && styles.docCardUploaded,
                !isEditable && styles.docCardDisabled,
              ]}
              onPress={() => isEditable && pickImage(doc.type)}
              disabled={!isEditable || isCurrentlyUploading}
            >
              <View style={[styles.docIconContainer, isUploaded && styles.docIconContainerUploaded]}>
                {isCurrentlyUploading ? (
                  <ActivityIndicator size="small" color={COLORS.secondary} />
                ) : (
                  <MaterialCommunityIcons
                    name={doc.icon as any}
                    size={28}
                    color={isUploaded ? COLORS.success : COLORS.textSecondary}
                  />
                )}
              </View>

              <View style={styles.docContent}>
                <View style={styles.docTitleRow}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  {doc.required && (
                    <Text style={styles.requiredBadge}>Obrigatório</Text>
                  )}
                </View>
                <Text style={styles.docDescription}>{doc.description}</Text>
              </View>

              <View style={styles.docStatusIcon}>
                {isUploaded ? (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                ) : isEditable ? (
                  <Feather name="upload" size={20} color={COLORS.textMuted} />
                ) : (
                  <Feather name="lock" size={18} color={COLORS.textMuted} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Submit Button */}
        {isEditable && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              !allRequiredUploaded && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!allRequiredUploaded || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Enviar para Análise</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!allRequiredUploaded && isEditable && (
          <Text style={styles.hintText}>
            Envie pelo menos RG/CNH e Selfie para poder submeter à análise
          </Text>
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
  title: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  statusLabel: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
  },
  statusSubtext: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  docCardUploaded: {
    borderColor: COLORS.success,
    backgroundColor: '#FAFFFA',
  },
  docCardDisabled: {
    opacity: 0.7,
  },
  docIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docIconContainerUploaded: {
    backgroundColor: '#E8F5E9',
  },
  docContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  docTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semibold,
    color: COLORS.textPrimary,
  },
  requiredBadge: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.error,
    backgroundColor: '#FDE8E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  docDescription: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  docStatusIcon: {
    marginLeft: SPACING.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  hintText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
