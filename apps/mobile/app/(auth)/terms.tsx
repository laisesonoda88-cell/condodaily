import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { CityBackground } from '../../components/CityBackground';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <CityBackground variant="day" opacity={0.12} heightFraction={0.3} position="bottom" />
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Termos de Uso</Text>
        <Text style={styles.updated}>Última atualização: 20 de fevereiro de 2026</Text>

        <Text style={styles.heading}>1. Aceitação dos Termos</Text>
        <Text style={styles.paragraph}>
          Ao acessar e usar o aplicativo CondoDaily, você concorda com estes Termos de Uso.
          O CondoDaily é uma plataforma de marketplace que conecta condomínios (contratantes) a
          profissionais autônomos para serviços de manutenção e limpeza em regime de diária.
        </Text>

        <Text style={styles.heading}>2. Natureza do Serviço</Text>
        <Text style={styles.paragraph}>
          O CondoDaily atua exclusivamente como intermediador entre contratantes e profissionais
          autônomos. NÃO há vínculo empregatício entre as partes. Os profissionais prestam serviços
          como autônomos, sendo responsáveis por seus próprios encargos fiscais e previdenciários.
          Para proteção legal de ambas as partes, existe um limite máximo de 3 contratações do
          mesmo profissional pelo mesmo contratante no período de 30 dias.
        </Text>

        <Text style={styles.heading}>3. Cadastro e Conta</Text>
        <Text style={styles.paragraph}>
          Para utilizar o CondoDaily, é necessário criar uma conta fornecendo informações
          verdadeiras, incluindo CPF válido. Cada CPF pode ter apenas uma conta.
          Você é responsável pela segurança de suas credenciais de acesso.
        </Text>

        <Text style={styles.heading}>4. Pagamentos e Taxas</Text>
        <Text style={styles.paragraph}>
          O contratante deposita créditos na CondoWallet antes de agendar serviços.
          Ao criar um agendamento, o valor total é reservado automaticamente.
          A plataforma retém uma taxa de 5% sobre o valor bruto do serviço, mais uma taxa
          fixa de R$ 5,00 referente ao seguro da diária. O valor líquido é transferido ao
          profissional após a conclusão do serviço (check-out). Em caso de cancelamento
          antes do início do serviço, o valor total é reembolsado integralmente à CondoWallet.
        </Text>

        <Text style={styles.heading}>5. Seguro</Text>
        <Text style={styles.paragraph}>
          Durante o período entre o check-in e o check-out, ambas as partes contam com
          cobertura de seguro básico, ativado automaticamente pelo sistema de geolocalização.
          O custo do seguro (R$ 5,00 por diária) é incluído no valor total do agendamento.
        </Text>

        <Text style={styles.heading}>6. Quiz de Ética Profissional</Text>
        <Text style={styles.paragraph}>
          Profissionais devem completar e ser aprovados em um quiz de ética e boas práticas
          antes de receber agendamentos. A aprovação mínima é de 80%.
        </Text>

        <Text style={styles.heading}>7. Avaliações</Text>
        <Text style={styles.paragraph}>
          Após a conclusão de cada serviço, o contratante pode avaliar o profissional
          com uma nota de 1 a 5 estrelas e um comentário. As avaliações são públicas
          e influenciam o nível do profissional na plataforma.
        </Text>

        <Text style={styles.heading}>8. Cancelamento</Text>
        <Text style={styles.paragraph}>
          Agendamentos podem ser cancelados por qualquer uma das partes antes do início
          do serviço (check-in). Após o check-in, o cancelamento não é mais possível.
          Cancelamentos frequentes podem resultar em restrições na conta.
        </Text>

        <Text style={styles.heading}>9. Privacidade</Text>
        <Text style={styles.paragraph}>
          O uso de seus dados pessoais é regido pela nossa Política de Privacidade.
          Ao usar o CondoDaily, você consente com a coleta e processamento de dados
          conforme descrito na política.
        </Text>

        <Text style={styles.heading}>10. Contato</Text>
        <Text style={styles.paragraph}>
          Para dúvidas sobre estes termos, entre em contato através do email
          contato@condodaily.com.br
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  back: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  backText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontWeight: '500' },
  content: { paddingHorizontal: SPACING.lg },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  updated: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.lg },
  heading: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  paragraph: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 22 },
});
