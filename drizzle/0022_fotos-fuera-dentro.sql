ALTER TABLE "venue_file" ADD COLUMN "side" text;--> statement-breakpoint
ALTER TABLE "venue_file" ADD COLUMN "illustrative" boolean DEFAULT false NOT NULL;