import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditEvent, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { event } from "@/lib/db/schema";
import { propertyDetailsSchema } from "@/lib/designer/schema";

const patchBody = z
  .object({ guestCount: z.number().int().min(0).max(5000).optional(), details: propertyDetailsSchema.optional() })
  .refine((b) => b.guestCount !== undefined || b.details !== undefined);

/** Cambia el número de invitados o la ficha de la casa (desde el diseñador). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/events/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canEditEvent(id, user.id))) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const parsed = patchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  await db.update(event).set(parsed.data).where(eq(event.id, id));
  return NextResponse.json({ ok: true });
}
