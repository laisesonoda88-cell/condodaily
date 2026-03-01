CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."condo_porte" AS ENUM('P', 'M', 'G');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('PIX', 'CREDIT_CARD', 'BOLETO');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CONTRATANTE', 'PROFISSIONAL');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_type" AS ENUM('DEPOSIT', 'DEBIT', 'REFUND');--> statement-breakpoint
CREATE TABLE "anti_habituality_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contratante_id" uuid NOT NULL,
	"profissional_id" uuid NOT NULL,
	"booking_count_30d" integer DEFAULT 0 NOT NULL,
	"last_booking_date" timestamp,
	"flagged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contratante_id" uuid NOT NULL,
	"profissional_id" uuid NOT NULL,
	"condo_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"scheduled_date" varchar(10) NOT NULL,
	"scheduled_start" varchar(5) NOT NULL,
	"scheduled_end" varchar(5) NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"check_in_at" timestamp,
	"check_in_lat" real,
	"check_in_lng" real,
	"check_out_at" timestamp,
	"check_out_lat" real,
	"check_out_lng" real,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"total_hours" real,
	"gross_amount" numeric(10, 2),
	"platform_fee" numeric(10, 2),
	"insurance_fee" numeric(10, 2),
	"net_professional_amount" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condo_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condo_id" uuid NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "condo_wallets_condo_id_unique" UNIQUE("condo_id")
);
--> statement-breakpoint
CREATE TABLE "condos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cnpj" varchar(18) NOT NULL,
	"razao_social" varchar(255) NOT NULL,
	"nome_fantasia" varchar(255),
	"cep" varchar(10) NOT NULL,
	"endereco" varchar(255) NOT NULL,
	"numero" varchar(20) NOT NULL,
	"complemento" varchar(100),
	"cidade" varchar(100) NOT NULL,
	"uf" varchar(2) NOT NULL,
	"num_torres" integer DEFAULT 1 NOT NULL,
	"num_unidades" integer DEFAULT 1 NOT NULL,
	"areas_lazer" text DEFAULT '[]',
	"porte" "condo_porte" NOT NULL,
	"latitude" real,
	"longitude" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "condos_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "professional_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"hourly_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"service_radius_km" integer DEFAULT 15 NOT NULL,
	"latitude" real,
	"longitude" real,
	"avg_rating" real DEFAULT 0 NOT NULL,
	"total_services" integer DEFAULT 0 NOT NULL,
	"fibonacci_level" integer DEFAULT 0 NOT NULL,
	"quiz_approved" boolean DEFAULT false NOT NULL,
	"quiz_approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "professional_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "professional_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_certified" boolean DEFAULT false NOT NULL,
	"certified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewed_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"icon" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "service_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"cpf" varchar(14) NOT NULL,
	"role" "user_role" NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" "wallet_tx_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"booking_id" uuid,
	"payment_method" "payment_method",
	"external_payment_id" varchar(255),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anti_habituality_log" ADD CONSTRAINT "anti_habituality_log_contratante_id_users_id_fk" FOREIGN KEY ("contratante_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_habituality_log" ADD CONSTRAINT "anti_habituality_log_profissional_id_users_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_contratante_id_users_id_fk" FOREIGN KEY ("contratante_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_profissional_id_users_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_condo_id_condos_id_fk" FOREIGN KEY ("condo_id") REFERENCES "public"."condos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condo_wallets" ADD CONSTRAINT "condo_wallets_condo_id_condos_id_fk" FOREIGN KEY ("condo_id") REFERENCES "public"."condos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condos" ADD CONSTRAINT "condos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professional_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_id_users_id_fk" FOREIGN KEY ("reviewed_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_condo_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."condo_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;