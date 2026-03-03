import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Input } from '../../components';
import { condoService } from '../../services/condos';
import { useCondoStore } from '../../stores/condoStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

type Step = 'cadastro' | 'documento' | 'revisao';

interface AreaComum {
  nome: string;
  metragem: number;
  tipo: string;
  andar?: string;
  observacoes?: string;
}

interface AnalysisData {
  areas_comuns: AreaComum[];
  metragem_total: number;
  tem_portaria: boolean;
  num_andares_por_torre: number | null;
  num_elevadores: number;
  regras_lixo: string | null;
  horario_mudanca: string | null;
  horario_obra: string | null;
}

export default function CondoSetupScreen() {
  const router = useRouter();
  const { loadCondos, setActiveCondo } = useCondoStore();
  const [step, setStep] = useState<Step>('cadastro');

  // Step 1 - Cadastro
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [numTorres, setNumTorres] = useState('1');
  const [numUnidades, setNumUnidades] = useState('');
  const [saving, setSaving] = useState(false);
  const [condoId, setCondoId] = useState<string | null>(null);

  // Step 2 - Documento
  const [uploading, setUploading] = useState(false);
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState('');

  // Step 3 - Revisão IA
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [confirming, setConfirming] = useState(false);

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const handleLookupCnpj = async () => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) { Alert.alert('Erro', 'CNPJ deve ter 14 dígitos'); return; }
    setLoading(true);
    try {
      const result = await condoService.lookupCnpj(clean);
      if (result.success) {
        const d = result.data;
        setRazaoSocial(d.razao_social || '');
        setNomeFantasia(d.nome_fantasia || '');
        setCep(d.cep || '');
        setEndereco(d.endereco || '');
        setNumero(d.numero || '');
        setComplemento(d.complemento || '');
        setCidade(d.cidade || '');
        setUf(d.uf || '');
        setLookupDone(true);
      }
    } catch {
      Alert.alert('CNPJ não encontrado', 'Preencha os dados manualmente');
      setLookupDone(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCondo = async () => {
    if (!razaoSocial || !cep || !endereco || !numero || !cidade || !uf || !numUnidades) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const result = await condoService.create({
        cnpj: cnpj.replace(/\D/g, ''),
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || undefined,
        cep: cep.replace(/\D/g, ''),
        endereco, numero,
        complemento: complemento || undefined,
        cidade, uf,
        num_torres: Number(numTorres) || 1,
        num_unidades: Number(numUnidades),
        areas_lazer: [],
      });
      setCondoId(result.data.id);
      setStep('documento');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao cadastrar condomínio');
    } finally {
      setSaving(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setFileName(file.name);
      setUploading(true);

      await condoService.uploadDocument(condoId!, file.uri, file.name, file.mimeType || 'application/pdf');
      setDocumentUploaded(true);
      Alert.alert('Sucesso', 'Documento enviado! Agora clique em "Analisar" para extrair os dados.');
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar o documento');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await condoService.analyzeDocument(condoId!);
      setAnalysisData(result.data);
      setStep('revisao');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao analisar documento. Tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmAnalysis = async () => {
    if (!analysisData) return;
    setConfirming(true);
    try {
      await condoService.confirmAnalysis(condoId!, analysisData);
      await loadCondos();
      // Selecionar o condo recém-criado
      const condoData = await condoService.getById(condoId!);
      if (condoData.data) await setActiveCondo(condoData.data);

      Alert.alert('Sucesso', 'Condomínio cadastrado e dados confirmados!', [
        { text: 'Ver Recomendações', onPress: () => router.replace('/(contratante)/condo-recommendations') },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível confirmar os dados');
    } finally {
      setConfirming(false);
    }
  };

  const handleSkipDocument = async () => {
    await loadCondos();
    const condoData = await condoService.getById(condoId!);
    if (condoData.data) await setActiveCondo(condoData.data);
    router.replace('/(contratante)/home');
  };

  const updateArea = (index: number, field: keyof AreaComum, value: any) => {
    if (!analysisData) return;
    const updated = [...analysisData.areas_comuns];
    updated[index] = { ...updated[index], [field]: value };
    setAnalysisData({ ...analysisData, areas_comuns: updated, metragem_total: updated.reduce((s, a) => s + a.metragem, 0) });
  };

  const removeArea = (index: number) => {
    if (!analysisData) return;
    const updated = analysisData.areas_comuns.filter((_, i) => i !== index);
    setAnalysisData({ ...analysisData, areas_comuns: updated, metragem_total: updated.reduce((s, a) => s + a.metragem, 0) });
  };

  // ═══ STEP INDICATORS ═══
  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {(['cadastro', 'documento', 'revisao'] as Step[]).map((s, i) => (
        <View key={s} style={styles.stepItem}>
          <View style={[styles.stepCircle, step === s && styles.stepCircleActive, (['documento', 'revisao'].indexOf(step) > i - 1 && step !== s) && styles.stepCircleDone]}>
            <Text style={[styles.stepNumber, (step === s || ['documento', 'revisao'].indexOf(step) > i - 1) && styles.stepNumberActive]}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
            {s === 'cadastro' ? 'Dados' : s === 'documento' ? 'Documento' : 'Revisão'}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Cadastrar Condomínio</Text>
        <StepIndicator />

        {/* ═══ STEP 1: CADASTRO ═══ */}
        {step === 'cadastro' && (
          <>
            <Text style={styles.subtitle}>Informe o CNPJ para buscar os dados automaticamente</Text>

            <View style={styles.cnpjRow}>
              <View style={styles.cnpjInput}>
                <Input label="CNPJ do Condomínio" placeholder="00.000.000/0000-00" value={cnpj}
                  onChangeText={(text) => setCnpj(formatCnpj(text))} keyboardType="numeric" maxLength={18} containerStyle={{ marginBottom: 0 }} />
              </View>
              <Button title={loading ? '' : 'Buscar'} onPress={handleLookupCnpj} size="md" loading={loading}
                disabled={cnpj.replace(/\D/g, '').length < 14} style={styles.lookupButton} />
            </View>

            {lookupDone && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dados da Empresa</Text>
                  <Input label="Razão Social *" value={razaoSocial} onChangeText={setRazaoSocial} />
                  <Input label="Nome Fantasia" value={nomeFantasia} onChangeText={setNomeFantasia} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Endereço</Text>
                  <Input label="CEP *" value={cep} onChangeText={setCep} keyboardType="numeric" maxLength={9} />
                  <Input label="Endereço *" value={endereco} onChangeText={setEndereco} />
                  <View style={styles.row}>
                    <Input label="Número *" value={numero} onChangeText={setNumero} containerStyle={styles.halfInput} keyboardType="numeric" />
                    <Input label="Complemento" value={complemento} onChangeText={setComplemento} containerStyle={styles.halfInput} />
                  </View>
                  <View style={styles.row}>
                    <Input label="Cidade *" value={cidade} onChangeText={setCidade} containerStyle={styles.halfInput} />
                    <Input label="UF *" value={uf} onChangeText={setUf} maxLength={2} autoCapitalize="characters" containerStyle={styles.smallInput} />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Detalhes</Text>
                  <View style={styles.row}>
                    <Input label="Torres" value={numTorres} onChangeText={setNumTorres} keyboardType="numeric" containerStyle={styles.halfInput} />
                    <Input label="Unidades *" value={numUnidades} onChangeText={setNumUnidades} keyboardType="numeric" containerStyle={styles.halfInput} />
                  </View>
                </View>

                <Button title="Próximo: Documento" onPress={handleSaveCondo} loading={saving} size="lg" style={styles.saveButton} />
              </>
            )}
          </>
        )}

        {/* ═══ STEP 2: DOCUMENTO ═══ */}
        {step === 'documento' && (
          <>
            <Text style={styles.subtitle}>
              Envie a convenção ou regimento interno do condomínio para análise automática por IA
            </Text>

            <View style={styles.uploadCard}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color={documentUploaded ? COLORS.success : COLORS.textMuted} />
              <Text style={styles.uploadTitle}>
                {documentUploaded ? fileName : 'Convenção / Regimento Interno'}
              </Text>
              <Text style={styles.uploadDesc}>
                {documentUploaded
                  ? 'Documento enviado com sucesso!'
                  : 'PDF, JPG ou PNG — até 20MB'}
              </Text>

              {!documentUploaded && (
                <Button
                  title={uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                  onPress={handlePickDocument}
                  loading={uploading}
                  size="md"
                  style={{ marginTop: SPACING.md }}
                />
              )}
            </View>

            {documentUploaded && (
              <View style={styles.analyzeSection}>
                <Button
                  title={analyzing ? 'Analisando com IA...' : 'Analisar Documento'}
                  onPress={handleAnalyze}
                  loading={analyzing}
                  size="lg"
                  style={{ marginTop: SPACING.md }}
                />
                {analyzing && (
                  <Text style={styles.analyzeHint}>
                    A IA está lendo o documento e extraindo informações. Isso pode levar até 1 minuto.
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.skipButton} onPress={handleSkipDocument}>
              <Text style={styles.skipText}>Pular esta etapa (preencher depois)</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ═══ STEP 3: REVISÃO IA ═══ */}
        {step === 'revisao' && analysisData && (
          <>
            <Text style={styles.subtitle}>
              Revise os dados extraídos pela IA. Corrija o que for necessário.
            </Text>

            {/* Resumo */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumo do Condomínio</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Metragem total:</Text>
                <Text style={styles.summaryValue}>{analysisData.metragem_total} m²</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Portaria:</Text>
                <Text style={styles.summaryValue}>{analysisData.tem_portaria ? 'Sim' : 'Não'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Elevadores:</Text>
                <Text style={styles.summaryValue}>{analysisData.num_elevadores}</Text>
              </View>
              {analysisData.num_andares_por_torre && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Andares/torre:</Text>
                  <Text style={styles.summaryValue}>{analysisData.num_andares_por_torre}</Text>
                </View>
              )}
            </View>

            {/* Áreas comuns */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
              Áreas Comuns ({analysisData.areas_comuns.length})
            </Text>
            {analysisData.areas_comuns.map((area, i) => (
              <View key={i} style={styles.areaCard}>
                <View style={styles.areaHeader}>
                  <TextInput
                    style={styles.areaName}
                    value={area.nome}
                    onChangeText={(v) => updateArea(i, 'nome', v)}
                  />
                  <TouchableOpacity onPress={() => removeArea(i)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.areaRow}>
                  <View style={styles.areaField}>
                    <Text style={styles.areaLabel}>m²</Text>
                    <TextInput
                      style={styles.areaInput}
                      value={String(area.metragem)}
                      onChangeText={(v) => updateArea(i, 'metragem', Number(v) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.areaField}>
                    <Text style={styles.areaLabel}>Andar</Text>
                    <TextInput
                      style={styles.areaInput}
                      value={area.andar || ''}
                      onChangeText={(v) => updateArea(i, 'andar', v)}
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Regras */}
            {analysisData.regras_lixo && (
              <View style={styles.ruleCard}>
                <Ionicons name="trash-outline" size={18} color={COLORS.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>Regras de Lixo</Text>
                  <Text style={styles.ruleText}>{analysisData.regras_lixo}</Text>
                </View>
              </View>
            )}
            {analysisData.horario_mudanca && (
              <View style={styles.ruleCard}>
                <MaterialCommunityIcons name="truck-outline" size={18} color={COLORS.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>Horário de Mudança</Text>
                  <Text style={styles.ruleText}>{analysisData.horario_mudanca}</Text>
                </View>
              </View>
            )}
            {analysisData.horario_obra && (
              <View style={styles.ruleCard}>
                <MaterialCommunityIcons name="hammer" size={18} color={COLORS.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>Horário de Obra</Text>
                  <Text style={styles.ruleText}>{analysisData.horario_obra}</Text>
                </View>
              </View>
            )}

            <Button
              title="Confirmar Dados"
              onPress={handleConfirmAnalysis}
              loading={confirming}
              size="lg"
              style={styles.saveButton}
            />
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  backButton: { paddingVertical: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontFamily: FONTS.medium },
  title: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.lg, fontFamily: FONTS.regular },

  // Steps
  stepRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: SPACING.lg, gap: SPACING.xl },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepCircleDone: { backgroundColor: COLORS.primaryLight },
  stepNumber: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, color: COLORS.textMuted },
  stepNumberActive: { color: COLORS.white },
  stepLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 4 },
  stepLabelActive: { color: COLORS.primary },

  // Step 1
  cnpjRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  cnpjInput: { flex: 1 },
  lookupButton: { marginBottom: 0, height: 50 },
  section: { marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm },
  halfInput: { flex: 1 },
  smallInput: { width: 80 },
  saveButton: { width: '100%', marginTop: SPACING.xl },

  // Step 2
  uploadCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.xl,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    ...SHADOWS.sm,
  },
  uploadTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginTop: SPACING.sm },
  uploadDesc: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
  analyzeSection: { marginTop: SPACING.lg },
  analyzeHint: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
  skipButton: { alignItems: 'center', paddingVertical: SPACING.lg },
  skipText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, color: COLORS.textSecondary, textDecorationLine: 'underline' },

  // Step 3
  summaryCard: {
    backgroundColor: COLORS.primarySubtle, borderRadius: RADIUS.md, padding: SPACING.md,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  summaryTitle: { fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, color: COLORS.primary, marginBottom: SPACING.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.semibold, color: COLORS.textPrimary },

  areaCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.sm, padding: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  areaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  areaName: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, flex: 1 },
  areaRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  areaField: { flex: 1 },
  areaLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginBottom: 2 },
  areaInput: {
    backgroundColor: COLORS.gray50, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm,
    paddingVertical: 6, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textPrimary,
  },

  ruleCard: {
    flexDirection: 'row', backgroundColor: COLORS.secondaryLight, borderRadius: RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm,
  },
  ruleTitle: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, color: COLORS.secondaryDark },
  ruleText: { fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, color: COLORS.textPrimary, marginTop: 2 },
});
