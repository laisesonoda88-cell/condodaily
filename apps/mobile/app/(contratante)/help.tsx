import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const FAQ_ITEMS = [
  {
    question: 'Como funciona o CondoDaily?',
    answer:
      'O CondoDaily conecta condomínios a profissionais qualificados para serviços de limpeza, manutenção, jardinagem e muito mais. Basta cadastrar seu condomínio, buscar profissionais disponíveis e agendar o serviço direto pelo app.',
  },
  {
    question: 'Como cancelo um agendamento?',
    answer:
      'Você pode cancelar um agendamento pela tela de detalhes do serviço. Cancelamentos feitos com mais de 48 horas de antecedência são gratuitos. Após esse prazo, uma taxa de 30% sobre o valor do serviço será cobrada.',
  },
  {
    question: 'Como funciona o pagamento?',
    answer:
      'Os pagamentos são feitos pelo app via PIX, cartão de crédito ou boleto. O valor fica retido até que ambas as partes confirmem a conclusão do serviço, garantindo segurança para todos.',
  },
  {
    question: 'Como excluo minha conta?',
    answer:
      'Acesse Perfil e toque em "Excluir minha conta" na parte inferior da tela. Seus dados serão removidos conforme nossa política de privacidade. Agendamentos em andamento precisam ser finalizados antes da exclusão.',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const openEmail = () => {
    Linking.openURL('mailto:contato@condodaily.com.br');
  };

  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/5541999874274');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Ajuda e Suporte</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Escolha uma das opcoes abaixo para entrar em contato ou consulte as perguntas frequentes.
        </Text>

        {/* Email Card */}
        <TouchableOpacity style={styles.contactCard} onPress={openEmail} activeOpacity={0.7}>
          <View style={[styles.contactIconContainer, { backgroundColor: COLORS.primaryLight }]}>
            <MaterialCommunityIcons name="email-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>E-mail</Text>
            <Text style={styles.contactDescription}>contato@condodaily.com.br</Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* WhatsApp Card */}
        <TouchableOpacity style={styles.contactCard} onPress={openWhatsApp} activeOpacity={0.7}>
          <View style={[styles.contactIconContainer, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>WhatsApp</Text>
            <Text style={styles.contactDescription}>Fale conosco pelo WhatsApp</Text>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>

        {FAQ_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.faqCard}
            onPress={() => toggleFaq(index)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <View style={[styles.contactIconContainer, { backgroundColor: COLORS.primaryLight }]}>
                <Feather name="help-circle" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Feather
                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textMuted}
              />
            </View>
            {expandedIndex === index && (
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  contactIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semibold,
    color: COLORS.textPrimary,
  },
  contactDescription: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  faqCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semibold,
    color: COLORS.textPrimary,
  },
  faqAnswer: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginLeft: 44 + SPACING.md,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: SPACING.xxl,
  },
});
