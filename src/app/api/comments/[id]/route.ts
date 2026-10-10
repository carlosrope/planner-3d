import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditComment, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { comment } from "@/lib/db/schema";

/** La planner marca un comentario como resuelto (o lo reabre). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/comments/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canEditComment(id, user.id))) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  const parsed = z.object({ resolved: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  await db.update(comment).set({ resolved: parsed.data.resolved }).where(eq(comment.id, id));
  return NextResponse.json({ ok: true });
}
