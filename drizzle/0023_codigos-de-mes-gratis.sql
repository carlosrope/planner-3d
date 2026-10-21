CREATE TABLE "trial_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"days" integer DEFAULT 30 NOT NULL,
	"note" text,
	"created_by" text NOT NULL,
	"disabled_at" timestamp with time zone,
	"used_by_org_id" text,
	"used_by_email" text,
	"used_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trial_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "trial_code" ADD CONSTRAINT "trial_code_used_by_org_id_organization_id_fk" FOREIGN KEY ("used_by_org_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trial_code_used_by_idx" ON "trial_code" USING btree ("used_by_org_id");--> statement-breakpoint
CREATE INDEX "trial_code_created_idx" ON "trial_code" USING btree ("created_at");