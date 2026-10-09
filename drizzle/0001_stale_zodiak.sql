ALTER TABLE "layout" ALTER COLUMN "name" SET DEFAULT 'A';--> statement-breakpoint
ALTER TABLE "layout" ADD COLUMN "note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "layout" ADD COLUMN "recommended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "layout" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;