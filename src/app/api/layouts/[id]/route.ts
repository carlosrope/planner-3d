import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditLayout, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { layout, shareLink } from "@/lib/db/schema";
import { designDocSchema } from "@/lib/designer/schema";
import type { DesignDoc } from "@/lib/designer/types";

const saveBody = z.object({ doc: designDocSchema, revision: z.number().int().min(1) });

/** Guarda el montaje solo si nadie lo cambió desde la revisión que tiene el cliente. */
export async function PUT(request: Request, ctx: RouteContext<"/api/layouts/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const { id } = await ctx.params;
  if (!(await canEditLayout(id, user.id))) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const parsed = saveBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano inválido.", detail: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }

  const [saved] = await db
    .update(layout)
    .set({
      doc: parsed.data.doc as DesignDoc,
      revision: sql`${layout.revision} + 1`,
      updatedBy: user.id,
    })
    .where(and(eq(layout.id, id), eq(layout.revision, parsed.data.revision)))
    .returning({ revision: layout.revision });

  if (!saved) {
    const [current] = await db.select({ revision: layout.revision }).from(layout).where(eq(layout.id, id));
    return NextResponse.json({ error: "Otra persona guardó cambios.", revision: current?.revision }, { status: 409 });
  }
  return NextResponse.json({ revision: saved.revision });
}

const metaBody = z
  .object({
    name: z.string().trim().min(1).max(12).optional(),
    note: z.string().trim().max(60).optional(),
    recommended: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0);

/** Cambia nombre, descripción o la marca de recomendada (solo una por evento). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/layouts/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canEditLayout(id, user.id))) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const parsed = metaBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(layout)
      .set(parsed.data)
      .where(eq(layout.id, id))
      .returning({ eventId: layout.eventId });
    if (parsed.data.recommended && row) {
      await tx
        .update(layout)
        .set({ recommended: false })
        .where(and(eq(layout.eventId, row.eventId), ne(layout.id, id)));
    }
  });
  return NextResponse.json({ ok: true });
}

/** Elimina una distribución; siempre debe quedar al menos una en el evento. */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/layouts/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canEditLayout(id, user.id))) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const [target] = await db.select({ eventId: layout.eventId }).from(layout).where(eq(layout.id, id));
  if (!target) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  // Otra distribución del evento (la recomendada, si hay) para los enlaces que ya se mandaron con esta.
  const [heir] = await db
    .select({ id: layout.id })
    .from(layout)
    .where(and(eq(layout.eventId, target.eventId), ne(layout.id, id)))
    .orderBy(desc(layout.recommended), asc(layout.position))
    .limit(1);
  if (!heir) return NextResponse.json({ error: "Debe quedar al menos una distribución." }, { status: 409 });
  // Los enlaces que ya se compartieron siguen funcionando: pasan a otra distribución en lugar de borrarse con esta.
  await db.transaction(async (tx) => {
    await tx.update(shareLink).set({ layoutId: heir.id }).where(eq(shareLink.layoutId, id));
    await tx.delete(layout).where(eq(layout.id, id));
  });
  return NextResponse.json({ ok: true });
}
