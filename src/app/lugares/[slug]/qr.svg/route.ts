import QRCode from "qrcode";
import { getVenueBasics } from "@/lib/dal";
import { publicOrigin } from "@/lib/designer/page";

// QR "Míralo en 3D" del lugar: apunta a su 3D público.

export async function GET(request: Request, ctx: RouteContext<"/lugares/[slug]/qr.svg">) {
  const { slug } = await ctx.params;
  const v = await getVenueBasics(slug);
  if (!v || v.status !== "publicado") return new Response("No encontrado.", { status: 404 });
  const target = `${publicOrigin(request)}/lugares/${v.slug ?? v.id}/3d`;
  const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 512, color: { dark: "#1c1917", light: "#ffffff" } });
  return new Response(svg, {
    headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}
