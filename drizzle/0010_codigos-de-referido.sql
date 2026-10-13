CREATE TABLE "referral_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"org_id" text NOT NULL,
	"venue_id" text NOT NULL,
	"guest_name" text NOT NULL,
	"event_date" date,
	"used_by_org_id" text,
	"used_at" timestamp with time zone,
	"event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "tier" text DEFAULT 'pro' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "referral_code_id" text;--> statement-breakpoint
ALTER TABLE "referral_code" ADD CONSTRAINT "referral_code_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_code" ADD CONSTRAINT "referral_code_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_code" ADD CONSTRAINT "referral_code_used_by_org_id_organization_id_fk" FOREIGN KEY ("used_by_org_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_code" ADD CONSTRAINT "referral_code_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_code_org_idx" ON "referral_code" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "referral_code_venue_idx" ON "referral_code" USING btree ("venue_id");