import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { canEditEvent, getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { layout, shareLink } from "@/lib/db/schema";

const TOKEN_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

// Imagen de vista previa (la arma el navegador al compartir): JPEG 1200×630, ~100–300 KB.
const body = z.object({ preview: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).max(700_000).optional() });

/** Enlace para que el cliente vea el diseño (2D, 3D y recorrido) sin cuenta. Siempre el mismo por evento. */
export async function POST(request: Request, ctx: RouteContext<"/api/events/[id]/share">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await canEditEvent(id, user.id))) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const parsed = body.safeParse(await request.json().catch(() => ({})));
  const preview = parsed.success ? parsed.data.preview : undefined;
  // WhatsApp guarda la vista previa de cada dirección: con una imagen nueva, el enlace lleva su huella
  // (?v=) para que se vea la imagen nueva. Es la misma huella que usa la página (md5 de la imagen).
  const version = preview ? `?v=${createHash("md5").update(preview).digest("hex").slice(0, 8)}` : "";

  const [existing] = await db
    .select({ token: shareLink.token })
    .from(shareLink)
    .where(and(eq(shareLink.eventId, id), eq(shareLink.role, "cliente"), isNull(shareLink.expiresAt)))
    .limit(1);
  if (existing) {
    if (preview) await db.update(shareLink).set({ preview }).where(eq(shareLink.token, existing.token));
    return NextResponse.json({ path: `/v/${existing.token}${version}` });
  }

  const [first] = await db
    .select({ id: layout.id })
    .from(layout)
    .where(eq(layout.eventId, id))
    .orderBy(desc(layout.recommended), asc(layout.position))
    .limit(1);
  if (!first) return NextResponse.json({ error: "El evento no tiene distribuciones." }, { status: 409 });
  // Sin letras que se confunden al leerlas (I/l/1, O/0).
  const token = Array.from(randomBytes(16), (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");
  await db.insert(shareLink).values({ token, eventId: id, layoutId: first.id, role: "cliente", layers: [], preview });
  return NextResponse.json({ path: `/v/${token}${version}` }, { status: 201 });
}
