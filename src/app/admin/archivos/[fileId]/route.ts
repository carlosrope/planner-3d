import { adminGetVenueFile, getCurrentUser, isAdmin } from "@/lib/dal";

// Archivo subido por el dueño de un lugar (plano o foto), para la administración.

export async function GET(_request: Request, ctx: RouteContext<"/admin/archivos/[fileId]">) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return new Response("Sin acceso.", { status: user ? 403 : 401 });
  const { fileId } = await ctx.params;
  const file = await adminGetVenueFile(fileId);
  if (!file) return new Response("No encontrado.", { status: 404 });
  const inline = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf";
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.mimeType,
      "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "cache-control": "private, max-age=0",
    },
  });
}
