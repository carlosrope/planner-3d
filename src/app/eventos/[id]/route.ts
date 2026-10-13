import { redirect } from "next/navigation";
import { getCurrentUser, getEditableEvent, getEffectiveBrand, listComments } from "@/lib/dal";
import { brandOf, designerResponse, hostFor } from "@/lib/designer/page";
import { isLitePlan, sectionOf } from "@/lib/domain";
import { withStarter } from "@/lib/designer/starter";

// Diseñador del evento con guardado en el servidor y distribuciones A/B/C.

export async function GET(request: Request, ctx: RouteContext<"/eventos/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const { id } = await ctx.params;
  const data = await getEditableEvent(id, user.id);
  // No existe, no es suyo o su plan ya no incluye este módulo: Proyectos explica qué pasa.
  if (!data) redirect("/eventos");
  const { event, venue, layouts } = data;
  if (!venue.plan) return new Response("Este lugar todavía no tiene plano para el diseñador.", { status: 409 });
  const wanted = new URL(request.url).searchParams.get("d");
  const plan = withStarter(venue.plan, { guests: event.guestCount ?? 0, kind: event.kind });
  const back =
    sectionOf(venue.kind) === "casas" ? { href: "/eventos?seccion=casas", label: "Casas" } : { href: "/eventos", label: "Eventos" };
  const [brand, comments] = await Promise.all([getEffectiveBrand(event.orgId), listComments(event.id)]);
  const host = hostFor("edit", event, layouts, wanted, brandOf(brand), comments, back);
  // Personal y Con código: sin hojas ni marcadores de proveedores.
  return designerResponse({ ...plan, title: event.title }, { ...host, lite: isLitePlan(data.org.plan) }, undefined, { eventKind: event.kind });
}
