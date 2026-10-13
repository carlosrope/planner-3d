CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan" text NOT NULL,
	"period" text NOT NULL,
	"amount" integer NOT NULL,
	"receipt_name" text NOT NULL,
	"receipt_type" text NOT NULL,
	"receipt" "bytea" NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_file" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_inquiry" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"event_date" date,
	"guests" integer,
	"message" text DEFAULT '' NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "status" text DEFAULT 'publicado' NOT NULL;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "area_m2" real;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "review_token" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_file" ADD CONSTRAINT "venue_file_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_inquiry" ADD CONSTRAINT "venue_inquiry_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_org_idx" ON "payment" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "venue_file_venue_idx" ON "venue_file" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "venue_inquiry_venue_idx" ON "venue_inquiry" USING btree ("venue_id");--> statement-breakpoint
ALTER TABLE "venue" ADD CONSTRAINT "venue_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "venue" ADD CONSTRAINT "venue_review_token_unique" UNIQUE("review_token");--> statement-breakpoint
UPDATE "venue" SET "slug" = trim(both '-' from lower(regexp_replace(translate("name", 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'), '[^a-zA-Z0-9]+', '-', 'g'))) WHERE "slug" IS NULL;
