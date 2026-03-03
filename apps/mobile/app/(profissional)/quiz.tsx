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
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Button } from '../../components';
import { api } from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

interface Question {
  id: string;
  question: string;
  options: { id: string; text: string }[];
}

export default function QuizScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    passed: boolean;
    score: number;
    correct: number;
    total: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data } = await api.get('/professionals/quiz/questions');
      setQuestions(data.data);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar as perguntas');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert('Atenção', 'Responda todas as perguntas antes de enviar');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/professionals/quiz/submit', { answers });
      setResult(data.data);
    } catch {
      Alert.alert('Erro', 'Erro ao enviar respostas');
    } finally {
      setSubmitting(false);
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

  if (result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          {result.passed ? (
            <MaterialCommunityIcons name="party-popper" size={80} color={COLORS.success} style={{ marginBottom: SPACING.md }} />
          ) : (
            <MaterialCommunityIcons name="book-open-variant" size={80} color={COLORS.secondary} style={{ marginBottom: SPACING.md }} />
          )}
          <Text style={styles.resultTitle}>
            {result.passed ? 'Aprovado!' : 'Nao passou'}
          </Text>
          <Text style={styles.resultScore}>{result.score}%</Text>
          <Text style={styles.resultDetail}>
            {result.correct} de {result.total} corretas
          </Text>
          <Text style={styles.resultMessage}>{result.message}</Text>

          <Button
            title={result.passed ? 'Continuar' : 'Tentar Novamente'}
            onPress={() => {
              if (result.passed) {
                router.back();
              } else {
                setResult(null);
                setAnswers({});
              }
            }}
            variant={result.passed ? 'primary' : 'secondary'}
            size="lg"
            style={styles.resultButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="sunset" opacity={0.12} heightFraction={0.3} position="bottom" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={COLORS.secondary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <MaterialCommunityIcons name="school" size={48} color={COLORS.secondary} style={{ marginBottom: SPACING.sm }} />
          <Text style={styles.title}>Academy CondoDaily</Text>
          <Text style={styles.subtitle}>
            Quiz de Postura e Etica em Condominios
          </Text>
          <Text style={styles.hint}>
            Acerte pelo menos 80% para ativar seu perfil
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          <Text style={styles.progressText}>
            {Object.keys(answers).length} de {questions.length} respondidas
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(Object.keys(answers).length / questions.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Questions */}
        {questions.map((q, index) => (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Pergunta {index + 1}</Text>
            <Text style={styles.questionText}>{q.question}</Text>

            {q.options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionButton,
                  answers[q.id] === opt.id && styles.optionSelected,
                ]}
                onPress={() => selectAnswer(q.id, opt.id)}
              >
                <View
                  style={[
                    styles.optionRadio,
                    answers[q.id] === opt.id && styles.optionRadioSelected,
                  ]}
                >
                  {answers[q.id] === opt.id && <View style={styles.optionRadioDot} />}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    answers[q.id] === opt.id && styles.optionTextSelected,
                  ]}
                >
                  {opt.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Button
          title="Enviar Respostas"
          onPress={handleSubmit}
          loading={submitting}
          disabled={Object.keys(answers).length < questions.length}
          size="lg"
          variant="secondary"
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.xs },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.secondary, fontFamily: FONTS.medium },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: FONTS.sizes.xl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center', fontFamily: FONTS.regular },
  hint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.secondary,
    fontFamily: FONTS.semibold,
    marginTop: SPACING.sm,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  progress: { marginBottom: SPACING.lg },
  progressText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs, fontFamily: FONTS.regular },
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: RADIUS.full },
  progressFill: { height: 6, backgroundColor: COLORS.secondary, borderRadius: RADIUS.full },
  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  questionNumber: { fontSize: FONTS.sizes.xs, color: COLORS.secondary, fontFamily: FONTS.bold, marginBottom: SPACING.xs },
  questionText: { fontSize: FONTS.sizes.md, fontFamily: FONTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.md, lineHeight: 24 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  optionSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: '#FFF8E7',
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  optionRadioSelected: {
    borderColor: COLORS.secondary,
  },
  optionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  optionText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, lineHeight: 20, fontFamily: FONTS.regular },
  optionTextSelected: { fontFamily: FONTS.semibold, color: COLORS.secondaryDark },
  submitButton: { width: '100%', marginTop: SPACING.md },
  // Result screen
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  resultTitle: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  resultScore: { fontSize: 60, fontFamily: FONTS.bold, color: COLORS.secondary, marginVertical: SPACING.sm },
  resultDetail: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  resultMessage: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md, lineHeight: 22, fontFamily: FONTS.regular },
  resultButton: { width: '100%', marginTop: SPACING.xl },
});
