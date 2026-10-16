import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin, setUiConfig } from "@/lib/dal";
import { parseUi } from "@/lib/ui-config";

/** Guarda la interfaz del diseñador para todos. Solo administradores (ADMIN_EMAILS). */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Solo la administración puede cambiar la interfaz." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const saved = await setUiConfig(parseUi(body), user);
  return NextResponse.json({ ok: true, ui: saved });
}
