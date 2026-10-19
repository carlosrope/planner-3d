import { isPreviewBot } from "@/lib/activity";
import { bumpShareView, getCurrentUser, getEffectiveBrand, getSharedEvent, isEventMember, listComments } from "@/lib/dal";
import { brandOf, designerResponse, hostFor, publicOrigin } from "@/lib/designer/page";
import { withStarter } from "@/lib/designer/starter";

// Enlace para el cliente: ve y explora el diseño (2D, 3D, recorrido); nada se guarda.

export async function GET(request: Request, ctx: RouteContext<"/v/[token]">) {
  const { token } = await ctx.params;
  const data = await getSharedEvent(token);
  const plan = data?.venue.plan;
  if (!data || !plan) return new Response("Este enlace ya no está disponible.", { status: 404 });
  const url = new URL(request.url);
  // Cuenta la visita de una persona: no la vista previa que arma WhatsApp al pegar el enlace, ni el cambio de planta
  // dentro del mismo enlace (?vista, ?recorrido), ni la planner o el salón cuando abren su propio enlace.
  const reload = url.searchParams.has("vista") || url.searchParams.has("recorrido");
  if (!isPreviewBot(request.headers.get("user-agent")) && !reload) {
    const viewer = await getCurrentUser().catch(() => null);
    if (!viewer || !(await isEventMember(data.event.id, viewer.id))) await bumpShareView(token);
  }
  // Sin ?d= abre la distribución recomendada (o la primera), como dice el diálogo de Compartir.
  const wanted = url.searchParams.get("d");
  // ?visita: el enlace abre directo la visita guiada (lo arranca host.js)
  const tour = url.searchParams.has("visita");
  const full = withStarter(plan, { guests: data.event.guestCount ?? 0, kind: data.event.kind });
  const [org, comments] = await Promise.all([getEffectiveBrand(data.event.orgId), listComments(data.event.id)]);
  const brand = brandOf(org);
  const what = tour ? "visita guiada en 3D" : "plano y recorrido 3D";
  const description = brand.name
    ? `Diseño de ${brand.name}: ${what}`
    : tour ? `Visita guiada en 3D ${plan.kind === "salon" ? "del evento" : "de la casa"}`
    : plan.kind === "salon" ? "Plano 2D y recorrido 3D del evento" : "Plano 2D y recorrido 3D de la casa";
  const origin = publicOrigin(request);
  return designerResponse({ ...full, title: data.event.title }, hostFor("view", data.event, data.layouts, wanted, brand, comments), {
    image: data.previewVersion ? `${origin}/v/${token}/vista.jpg?v=${data.previewVersion}` : undefined,
    description,
    url: `${origin}/v/${token}${tour ? "?visita=1" : ""}`,
    siteName: brand.name || undefined,
  }, { lang: org?.language });
}
