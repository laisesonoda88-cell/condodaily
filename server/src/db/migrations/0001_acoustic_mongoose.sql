CREATE TYPE "public"."mp_payment_status" AS ENUM('PENDING', 'APPROVED', 'AUTHORIZED', 'IN_PROCESS', 'IN_MEDIATION', 'REJECTED', 'CANCELLED', 'REFUNDED', 'CHARGED_BACK');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."pix_key_type" AS ENUM('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"payer_id" uuid NOT NULL,
	"mp_payment_id" varchar(100),
	"mp_preference_id" varchar(255),
	"mp_external_reference" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"platform_fee" numeric(10, 2),
	"net_amount" numeric(10, 2),
	"payment_method" "payment_method" NOT NULL,
	"status" "mp_payment_status" DEFAULT 'PENDING' NOT NULL,
	"pix_qr_code" text,
	"pix_qr_code_base64" text,
	"pix_copy_paste" text,
	"boleto_url" text,
	"boleto_barcode" varchar(100),
	"boleto_due_date" varchar(10),
	"card_last_four" varchar(4),
	"card_brand" varchar(30),
	"installments" integer DEFAULT 1,
	"mp_raw_response" text,
	"error_message" text,
	"paid_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "payout_status" DEFAULT 'PENDING' NOT NULL,
	"mp_payment_id" varchar(100),
	"mp_transfer_id" varchar(100),
	"pix_key" varchar(255),
	"error_message" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_payment_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pix_key_type" "pix_key_type",
	"pix_key" varchar(255),
	"mp_user_id" varchar(100),
	"mp_access_token" varchar(500),
	"mp_connected" boolean DEFAULT false NOT NULL,
	"bank_name" varchar(100),
	"bank_agency" varchar(20),
	"bank_account" varchar(30),
	"bank_account_type" varchar(20),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "professional_payment_info_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mp_event_id" varchar(100),
	"event_type" varchar(100) NOT NULL,
	"resource_id" varchar(100),
	"resource_type" varchar(50),
	"raw_payload" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_status" varchar(50) DEFAULT 'UNPAID' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contratante_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "profissional_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_payment_info" ADD CONSTRAINT "professional_payment_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;