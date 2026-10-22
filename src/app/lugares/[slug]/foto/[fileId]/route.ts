import { getCurrentUser, getVenuePhoto } from "@/lib/dal";
import { fileHeaders, isPhoto } from "@/lib/uploads";

// Foto de un lugar, guardada en la base al registrarlo.

export async function GET(request: Request, ctx: RouteContext<"/lugares/[slug]/foto/[fileId]">) {
  const { slug, fileId } = await ctx.params;
  const reviewToken = new URL(request.url).searchParams.get("r");
  const photo = await getVenuePhoto(slug, fileId, { user: await getCurrentUser(), reviewToken });
  const data = photo ? new Uint8Array(photo.data) : null;
  // Solo se sirven fotos de verdad (por su contenido); lo demás no se muestra en público.
  if (!data || !isPhoto(data)) return new Response("No encontrada.", { status: 404 });
  // La de un lugar sin publicar no se guarda en cachés compartidos (solo la ve la administración, el dueño o la revisión).
  const cache = photo?.status === "publicado" ? "public, max-age=604800, immutable" : "private, no-store";
  return new Response(data, { headers: { ...fileHeaders(data, "foto"), "cache-control": cache } });
}
