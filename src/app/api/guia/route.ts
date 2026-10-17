import { NextResponse } from "next/server";
import { getCurrentUser, markGuideSeen } from "@/lib/dal";

// guia.js avisa aquí en cuanto la guía se abre sola en un proyecto: desde entonces no vuelve a salir sola
// para esa cuenta, aunque cambie de equipo, de navegador o de dominio.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  await markGuideSeen(user.id);
  return NextResponse.json({ ok: true });
}
