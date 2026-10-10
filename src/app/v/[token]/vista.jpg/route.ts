import { getSharePreview } from "@/lib/dal";

// Imagen que muestra WhatsApp (y otras apps) al pegar el enlace del cliente.

export async function GET(_request: Request, ctx: RouteContext<"/v/[token]/vista.jpg">) {
  const { token } = await ctx.params;
  const preview = await getSharePreview(token);
  const match = preview && /^data:image\/jpeg;base64,(.+)$/.exec(preview);
  if (!match) return new Response("Sin vista previa.", { status: 404 });
  return new Response(Buffer.from(match[1], "base64"), {
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=300" },
  });
}
