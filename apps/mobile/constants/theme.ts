export const COLORS = {
  // Primary - Verde CondoDaily (confiança, Curitiba, natureza urbana)
  primary: '#1B7A6E',
  primaryDark: '#145C53',
  primaryDeeper: '#0E453E',
  primaryLight: '#E8F5F2',
  primarySubtle: '#F2FAF8',

  // Secondary - Laranja Ação (CTAs, destaques, acessibilidade)
  secondary: '#F5A623',
  secondaryDark: '#D4890A',
  secondaryLight: '#FFF4E0',

  // Accent (alias para o verde principal, usado em badges de segurança)
  accent: '#1B7A6E',
  accentLight: '#E8F5F2',
  accentDark: '#145C53',

  // Success / Status
  success: '#2E7D32',
  warning: '#F9A825',
  error: '#C62828',
  info: '#2196F3',

  // Neutrals (baseados no brand guide v2)
  white: '#FFFFFF',
  background: '#FAFBFC',
  card: '#FFFFFF',
  border: '#ECEFF1',
  gray50: '#F5F7F8',
  gray100: '#ECEFF1',
  gray200: '#D5DCE0',
  gray300: '#B0BEC5',
  gray400: '#8FA0AE',
  gray500: '#6B7D8D',
  gray700: '#3D4F5F',
  gray800: '#2D3E4F',
  dark: '#1A2B3C',
  textPrimary: '#1A2B3C',
  textSecondary: '#6B7D8D',
  textMuted: '#B0BEC5',
  placeholder: '#B0BEC5',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const FONTS = {
  // Display font - Plus Jakarta Sans (logo, títulos, botões, destaques)
  heading: 'PlusJakartaSans_700Bold',
  headingMedium: 'PlusJakartaSans_600SemiBold',
  headingExtra: 'PlusJakartaSans_800ExtraBold',

  // Body font - DM Sans (parágrafos, descrições, inputs, labels)
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',

  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 34,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#1B7A6E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1B7A6E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1B7A6E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
};
