import { NextResponse } from "next/server";
import { createSuggestion, markSuggestionEmailed } from "@/lib/dal";
import { sendEmail } from "@/lib/email";
import { clientIp, makeLimiter, suggestionEmail, suggestionSchema } from "@/lib/suggestion";

// Sugerencias del catálogo del diseñador → correo de Plantea. Sin cuenta y sin datos de la persona.
const allow = makeLimiter(10, 60 * 60 * 1000);
const TO = () => process.env.SUGGESTIONS_TO || "hola@plantea.com.mx";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!allow(ip)) return NextResponse.json({ error: "Ya recibimos varias sugerencias. Gracias; inténtalo más tarde." }, { status: 429 });
  const parsed = suggestionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe qué buscabas." }, { status: 400 });
  // Primero se guarda (se ve en /admin/sugerencias aunque el correo falle) y luego se avisa por correo.
  const id = await createSuggestion(parsed.data);
  const mail = suggestionEmail(parsed.data);
  const sent = await sendEmail({ to: TO(), subject: mail.subject, text: mail.text });
  await markSuggestionEmailed(id, sent.ok, sent.error);
  return NextResponse.json({ ok: true });
}
