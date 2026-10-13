import { redirect } from "next/navigation";
import { getCurrentUser, getEditableEvent, getOrgBrand, listComments } from "@/lib/dal";
import { brandOf, designerResponse, hostFor } from "@/lib/designer/page";
import { sectionOf } from "@/lib/domain";
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
  const [org, comments] = await Promise.all([getOrgBrand(event.orgId), listComments(event.id)]);
  return designerResponse({ ...plan, title: event.title }, hostFor("edit", event, layouts, wanted, brandOf(org), comments, back));
}
