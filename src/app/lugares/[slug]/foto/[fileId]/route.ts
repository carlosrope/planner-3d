import { getVenuePhoto } from "@/lib/dal";

// Foto de un lugar, guardada en la base al registrarlo.

export async function GET(_request: Request, ctx: RouteContext<"/lugares/[slug]/foto/[fileId]">) {
  const { slug, fileId } = await ctx.params;
  const photo = await getVenuePhoto(slug, fileId);
  if (!photo) return new Response("No encontrada.", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "content-type": photo.mimeType, "cache-control": "public, max-age=604800, immutable" },
  });
}
