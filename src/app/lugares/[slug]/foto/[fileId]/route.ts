import { getVenuePhoto } from "@/lib/dal";
import { fileHeaders, isPhoto } from "@/lib/uploads";

// Foto de un lugar, guardada en la base al registrarlo.

export async function GET(_request: Request, ctx: RouteContext<"/lugares/[slug]/foto/[fileId]">) {
  const { slug, fileId } = await ctx.params;
  const photo = await getVenuePhoto(slug, fileId);
  const data = photo ? new Uint8Array(photo.data) : null;
  // Solo se sirven fotos de verdad (por su contenido); lo demás no se muestra en público.
  if (!data || !isPhoto(data)) return new Response("No encontrada.", { status: 404 });
  return new Response(data, { headers: { ...fileHeaders(data, "foto"), "cache-control": "public, max-age=604800, immutable" } });
}
