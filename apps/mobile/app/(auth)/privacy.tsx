import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Política de Privacidade</Text>
        <Text style={styles.updated}>Última atualização: 20 de fevereiro de 2026</Text>

        <Text style={styles.heading}>1. Informações Coletadas</Text>
        <Text style={styles.paragraph}>
          O CondoDaily coleta as seguintes informações pessoais:{'\n'}
          • Nome completo e CPF (para identificação){'\n'}
          • Email e telefone (para comunicação){'\n'}
          • Dados do condomínio (CNPJ, endereço) para contratantes{'\n'}
          • Localização (GPS) durante check-in e check-out{'\n'}
          • Dados de transações financeiras na plataforma{'\n'}
          • Avaliações e comentários sobre serviços
        </Text>

        <Text style={styles.heading}>2. Uso das Informações</Text>
        <Text style={styles.paragraph}>
          Suas informações são utilizadas para:{'\n'}
          • Criar e gerenciar sua conta na plataforma{'\n'}
          • Conectar contratantes e profissionais{'\n'}
          • Processar pagamentos e transferências{'\n'}
          • Ativar e desativar o seguro durante serviços{'\n'}
          • Verificar a localização no check-in/check-out{'\n'}
          • Aplicar o controle anti-habitualidade (limite de 3 contratações){'\n'}
          • Enviar notificações sobre agendamentos{'\n'}
          • Melhorar a experiência do usuário
        </Text>

        <Text style={styles.heading}>3. Localização</Text>
        <Text style={styles.paragraph}>
          A localização GPS é coletada APENAS nos momentos de check-in e check-out do serviço,
          para validar a presença do profissional no local de trabalho e ativar/desativar
          a cobertura de seguro. Não rastreamos sua localização em tempo real nem
          armazenamos histórico de localização fora desses momentos.
        </Text>

        <Text style={styles.heading}>4. Compartilhamento de Dados</Text>
        <Text style={styles.paragraph}>
          Seus dados NÃO são vendidos a terceiros. Compartilhamos informações apenas:{'\n'}
          • Com o outro participante do agendamento (contratante/profissional){'\n'}
          • Com processadores de pagamento (Asaas) para transações financeiras{'\n'}
          • Com seguradoras para cobertura durante serviços{'\n'}
          • Quando exigido por lei ou ordem judicial
        </Text>

        <Text style={styles.heading}>5. Segurança</Text>
        <Text style={styles.paragraph}>
          Adotamos medidas de segurança para proteger seus dados:{'\n'}
          • Senhas armazenadas com hash bcrypt{'\n'}
          • Comunicação via HTTPS (SSL/TLS){'\n'}
          • Tokens JWT com expiração para autenticação{'\n'}
          • Banco de dados com acesso restrito
        </Text>

        <Text style={styles.heading}>6. Armazenamento</Text>
        <Text style={styles.paragraph}>
          Seus dados são armazenados em servidores seguros no Brasil, em conformidade
          com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          Os dados são mantidos enquanto sua conta estiver ativa.
        </Text>

        <Text style={styles.heading}>7. Seus Direitos (LGPD)</Text>
        <Text style={styles.paragraph}>
          Conforme a LGPD, você tem direito a:{'\n'}
          • Acessar seus dados pessoais{'\n'}
          • Corrigir dados incompletos ou desatualizados{'\n'}
          • Solicitar a exclusão de seus dados{'\n'}
          • Revogar o consentimento para uso de dados{'\n'}
          • Solicitar portabilidade dos dados{'\n'}
          • Ser informado sobre o compartilhamento de dados
        </Text>

        <Text style={styles.heading}>8. Cookies e Tecnologias</Text>
        <Text style={styles.paragraph}>
          O aplicativo utiliza AsyncStorage para manter sua sessão ativa localmente.
          Não utilizamos cookies de rastreamento ou publicidade no aplicativo.
        </Text>

        <Text style={styles.heading}>9. Menores de Idade</Text>
        <Text style={styles.paragraph}>
          O CondoDaily não é destinado a menores de 18 anos. Não coletamos
          intencionalmente dados de menores de idade.
        </Text>

        <Text style={styles.heading}>10. Contato do Encarregado (DPO)</Text>
        <Text style={styles.paragraph}>
          Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:{'\n'}
          Email: privacidade@condodaily.com.br{'\n'}
          Site: condodaily.com.br
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
