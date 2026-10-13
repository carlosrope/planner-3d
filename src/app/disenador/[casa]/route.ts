import { demoPlan, designerResponse } from "@/lib/designer/page";
import { withStarter } from "@/lib/designer/starter";

// Demostración sin cuenta: el diseño se guarda solo en el navegador.

export async function GET(_request: Request, ctx: RouteContext<"/disenador/[casa]">) {
  const { casa } = await ctx.params;
  const plan = await demoPlan(casa);
  if (!plan) return new Response("Lugar no encontrado.", { status: 404 });
  // Un salón arranca con una boda de 240 invitados.
  return designerResponse(withStarter(plan, { guests: 240, kind: "boda" }), undefined, undefined, { demo: true });
}
