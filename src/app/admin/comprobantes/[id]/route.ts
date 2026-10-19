import { adminGetReceipt, getCurrentUser, isAdmin } from "@/lib/dal";
import { fileHeaders } from "@/lib/uploads";

// Comprobante de pago que subió una cuenta, para la administración.

export async function GET(_request: Request, ctx: RouteContext<"/admin/comprobantes/[id]">) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return new Response("Sin acceso.", { status: user ? 403 : 401 });
  const { id } = await ctx.params;
  const file = await adminGetReceipt(id);
  // Un pago con tarjeta no tiene comprobante (lo confirma Mercado Pago).
  if (!file?.data) return new Response("No encontrado.", { status: 404 });
  const data = new Uint8Array(file.data);
  return new Response(data, { headers: { ...fileHeaders(data, file.name ?? "comprobante"), "cache-control": "private, max-age=0" } });
}
