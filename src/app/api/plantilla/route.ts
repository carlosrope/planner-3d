import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getEditableEvent } from "@/lib/dal";
import { demoPlan } from "@/lib/designer/page";
import { starterFurniture, TEMPLATES } from "@/lib/designer/starter";
import { EVENT_KINDS } from "@/lib/domain";

// Montaje según plantilla (redondas, imperiales o cóctel) para el salón de un evento o de la demostración.
const query = z.object({
  tipo: z.enum(TEMPLATES),
  invitados: z.coerce.number().int().min(0).max(3000),
  clase: z.enum(EVENT_KINDS).default("boda"),
  evento: z.string().min(1).optional(),
  lugar: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const { tipo, invitados, clase, evento, lugar } = parsed.data;

  let plan = lugar ? await demoPlan(lugar) : null;
  let kind = clase;
  if (evento) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
    const data = await getEditableEvent(evento, user.id);
    if (!data) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    plan = data.venue.plan;
    kind = data.event.kind;
  }
  if (!plan || plan.kind !== "salon") return NextResponse.json({ error: "Ese lugar no es un salón." }, { status: 404 });
  return NextResponse.json({ furniture: starterFurniture(plan, { guests: invitados, kind, template: tipo }) });
}
