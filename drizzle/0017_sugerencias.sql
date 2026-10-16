CREATE TABLE "catalog_suggestion" (
	"id" text PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"category" text NOT NULL,
	"use" text DEFAULT '' NOT NULL,
	"event_kind" text DEFAULT '' NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"page" text DEFAULT '' NOT NULL,
	"emailed" boolean DEFAULT false NOT NULL,
	"email_error" text,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "catalog_suggestion_created_idx" ON "catalog_suggestion" USING btree ("created_at");