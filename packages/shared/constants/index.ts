// Platform fees
export const PLATFORM_FEE_PERCENTAGE = 0.05; // 5%
export const INSURANCE_FEE_FIXED = 5.0; // R$5.00 per booking

// Anti-habituality
export const MAX_BOOKINGS_SAME_PROFESSIONAL_30D = 3;

// Ratings
export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const GAMIFICATION_MIN_RATING = 4.8;

// Fibonacci levels for gamification
export const FIBONACCI_LEVELS = [8, 13, 21, 34, 55, 89] as const;

// Service categories (default)
export const DEFAULT_CATEGORIES = [
  { name: 'Limpeza Geral', slug: 'limpeza-geral', icon: 'broom' },
  { name: 'Limpeza de Piscina', slug: 'limpeza-piscina', icon: 'pool' },
  { name: 'Jardinagem', slug: 'jardinagem', icon: 'leaf' },
  { name: 'Manutenção Elétrica', slug: 'manutencao-eletrica', icon: 'zap' },
  { name: 'Manutenção Hidráulica', slug: 'manutencao-hidraulica', icon: 'droplet' },
  { name: 'Pintura', slug: 'pintura', icon: 'paintbrush' },
  { name: 'Limpeza de Vidros', slug: 'limpeza-vidros', icon: 'maximize' },
  { name: 'Portaria', slug: 'portaria', icon: 'shield' },
  { name: 'Salão de Festas', slug: 'salao-festas', icon: 'party-popper' },
  { name: 'Serviços Gerais', slug: 'servicos-gerais', icon: 'wrench' },
] as const;

// Condo porte classification thresholds
export const CONDO_PORTE = {
  P: { maxUnidades: 50, label: 'Pequeno' },
  M: { maxUnidades: 200, label: 'Médio' },
  G: { maxUnidades: Infinity, label: 'Grande' },
} as const;

// Professional search defaults
export const DEFAULT_SEARCH_RADIUS_KM = 15;
export const MAX_SEARCH_RADIUS_KM = 50;

// Mercado Pago
export const MP_PIX_EXPIRATION_MINUTES = 30;
export const MP_BOLETO_EXPIRATION_DAYS = 3;
export const MP_MAX_INSTALLMENTS = 12;
export const MP_MIN_INSTALLMENT_VALUE = 5.0; // R$5.00 mínimo por parcela

// Payment polling
export const PAYMENT_POLLING_INTERVAL_MS = 5000; // 5 segundos
export const PAYMENT_MAX_POLLING_ATTEMPTS = 360; // 30 min / 5s
