import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditLayout, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { layout } from "@/lib/db/schema";
import { layoutDocSchema } from "@/lib/layout/schema";
import type { LayoutDoc } from "@/lib/layout/types";

const saveBody = z.object({ doc: layoutDocSchema, revision: z.number().int().min(1) });

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
      doc: parsed.data.doc as LayoutDoc,
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
