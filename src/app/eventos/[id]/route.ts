import { redirect } from "next/navigation";
import { getCurrentUser, getEditableEvent, getOrgBrand } from "@/lib/dal";
import { brandOf, designerResponse, hostFor } from "@/lib/designer/page";
import { sectionOf } from "@/lib/domain";
import { withStarter } from "@/lib/designer/starter";

// Diseñador del evento con guardado en el servidor y distribuciones A/B/C.

export async function GET(request: Request, ctx: RouteContext<"/eventos/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const { id } = await ctx.params;
  const data = await getEditableEvent(id, user.id);
  if (!data) return new Response("Evento no encontrado.", { status: 404 });
  const { event, venue, layouts } = data;
  if (!venue.plan) return new Response("Este lugar todavía no tiene plano para el diseñador.", { status: 409 });
  const wanted = new URL(request.url).searchParams.get("d");
  const plan = withStarter(venue.plan, { guests: event.guestCount ?? 0, kind: event.kind });
  const back =
    sectionOf(venue.kind) === "casas" ? { href: "/eventos?seccion=casas", label: "Casas" } : { href: "/eventos", label: "Eventos" };
  const brand = brandOf(await getOrgBrand(event.orgId));
  return designerResponse({ ...plan, title: event.title }, hostFor("edit", event, layouts, wanted, brand, back));
}
