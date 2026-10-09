import { getSharedEvent } from "@/lib/dal";
import { designerResponse, hostFor } from "@/lib/designer/page";
import { withStarter } from "@/lib/designer/starter";

// Enlace para el cliente: ve y explora el diseño (2D, 3D, recorrido); nada se guarda.

export async function GET(request: Request, ctx: RouteContext<"/v/[token]">) {
  const { token } = await ctx.params;
  const data = await getSharedEvent(token);
  const plan = data?.venue.plan;
  if (!data || !plan) return new Response("Este enlace ya no está disponible.", { status: 404 });
  const wanted = new URL(request.url).searchParams.get("d") ?? data.firstLayoutId;
  const full = withStarter(plan, { guests: data.event.guestCount ?? 0, kind: data.event.kind });
  return designerResponse({ ...full, title: data.event.title }, hostFor("view", data.event, data.layouts, wanted));
}
