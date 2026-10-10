import { getOrgBrand, getSharedEvent, listComments } from "@/lib/dal";
import { brandOf, designerResponse, hostFor, publicOrigin } from "@/lib/designer/page";
import { withStarter } from "@/lib/designer/starter";

// Enlace para el cliente: ve y explora el diseño (2D, 3D, recorrido); nada se guarda.

export async function GET(request: Request, ctx: RouteContext<"/v/[token]">) {
  const { token } = await ctx.params;
  const data = await getSharedEvent(token);
  const plan = data?.venue.plan;
  if (!data || !plan) return new Response("Este enlace ya no está disponible.", { status: 404 });
  const wanted = new URL(request.url).searchParams.get("d") ?? data.firstLayoutId;
  const full = withStarter(plan, { guests: data.event.guestCount ?? 0, kind: data.event.kind });
  const [org, comments] = await Promise.all([getOrgBrand(data.event.orgId), listComments(data.event.id)]);
  const brand = brandOf(org);
  const description = brand.name
    ? `Diseño de ${brand.name}: plano y recorrido 3D`
    : plan.kind === "salon" ? "Plano 2D y recorrido 3D del evento" : "Plano 2D y recorrido 3D de la casa";
  return designerResponse({ ...full, title: data.event.title }, hostFor("view", data.event, data.layouts, wanted, brand, comments), {
    image: data.hasPreview ? `${publicOrigin(request)}/v/${token}/vista.jpg` : undefined,
    description,
  });
}
