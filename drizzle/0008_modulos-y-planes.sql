ALTER TABLE "organization" ADD COLUMN "modules" jsonb DEFAULT '["salones","casas"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "plan" text DEFAULT 'ambos' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "plan_ends_at" timestamp with time zone;