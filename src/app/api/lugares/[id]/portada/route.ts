import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAdmin, setVenueRender, venueMatchesReviewToken } from "@/lib/dal";

// Portada automática de un lugar: la vista 3D y el plano 2D que captura el navegador
// (src/designer/captura.js dentro de un iframe) al cargar el plano o confirmar el lugar.
// Puede guardarla la administración o el dueño desde su enlace de revisión (?r=token).

const image = z.object({
  name: z.string().regex(/^[a-z0-9-]+\.jpg$/),
  // JPEG 1200×900, ~100–380 KB.
  data: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).max(700_000),
});
const body = z.object({ r: z.string().min(8).max(64).optional(), images: z.array(image).min(1).max(2) });

export async function POST(request: Request, ctx: RouteContext<"/api/lugares/[id]/portada">) {
  const { id } = await ctx.params;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Imágenes inválidas." }, { status: 400 });

  const user = await getCurrentUser();
  const allowed = (user && isAdmin(user)) || (parsed.data.r ? await venueMatchesReviewToken(id, parsed.data.r) : false);
  if (!allowed) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });

  const files = parsed.data.images.map((i) => ({ name: i.name, mimeType: "image/jpeg", data: Buffer.from(i.data.slice(i.data.indexOf(",") + 1), "base64") }));
  const saved = await setVenueRender(id, files);
  if (!saved) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  for (const path of ["/salones", "/casas", `/lugares/${saved.slug}`, `/admin/lugares/${id}`]) revalidatePath(path);
  return NextResponse.json({ ok: true, ids: saved.ids });
}
