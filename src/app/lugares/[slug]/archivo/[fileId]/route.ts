import { getCurrentUser, getOwnedVenueFile, requireOrg } from "@/lib/dal";

// Archivo (plano) que el dueño subió de su propio lugar.

export async function GET(_request: Request, ctx: RouteContext<"/lugares/[slug]/archivo/[fileId]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Inicia sesión.", { status: 401 });
  const org = await requireOrg(user);
  const { fileId } = await ctx.params;
  const file = await getOwnedVenueFile(org.id, fileId);
  if (!file) return new Response("No encontrado.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.mimeType,
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "cache-control": "private, max-age=0",
    },
  });
}
