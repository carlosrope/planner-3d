import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSharedEvent } from "@/lib/dal";
import { db } from "@/lib/db";
import { comment, layout } from "@/lib/db/schema";

// El cliente deja un comentario desde su enlace (sin cuenta): general o sobre una mesa o mueble.
const body = z.object({
  layoutId: z.string().min(1).max(64),
  objectId: z.string().min(1).max(64).optional(),
  authorName: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(600),
});

export async function POST(request: Request, ctx: RouteContext<"/api/v/[token]/comments">) {
  const { token } = await ctx.params;
  const data = await getSharedEvent(token);
  if (!data) return NextResponse.json({ error: "Este enlace ya no está disponible." }, { status: 404 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe tu nombre y tu comentario." }, { status: 400 });
  if (!data.layouts.some((l) => l.id === parsed.data.layoutId)) {
    return NextResponse.json({ error: "Esa propuesta ya no existe." }, { status: 404 });
  }
  // Tope por propuesta para que un enlace reenviado no se llene de mensajes.
  const [{ total }] = await db
    .select({ total: count() })
    .from(comment)
    .innerJoin(layout, eq(comment.layoutId, layout.id))
    .where(and(eq(layout.eventId, data.event.id)));
  if (total >= 300) return NextResponse.json({ error: "Este diseño ya tiene demasiados comentarios." }, { status: 429 });

  const [created] = await db
    .insert(comment)
    .values({
      layoutId: parsed.data.layoutId,
      objectId: parsed.data.objectId ?? null,
      authorName: parsed.data.authorName,
      body: parsed.data.body,
    })
    .returning();
  return NextResponse.json({ comment: created }, { status: 201 });
}
