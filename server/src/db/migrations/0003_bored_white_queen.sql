CREATE TYPE "public"."condo_area_type" AS ENUM('SALAO_FESTAS', 'PISCINA', 'ACADEMIA', 'CHURRASQUEIRA', 'PLAYGROUND', 'QUADRA', 'JARDIM', 'HALL', 'GARAGEM', 'LAVANDERIA', 'SAUNA', 'BRINQUEDOTECA', 'COWORKING', 'PET_PLACE', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."maintenance_frequency" AS ENUM('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'BIENAL', 'QUINQUENAL');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('EM_DIA', 'VENCENDO', 'VENCIDO', 'NAO_INFORMADO');--> statement-breakpoint
CREATE TYPE "public"."penalty_reason" AS ENUM('NO_SHOW', 'LATE_CANCEL');--> statement-breakpoint
CREATE TYPE "public"."penalty_status" AS ENUM('PENDING', 'APPLIED', 'WAIVED');--> statement-breakpoint
CREATE TABLE "condo_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condo_id" uuid NOT NULL,
	"nome" varchar(100) NOT NULL,
	"metragem" real NOT NULL,
	"tipo" "condo_area_type" NOT NULL,
	"andar" varchar(50),
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condo_maintenance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condo_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"frequency" "maintenance_frequency" NOT NULL,
	"category_slug" varchar(100) NOT NULL,
	"icon" varchar(50) NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"last_done" timestamp,
	"next_due" timestamp,
	"status" "maintenance_status" DEFAULT 'NAO_INFORMADO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_penalties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"reason" "penalty_reason" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "penalty_status" DEFAULT 'PENDING' NOT NULL,
	"applied_in_booking_id" uuid,
	"applied_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_estimation_params" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"m2_por_hora" real NOT NULL,
	"min_horas" real DEFAULT 4 NOT NULL,
	"max_horas" real DEFAULT 8 NOT NULL,
	"fator_complexidade" real DEFAULT 1 NOT NULL,
	"descricao" text,
	CONSTRAINT "service_estimation_params_category_id_unique" UNIQUE("category_id")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contract_accepted_contratante" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contract_accepted_profissional" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "metragem_total" real;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "tem_portaria" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "num_andares_por_torre" integer;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "num_elevadores" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "regras_lixo" text;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "horario_mudanca" text;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "horario_obra" text;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "documento_url" text;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "documento_analisado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "dados_extraidos" text;--> statement-breakpoint
ALTER TABLE "condos" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD COLUMN "disponivel_fim_semana" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD COLUMN "disponivel_feriados" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD COLUMN "penalty_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD COLUMN "pending_penalty_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD COLUMN "is_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD COLUMN "blocked_at" timestamp;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD COLUMN "blocked_reason" text;--> statement-breakpoint
ALTER TABLE "condo_areas" ADD CONSTRAINT "condo_areas_condo_id_condos_id_fk" FOREIGN KEY ("condo_id") REFERENCES "public"."condos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condo_maintenance_items" ADD CONSTRAINT "condo_maintenance_items_condo_id_condos_id_fk" FOREIGN KEY ("condo_id") REFERENCES "public"."condos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_penalties" ADD CONSTRAINT "professional_penalties_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_penalties" ADD CONSTRAINT "professional_penalties_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_penalties" ADD CONSTRAINT "professional_penalties_applied_in_booking_id_bookings_id_fk" FOREIGN KEY ("applied_in_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_estimation_params" ADD CONSTRAINT "service_estimation_params_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;