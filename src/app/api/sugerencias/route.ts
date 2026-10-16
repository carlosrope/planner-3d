import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { makeLimiter, suggestionEmail, suggestionSchema } from "@/lib/suggestion";

// Sugerencias del catálogo del diseñador → correo de Plantea. Sin cuenta y sin datos de la persona.
const allow = makeLimiter(10, 60 * 60 * 1000);
const TO = () => process.env.SUGGESTIONS_TO || "hola@plantea.com.mx";

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allow(ip)) return NextResponse.json({ error: "Ya recibimos varias sugerencias. Gracias; inténtalo más tarde." }, { status: 429 });
  const parsed = suggestionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe qué buscabas." }, { status: 400 });
  const mail = suggestionEmail(parsed.data);
  const sent = await sendEmail({ to: TO(), subject: mail.subject, text: mail.text });
  if (!sent.ok) return NextResponse.json({ error: "No se pudo enviar. Escríbenos por WhatsApp." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
