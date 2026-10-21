import { demoPlan, designerResponse } from "@/lib/designer/page";
import { withStarter } from "@/lib/designer/starter";
import { SITE_URL } from "@/lib/site";

// Demostración sin cuenta: el diseño se guarda solo en el navegador.

export async function GET(request: Request, ctx: RouteContext<"/disenador/[casa]">) {
  const { casa } = await ctx.params;
  const plan = await demoPlan(casa);
  if (!plan) return new Response("Lugar no encontrado.", { status: 404 });
  // Un salón arranca con una boda de 240 invitados.
  const salon = plan.kind === "salon";
  return designerResponse(
    withStarter(plan, { guests: 240, kind: "boda" }),
    undefined,
    {
      description: salon
        ? "Prueba Plantea sin cuenta: acomoda mesas e invitados en un salón de ejemplo y recórrelo en 3D."
        : "Prueba Plantea sin cuenta: amuebla una casa de ejemplo y recórrela en 3D.",
      url: `${SITE_URL}/disenador/${casa}`,
      canonical: `${SITE_URL}/disenador/${casa}`,
      siteName: "Plantea",
    },
    // ?embed=1: la portada de plantea.com.mx lo muestra en su recuadro (Hero3D.tsx), sin aviso ni «Volver»
    new URL(request.url).searchParams.get("embed") === "1" ? { embed: true } : { demo: true },
  );
}
