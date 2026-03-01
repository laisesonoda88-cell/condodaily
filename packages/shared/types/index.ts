// User roles
export type UserRole = 'CONTRATANTE' | 'PROFISSIONAL';

// Booking statuses
export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

// Condo size classification
export type CondoPorte = 'P' | 'M' | 'G';

// Wallet transaction types
export type WalletTransactionType = 'DEPOSIT' | 'DEBIT' | 'REFUND';

// Payment methods
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

// Fibonacci gamification levels
export type FibonacciLevel = 0 | 8 | 13 | 21 | 34 | 55 | 89;

// Mercado Pago payment statuses
export type MpPaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'AUTHORIZED'
  | 'IN_PROCESS'
  | 'IN_MEDIATION'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'CHARGED_BACK';

// Payout statuses
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// Payment source (how the contratante pays)
export type PaymentSource = 'MERCADO_PAGO' | 'WALLET';

// PIX key types
export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

// Booking payment status
export type BookingPaymentStatus = 'UNPAID' | 'PAID' | 'RELEASED' | 'REFUNDED';

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User
export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  cpf: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

// Auth
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  cpf: string;
  phone: string;
  role: UserRole;
}

// Condo
export interface Condo {
  id: string;
  user_id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string | null;
  cidade: string;
  uf: string;
  num_torres: number;
  num_unidades: number;
  areas_lazer: string[];
  porte: CondoPorte;
  latitude: number | null;
  longitude: number | null;
}

// Professional Profile
export interface ProfessionalProfile {
  id: string;
  user_id: string;
  bio: string | null;
  hourly_rate: number;
  service_radius_km: number;
  latitude: number | null;
  longitude: number | null;
  avg_rating: number;
  total_services: number;
  fibonacci_level: number;
  quiz_approved: boolean;
}

// Service Category
export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
}

// Booking
export interface Booking {
  id: string;
  contratante_id: string;
  profissional_id: string;
  condo_id: string;
  category_id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: BookingStatus;
  check_in_at: string | null;
  check_out_at: string | null;
  hourly_rate: number;
  total_hours: number;
  gross_amount: number;
  platform_fee: number;
  insurance_fee: number;
  net_professional_amount: number;
  notes: string | null;
  payment_status: BookingPaymentStatus;
  payment_id: string | null;
  contratante_confirmed: boolean;
  profissional_confirmed: boolean;
  created_at: string;
}

// Review
export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// Payment (Mercado Pago)
export interface Payment {
  id: string;
  booking_id: string | null;
  payer_id: string;
  mp_payment_id: string | null;
  mp_external_reference: string | null;
  amount: number;
  platform_fee: number | null;
  net_amount: number | null;
  payment_method: PaymentMethod;
  status: MpPaymentStatus;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_copy_paste: string | null;
  boleto_url: string | null;
  boleto_barcode: string | null;
  boleto_due_date: string | null;
  card_last_four: string | null;
  card_brand: string | null;
  installments: number;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Professional Payment Info
export interface ProfessionalPaymentInfo {
  id: string;
  user_id: string;
  pix_key_type: PixKeyType | null;
  pix_key: string | null;
  mp_user_id: string | null;
  mp_connected: boolean;
  is_verified: boolean;
  verified_at: string | null;
}

// Payout
export interface Payout {
  id: string;
  professional_id: string;
  booking_id: string;
  amount: number;
  status: PayoutStatus;
  pix_key: string | null;
  mp_transfer_id: string | null;
  processed_at: string | null;
  created_at: string;
}

// Wallet
export interface CondoWallet {
  id: string;
  condo_id: string;
  balance: number;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  booking_id: string | null;
  payment_method: PaymentMethod | null;
  external_payment_id: string | null;
  status: string;
  created_at: string;
}
