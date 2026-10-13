import { adminGetReceipt, getCurrentUser, isAdmin } from "@/lib/dal";

// Comprobante de pago que subió una cuenta, para la administración.

export async function GET(_request: Request, ctx: RouteContext<"/admin/comprobantes/[id]">) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return new Response("Sin acceso.", { status: user ? 403 : 401 });
  const { id } = await ctx.params;
  const file = await adminGetReceipt(id);
  if (!file) return new Response("No encontrado.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.mimeType,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "cache-control": "private, max-age=0",
    },
  });
}
