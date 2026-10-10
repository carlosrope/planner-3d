ALTER TABLE "venue" ADD COLUMN "kind" text DEFAULT 'salon' NOT NULL;--> statement-breakpoint
-- Los lugares con plantas de casa (o plano sin "kind": "salon") son casas.
UPDATE "venue" SET "kind" = 'casa' WHERE ("plan" IS NOT NULL AND coalesce("plan"->>'kind', 'casa') <> 'salon') OR jsonb_array_length(coalesce("spec"->'levels', '[]'::jsonb)) > 0;--> statement-breakpoint
-- Los proyectos en una casa son de tipo "casa" aunque se hayan creado como boda.
UPDATE "event" SET "kind" = 'casa' FROM "venue" WHERE "event"."venue_id" = "venue"."id" AND "venue"."kind" = 'casa';
