CREATE TABLE "card_checkout" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"kind" text NOT NULL,
	"plan" text NOT NULL,
	"tier" text DEFAULT 'pro' NOT NULL,
	"period" text NOT NULL,
	"amount" integer NOT NULL,
	"title" text NOT NULL,
	"mp_id" text,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_checkout_mp_id_unique" UNIQUE("mp_id")
);
--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "receipt_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "receipt_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "receipt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "method" text DEFAULT 'spei' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "mp_payment_id" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "checkout_id" text;--> statement-breakpoint
ALTER TABLE "card_checkout" ADD CONSTRAINT "card_checkout_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_checkout_org_idx" ON "card_checkout" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_checkout_id_card_checkout_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."card_checkout"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_mp_payment_id_unique" UNIQUE("mp_payment_id");