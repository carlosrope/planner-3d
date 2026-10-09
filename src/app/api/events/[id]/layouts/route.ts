import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditEvent, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { layout } from "@/lib/db/schema";
import { designDocSchema } from "@/lib/designer/schema";
import type { DesignDoc } from "@/lib/designer/types";

const createBody = z.object({
  name: z.string().trim().min(1).max(12),
  note: z.string().trim().max(60),
  doc: designDocSchema,
});

/** Nueva distribución del evento (normalmente, copia de la que se está viendo). */
export async function POST(request: Request, ctx: RouteContext<"/api/events/[id]/layouts">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canEditEvent(id, user.id))) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const parsed = createBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${layout.position}), -1) + 1` })
    .from(layout)
    .where(eq(layout.eventId, id));
  const [created] = await db
    .insert(layout)
    .values({
      eventId: id,
      name: parsed.data.name,
      note: parsed.data.note,
      position: Number(next),
      doc: parsed.data.doc as DesignDoc,
      updatedBy: user.id,
    })
    .returning({ id: layout.id, revision: layout.revision });
  return NextResponse.json(created, { status: 201 });
}
