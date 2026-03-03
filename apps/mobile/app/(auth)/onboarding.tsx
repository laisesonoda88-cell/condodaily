import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import {
  CONTRATANTE_ILLUSTRATIONS,
  PROFISSIONAL_ILLUSTRATIONS,
} from '../../components/OnboardingIllustrations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  bgColor: string;
}

const CONTRATANTE_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Bem-vindo ao CondoDaily!',
    description:
      'A plataforma que conecta seu condomínio aos melhores profissionais autônomos para diárias de limpeza, manutenção e muito mais.',
    bgColor: COLORS.primary,
  },
  {
    id: '2',
    title: 'Cadastre seu Condomínio',
    description:
      'Comece cadastrando seu condomínio com o CNPJ. Nosso sistema busca automaticamente os dados e cria sua CondoWallet para gerenciar pagamentos.',
    bgColor: COLORS.primaryDark,
  },
  {
    id: '3',
    title: 'Deposite na CondoWallet',
    description:
      'Faça depósitos via PIX na CondoWallet. O saldo é usado para pagar as diárias. É rápido, seguro e transparente.',
    bgColor: COLORS.primaryDeeper,
  },
  {
    id: '4',
    title: 'Busque Profissionais',
    description:
      'Pesquise profissionais por categoria (limpeza, elétrica, pintura...). Veja avaliações, preços e perfil completo antes de contratar.',
    bgColor: COLORS.primaryDark,
  },
  {
    id: '5',
    title: 'Agende a Diária',
    description:
      'Escolha data, horário e o valor/hora. O sistema calcula automaticamente o total, incluindo taxa da plataforma (5%) e seguro (R$ 5).',
    bgColor: COLORS.primary,
  },
  {
    id: '6',
    title: 'Seguro Automático',
    description:
      'Quando o profissional faz check-in, o seguro é ativado automaticamente. No check-out, é desativado. Você e o profissional ficam protegidos!',
    bgColor: COLORS.primaryDeeper,
  },
  {
    id: '7',
    title: 'Avalie o Serviço',
    description:
      'Após a conclusão, avalie o profissional com estrelas e comentários. Isso ajuda outros condomínios a encontrar os melhores profissionais!',
    bgColor: COLORS.primary,
  },
];

const PROFISSIONAL_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Bem-vindo ao CondoDaily!',
    description:
      'A plataforma onde você encontra diárias de trabalho em condomínios. Limpeza, manutenção, elétrica, pintura e muito mais!',
    bgColor: COLORS.secondary,
  },
  {
    id: '2',
    title: 'Complete o Quiz de Ética',
    description:
      'Antes de receber diárias, complete o quiz de ética profissional. São 5 perguntas e você precisa acertar 80%. É rápido e simples!',
    bgColor: COLORS.secondaryDark,
  },
  {
    id: '3',
    title: 'Configure seu Perfil',
    description:
      'Defina suas categorias de serviço, valor/hora e raio de atendimento. Um perfil completo atrai mais contratantes!',
    bgColor: COLORS.secondary,
  },
  {
    id: '4',
    title: 'Receba Solicitações',
    description:
      'Quando um condomínio agendar uma diária com você, receberá uma notificação. Aceite ou recuse — você tem total liberdade!',
    bgColor: COLORS.secondaryDark,
  },
  {
    id: '5',
    title: 'Check-in e Check-out',
    description:
      'Ao chegar no local, faça o check-in. O seguro é ativado automaticamente. Ao finalizar, faça o check-out e o pagamento é processado.',
    bgColor: COLORS.secondary,
  },
  {
    id: '6',
    title: 'Receba seus Ganhos',
    description:
      'Você recebe 95% do valor bruto da diária. A plataforma retém apenas 5% + R$ 5 de seguro (pago pelo condomínio). Transparência total!',
    bgColor: COLORS.secondaryDark,
  },
  {
    id: '7',
    title: 'Cresça na Plataforma',
    description:
      'Quanto mais diárias concluídas e melhores avaliações, mais visibilidade você terá. Suba de nível e conquiste mais oportunidades!',
    bgColor: COLORS.secondary,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isContratante = role !== 'PROFISSIONAL';
  const slides = isContratante ? CONTRATANTE_SLIDES : PROFISSIONAL_SLIDES;
  const illustrations = isContratante ? CONTRATANTE_ILLUSTRATIONS : PROFISSIONAL_ILLUSTRATIONS;
  const isLast = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.back();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleSkip = () => {
    router.back();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const IllustrationComponent = illustrations[index];
    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH, backgroundColor: item.bgColor }]}>
        {/* SVG Illustration */}
        <View style={styles.illustrationContainer}>
          {IllustrationComponent && <IllustrationComponent />}
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: slides[currentIndex].bgColor }]}>
      {/* Skip button */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>
          {currentIndex + 1}/{slides.length}
        </Text>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[styles.dot, { width: dotWidth, opacity }]}
            />
          );
        })}
      </View>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <View style={styles.nextContent}>
          <Text style={styles.nextText}>
            {isLast ? 'Começar!' : 'Próximo'}
          </Text>
          {!isLast && <Feather name="arrow-right" size={20} color={COLORS.white} />}
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.md, fontFamily: FONTS.medium },
  counter: { color: 'rgba(255,255,255,0.5)', fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },

  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    // Subtle shadow behind the illustration card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.sm,
  },
  slideTitle: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.heading,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  slideDescription: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.xs,
    fontFamily: FONTS.regular,
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },

  nextButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  nextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  nextText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
  },
});
