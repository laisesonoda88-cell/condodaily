import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
  pgEnum,
  real,
  serial,
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['CONTRATANTE', 'PROFISSIONAL']);
export const condoAreaTypeEnum = pgEnum('condo_area_type', [
  'SALAO_FESTAS',
  'PISCINA',
  'ACADEMIA',
  'CHURRASQUEIRA',
  'PLAYGROUND',
  'QUADRA',
  'JARDIM',
  'HALL',
  'GARAGEM',
  'LAVANDERIA',
  'SAUNA',
  'BRINQUEDOTECA',
  'COWORKING',
  'PET_PLACE',
  'OUTRO',
]);
export const bookingStatusEnum = pgEnum('booking_status', [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export const condoPorteEnum = pgEnum('condo_porte', ['P', 'M', 'G']);
export const walletTxTypeEnum = pgEnum('wallet_tx_type', ['DEPOSIT', 'DEBIT', 'REFUND']);
export const paymentMethodEnum = pgEnum('payment_method', ['PIX', 'CREDIT_CARD', 'BOLETO']);
export const mpPaymentStatusEnum = pgEnum('mp_payment_status', [
  'PENDING',
  'APPROVED',
  'AUTHORIZED',
  'IN_PROCESS',
  'IN_MEDIATION',
  'REJECTED',
  'CANCELLED',
  'REFUNDED',
  'CHARGED_BACK',
]);
export const payoutStatusEnum = pgEnum('payout_status', [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
export const penaltyReasonEnum = pgEnum('penalty_reason', [
  'NO_SHOW',       // Não compareceu
  'LATE_CANCEL',   // Cancelou após aceitar
]);
export const penaltyStatusEnum = pgEnum('penalty_status', [
  'PENDING',       // Aguardando desconto
  'APPLIED',       // Descontado da próxima diária
  'WAIVED',        // Dispensado (admin)
]);
export const pixKeyTypeEnum = pgEnum('pix_key_type', [
  'CPF',
  'CNPJ',
  'EMAIL',
  'PHONE',
  'RANDOM',
]);
export const maintenanceFrequencyEnum = pgEnum('maintenance_frequency', [
  'MENSAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
  'BIENAL',
  'QUINQUENAL',
]);
export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'EM_DIA',
  'VENCENDO',
  'VENCIDO',
  'NAO_INFORMADO',
]);

// ─── Users ────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull().unique(),
  role: userRoleEnum('role').notNull(),
  avatar_url: text('avatar_url'),
  is_active: boolean('is_active').default(true).notNull(),
  is_verified: boolean('is_verified').default(false).notNull(),
  push_token: varchar('push_token', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Condos ───────────────────────────────────────────────
export const condos = pgTable('condos', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  cnpj: varchar('cnpj', { length: 18 }).notNull().unique(),
  razao_social: varchar('razao_social', { length: 255 }).notNull(),
  nome_fantasia: varchar('nome_fantasia', { length: 255 }),
  cep: varchar('cep', { length: 10 }).notNull(),
  endereco: varchar('endereco', { length: 255 }).notNull(),
  numero: varchar('numero', { length: 20 }).notNull(),
  complemento: varchar('complemento', { length: 100 }),
  cidade: varchar('cidade', { length: 100 }).notNull(),
  uf: varchar('uf', { length: 2 }).notNull(),
  num_torres: integer('num_torres').default(1).notNull(),
  num_unidades: integer('num_unidades').default(1).notNull(),
  areas_lazer: text('areas_lazer').default('[]'),
  porte: condoPorteEnum('porte').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  // Campos do sistema multi-condomínio + análise IA
  metragem_total: real('metragem_total'),
  tem_portaria: boolean('tem_portaria').default(false).notNull(),
  num_andares_por_torre: integer('num_andares_por_torre'),
  num_elevadores: integer('num_elevadores').default(0).notNull(),
  regras_lixo: text('regras_lixo'),
  horario_mudanca: text('horario_mudanca'),
  horario_obra: text('horario_obra'),
  documento_url: text('documento_url'),
  documento_analisado: boolean('documento_analisado').default(false).notNull(),
  dados_extraidos: text('dados_extraidos'), // JSON bruto da IA
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Condo Areas (áreas comuns com metragem) ─────────────
export const condoAreas = pgTable('condo_areas', {
  id: uuid('id').defaultRandom().primaryKey(),
  condo_id: uuid('condo_id')
    .references(() => condos.id, { onDelete: 'cascade' })
    .notNull(),
  nome: varchar('nome', { length: 100 }).notNull(),
  metragem: real('metragem').notNull(),
  tipo: condoAreaTypeEnum('tipo').notNull(),
  andar: varchar('andar', { length: 50 }),
  observacoes: text('observacoes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Condo Maintenance Items (Manutenções periódicas) ────
export const condoMaintenanceItems = pgTable('condo_maintenance_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  condo_id: uuid('condo_id')
    .references(() => condos.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  frequency: maintenanceFrequencyEnum('frequency').notNull(),
  category_slug: varchar('category_slug', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }).notNull(),
  is_mandatory: boolean('is_mandatory').default(false).notNull(),
  last_done: timestamp('last_done'),
  next_due: timestamp('next_due'),
  status: maintenanceStatusEnum('status').default('NAO_INFORMADO').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Service Estimation Params ───────────────────────────
export const serviceEstimationParams = pgTable('service_estimation_params', {
  id: uuid('id').defaultRandom().primaryKey(),
  category_id: uuid('category_id')
    .references(() => serviceCategories.id)
    .notNull()
    .unique(),
  m2_por_hora: real('m2_por_hora').notNull(),
  min_horas: real('min_horas').default(4).notNull(),
  max_horas: real('max_horas').default(8).notNull(),
  fator_complexidade: real('fator_complexidade').default(1.0).notNull(),
  descricao: text('descricao'),
});

// ─── Professional Profiles ────────────────────────────────
export const professionalProfiles = pgTable('professional_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  bio: text('bio'),
  hourly_rate: decimal('hourly_rate', { precision: 10, scale: 2 }).default('0').notNull(),
  service_radius_km: integer('service_radius_km').default(15).notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  avg_rating: real('avg_rating').default(0).notNull(),
  total_services: integer('total_services').default(0).notNull(),
  fibonacci_level: integer('fibonacci_level').default(0).notNull(),
  quiz_approved: boolean('quiz_approved').default(false).notNull(),
  quiz_approved_at: timestamp('quiz_approved_at'),
  // Disponibilidade especial
  disponivel_fim_semana: boolean('disponivel_fim_semana').default(false).notNull(),
  disponivel_feriados: boolean('disponivel_feriados').default(false).notNull(),
  // Sistema de multas e bloqueio
  penalty_count: integer('penalty_count').default(0).notNull(), // faltas/cancelamentos total
  pending_penalty_amount: decimal('pending_penalty_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  is_blocked: boolean('is_blocked').default(false).notNull(),
  blocked_at: timestamp('blocked_at'),
  blocked_reason: text('blocked_reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Professional Penalties (Multas) ─────────────────────
export const professionalPenalties = pgTable('professional_penalties', {
  id: uuid('id').defaultRandom().primaryKey(),
  professional_id: uuid('professional_id')
    .references(() => users.id)
    .notNull(),
  booking_id: uuid('booking_id')
    .references(() => bookings.id)
    .notNull(),
  reason: penaltyReasonEnum('reason').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // valor da multa
  status: penaltyStatusEnum('status').default('PENDING').notNull(),
  applied_in_booking_id: uuid('applied_in_booking_id').references(() => bookings.id), // booking onde foi descontado
  applied_at: timestamp('applied_at'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Service Categories ───────────────────────────────────
export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  icon: varchar('icon', { length: 50 }).notNull(),
  description: text('description'),
});

// ─── Professional Services (N:N) ─────────────────────────
export const professionalServices = pgTable('professional_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  professional_id: uuid('professional_id')
    .references(() => professionalProfiles.id)
    .notNull(),
  category_id: uuid('category_id')
    .references(() => serviceCategories.id)
    .notNull(),
  is_certified: boolean('is_certified').default(false).notNull(),
  certified_at: timestamp('certified_at'),
});

// ─── Bookings ─────────────────────────────────────────────
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  contratante_id: uuid('contratante_id')
    .references(() => users.id)
    .notNull(),
  profissional_id: uuid('profissional_id')
    .references(() => users.id)
    .notNull(),
  condo_id: uuid('condo_id')
    .references(() => condos.id)
    .notNull(),
  category_id: uuid('category_id')
    .references(() => serviceCategories.id)
    .notNull(),
  scheduled_date: varchar('scheduled_date', { length: 10 }).notNull(), // YYYY-MM-DD
  scheduled_start: varchar('scheduled_start', { length: 5 }).notNull(), // HH:MM
  scheduled_end: varchar('scheduled_end', { length: 5 }).notNull(), // HH:MM
  status: bookingStatusEnum('status').default('PENDING').notNull(),
  check_in_at: timestamp('check_in_at'),
  check_in_lat: real('check_in_lat'),
  check_in_lng: real('check_in_lng'),
  check_out_at: timestamp('check_out_at'),
  check_out_lat: real('check_out_lat'),
  check_out_lng: real('check_out_lng'),
  hourly_rate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  total_hours: real('total_hours'),
  gross_amount: decimal('gross_amount', { precision: 10, scale: 2 }),
  platform_fee: decimal('platform_fee', { precision: 10, scale: 2 }),
  insurance_fee: decimal('insurance_fee', { precision: 10, scale: 2 }),
  net_professional_amount: decimal('net_professional_amount', { precision: 10, scale: 2 }),
  notes: text('notes'),
  payment_status: varchar('payment_status', { length: 50 }).default('UNPAID').notNull(),
  payment_id: uuid('payment_id'),
  contratante_confirmed: boolean('contratante_confirmed').default(false).notNull(),
  profissional_confirmed: boolean('profissional_confirmed').default(false).notNull(),
  // Aceite contratual (termos de cancelamento e multa)
  contract_accepted_contratante: boolean('contract_accepted_contratante').default(false).notNull(),
  contract_accepted_profissional: boolean('contract_accepted_profissional').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Condo Wallets ────────────────────────────────────────
export const condoWallets = pgTable('condo_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  condo_id: uuid('condo_id')
    .references(() => condos.id)
    .notNull()
    .unique(),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Wallet Transactions ──────────────────────────────────
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  wallet_id: uuid('wallet_id')
    .references(() => condoWallets.id)
    .notNull(),
  type: walletTxTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  booking_id: uuid('booking_id').references(() => bookings.id),
  payment_method: paymentMethodEnum('payment_method'),
  external_payment_id: varchar('external_payment_id', { length: 255 }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Reviews ──────────────────────────────────────────────
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  booking_id: uuid('booking_id')
    .references(() => bookings.id)
    .notNull(),
  reviewer_id: uuid('reviewer_id')
    .references(() => users.id)
    .notNull(),
  reviewed_id: uuid('reviewed_id')
    .references(() => users.id)
    .notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Anti-Habituality Log ─────────────────────────────────
export const antiHabitualityLog = pgTable('anti_habituality_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  contratante_id: uuid('contratante_id')
    .references(() => users.id)
    .notNull(),
  profissional_id: uuid('profissional_id')
    .references(() => users.id)
    .notNull(),
  booking_count_30d: integer('booking_count_30d').default(0).notNull(),
  last_booking_date: timestamp('last_booking_date'),
  flagged: boolean('flagged').default(false).notNull(),
});

// ─── Payments (Mercado Pago) ─────────────────────────────
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  booking_id: uuid('booking_id').references(() => bookings.id),
  payer_id: uuid('payer_id')
    .references(() => users.id)
    .notNull(),
  mp_payment_id: varchar('mp_payment_id', { length: 100 }),
  mp_preference_id: varchar('mp_preference_id', { length: 255 }),
  mp_external_reference: varchar('mp_external_reference', { length: 255 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  platform_fee: decimal('platform_fee', { precision: 10, scale: 2 }),
  net_amount: decimal('net_amount', { precision: 10, scale: 2 }),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  status: mpPaymentStatusEnum('status').default('PENDING').notNull(),
  pix_qr_code: text('pix_qr_code'),
  pix_qr_code_base64: text('pix_qr_code_base64'),
  pix_copy_paste: text('pix_copy_paste'),
  boleto_url: text('boleto_url'),
  boleto_barcode: varchar('boleto_barcode', { length: 100 }),
  boleto_due_date: varchar('boleto_due_date', { length: 10 }),
  card_last_four: varchar('card_last_four', { length: 4 }),
  card_brand: varchar('card_brand', { length: 30 }),
  installments: integer('installments').default(1),
  mp_raw_response: text('mp_raw_response'),
  error_message: text('error_message'),
  paid_at: timestamp('paid_at'),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Professional Payment Info ───────────────────────────
export const professionalPaymentInfo = pgTable('professional_payment_info', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  pix_key_type: pixKeyTypeEnum('pix_key_type'),
  pix_key: varchar('pix_key', { length: 255 }),
  mp_user_id: varchar('mp_user_id', { length: 100 }),
  mp_access_token: varchar('mp_access_token', { length: 500 }), // L6: encrypt/decrypt via services/crypto.ts
  mp_connected: boolean('mp_connected').default(false).notNull(),
  bank_name: varchar('bank_name', { length: 100 }),
  bank_agency: varchar('bank_agency', { length: 20 }),
  bank_account: varchar('bank_account', { length: 30 }),
  bank_account_type: varchar('bank_account_type', { length: 20 }),
  is_verified: boolean('is_verified').default(false).notNull(),
  verified_at: timestamp('verified_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Payouts (Transferências para profissionais) ─────────
export const payouts = pgTable('payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  professional_id: uuid('professional_id')
    .references(() => users.id)
    .notNull(),
  booking_id: uuid('booking_id')
    .references(() => bookings.id)
    .notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: payoutStatusEnum('status').default('PENDING').notNull(),
  mp_payment_id: varchar('mp_payment_id', { length: 100 }),
  mp_transfer_id: varchar('mp_transfer_id', { length: 100 }),
  pix_key: varchar('pix_key', { length: 255 }),
  error_message: text('error_message'),
  processed_at: timestamp('processed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Used Refresh Tokens (L2: Token Rotation Blacklist) ──
export const usedRefreshTokens = pgTable('used_refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token_hash: varchar('token_hash', { length: 64 }).notNull().unique(), // SHA256 hash
  user_id: uuid('user_id').references(() => users.id).notNull(),
  expires_at: timestamp('expires_at').notNull(), // auto-cleanup
  used_at: timestamp('used_at').defaultNow().notNull(),
});

// ─── Webhook Events (Log do Mercado Pago) ────────────────
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  mp_event_id: varchar('mp_event_id', { length: 100 }),
  event_type: varchar('event_type', { length: 100 }).notNull(),
  resource_id: varchar('resource_id', { length: 100 }),
  resource_type: varchar('resource_type', { length: 50 }),
  raw_payload: text('raw_payload').notNull(),
  processed: boolean('processed').default(false).notNull(),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Lead Types & Sources (Pré-lançamento) ──────────────
export const leadTypeEnum = pgEnum('lead_type', [
  'SINDICO',
  'PROFISSIONAL',
  'MORADOR',
  'OUTRO',
]);

export const leadSourceEnum = pgEnum('lead_source', [
  'LANDING_PAGE',
  'REFERRAL',
  'QUIZ',
  'CTA_CONDOMINIO',
  'CTA_PROFISSIONAL',
]);

// ─── Early Leads (Cadastros pré-lançamento) ──────────────
export const earlyLeads = pgTable('early_leads', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  type: leadTypeEnum('type').notNull(),
  source: leadSourceEnum('source').default('LANDING_PAGE').notNull(),
  referral_name: varchar('referral_name', { length: 255 }),
  referral_email: varchar('referral_email', { length: 255 }),
  quiz_score: integer('quiz_score'),
  email_sent: boolean('email_sent').default(false).notNull(),
  referral_email_sent: boolean('referral_email_sent').default(false).notNull(),
  utm_source: varchar('utm_source', { length: 100 }),
  utm_medium: varchar('utm_medium', { length: 100 }),
  utm_campaign: varchar('utm_campaign', { length: 100 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
