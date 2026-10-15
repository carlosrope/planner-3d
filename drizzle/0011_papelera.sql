ALTER TABLE "event" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "venue" ADD COLUMN "deleted_at" timestamp with time zone;