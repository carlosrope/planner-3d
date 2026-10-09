import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { canEditEvent, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { layout, shareLink } from "@/lib/db/schema";

const TOKEN_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

/** Enlace para que el cliente vea el diseño (2D, 3D y recorrido) sin cuenta. Siempre el mismo por evento. */
export async function POST(_request: Request, ctx: RouteContext<"/api/events/[id]/share">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canEditEvent(id, user.id))) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const [existing] = await db
    .select({ token: shareLink.token })
    .from(shareLink)
    .where(and(eq(shareLink.eventId, id), eq(shareLink.role, "cliente"), isNull(shareLink.expiresAt)))
    .limit(1);
  if (existing) return NextResponse.json({ path: `/v/${existing.token}` });

  const [first] = await db
    .select({ id: layout.id })
    .from(layout)
    .where(eq(layout.eventId, id))
    .orderBy(desc(layout.recommended), asc(layout.position))
    .limit(1);
  if (!first) return NextResponse.json({ error: "El evento no tiene distribuciones." }, { status: 409 });
  // Sin letras que se confunden al leerlas (I/l/1, O/0).
  const token = Array.from(randomBytes(16), (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");
  await db.insert(shareLink).values({ token, eventId: id, layoutId: first.id, role: "cliente", layers: [] });
  return NextResponse.json({ path: `/v/${token}` }, { status: 201 });
}
