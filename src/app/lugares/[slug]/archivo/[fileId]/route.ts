import { getCurrentUser, getOwnedVenueFile, requireOrg } from "@/lib/dal";
import { fileHeaders } from "@/lib/uploads";

// Archivo (plano) que el dueño subió de su propio lugar.

export async function GET(_request: Request, ctx: RouteContext<"/lugares/[slug]/archivo/[fileId]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Inicia sesión.", { status: 401 });
  const org = await requireOrg(user);
  const { fileId } = await ctx.params;
  const file = await getOwnedVenueFile(org.id, fileId);
  if (!file) return new Response("No encontrado.", { status: 404 });
  const data = new Uint8Array(file.data);
  return new Response(data, { headers: { ...fileHeaders(data, file.name, { download: true }), "cache-control": "private, max-age=0" } });
}
