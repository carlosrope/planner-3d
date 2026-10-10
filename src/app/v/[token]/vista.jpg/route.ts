import { getSharePreview } from "@/lib/dal";

// Imagen que muestra WhatsApp (y otras apps) al pegar el enlace del cliente.

export async function GET(request: Request, ctx: RouteContext<"/v/[token]/vista.jpg">) {
  const { token } = await ctx.params;
  const preview = await getSharePreview(token);
  const match = preview && /^data:image\/jpeg;base64,(.+)$/.exec(preview);
  if (!match) return new Response("Sin vista previa.", { status: 404 });
  // Con ?v= (huella de la imagen) la dirección cambia cuando cambia la imagen: se puede guardar mucho tiempo
  const versioned = new URL(request.url).searchParams.has("v");
  return new Response(Buffer.from(match[1], "base64"), {
    headers: { "content-type": "image/jpeg", "cache-control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300" },
  });
}
