import { isPreviewBot } from "@/lib/activity";
import { bumpVenueViews, getVenueBasics, getVenuePlanForView } from "@/lib/dal";
import { designerResponse, publicOrigin } from "@/lib/designer/page";
import { withStarter } from "@/lib/designer/starter";
import { sectionOf } from "@/lib/domain";
import { SITE_URL } from "@/lib/site";

// 3D público de un lugar del catálogo (o revisión del dueño con ?r=token): se puede mover todo; nada se guarda.
// Con ?r=token&captura=1 lo abre PortadaAuto.tsx en un iframe para tomar la portada automática.

export async function GET(request: Request, ctx: RouteContext<"/lugares/[slug]/3d">) {
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const review = url.searchParams.get("r");
  const captura = Boolean(review) && url.searchParams.get("captura") === "1";
  const found = await getVenuePlanForView(slug, review);
  if (!found) return new Response("Este lugar no está disponible.", { status: 404 });
  const key = found.slug ?? found.id;
  // Las aperturas son de personas: sin robots ni la vista previa de WhatsApp.
  if (!review && !isPreviewBot(request.headers.get("user-agent"))) await bumpVenueViews(found.id);
  // Un salón se abre con una boda de 200 ya montada para que se entienda el tamaño.
  const base = found.plan.kind === "salon" ? withStarter(found.plan, { guests: 200, kind: "boda" }) : found.plan;
  const plan = { ...base, id: `lugar-${key}`, title: found.name };
  const origin = publicOrigin(request);
  // Vista previa al compartir: la foto de fuera o la portada del lugar (sin ellas, la imagen general de Plantea).
  const basics = await getVenueBasics(key);
  const photo = basics?.outside ?? basics?.cover;
  return designerResponse(
    plan,
    undefined,
    {
      description: found.kind === "salon" ? `Recorre ${found.name} en 3D y prueba el montaje de tu evento.` : `Recorre ${found.name} en 3D.`,
      url: `${origin}/lugares/${key}/3d`,
      canonical: review ? undefined : `${SITE_URL}/lugares/${key}/3d`,
      image: photo ? `${SITE_URL}/lugares/${key}/foto/${photo}` : undefined,
      siteName: "Plantea",
    },
    {
      venue: {
        name: found.name,
        whatsapp: found.contactPhone ?? found.owner?.whatsapp ?? null,
        planHref: `/eventos?lugar=${found.id}${sectionOf(found.kind) === "casas" ? "&seccion=casas" : ""}`,
        reviewHref: review ? `/revisar/${review}` : null,
        backHref: review ? `/revisar/${review}` : `/lugares/${key}`,
      },
      captura,
      embeddable: true,
    },
  );
}
