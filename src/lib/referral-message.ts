/**
 * Mensaje de WhatsApp con el que el dueño manda el código a su cliente. Cada negocio puede escribir el suyo en
 * /negocio con estas marcas, que se cambian por los datos de cada código (puro: servidor y navegador):
 *   {nombre} cliente · {salon} lugar · {fecha} día del evento · {codigo} código · {enlace} enlace para crear la cuenta
 * Sin fecha, se quita la frase "para tu evento del {fecha}" (o solo {fecha} si se escribió de otra forma).
 */
export const REFERRAL_TAGS = [
  { tag: "{nombre}", label: "Nombre del cliente" },
  { tag: "{salon}", label: "Salón" },
  { tag: "{fecha}", label: "Fecha del evento" },
  { tag: "{codigo}", label: "Código" },
  { tag: "{enlace}", label: "Enlace" },
] as const;

/** Mensaje sugerido (texto aprobado por el usuario el 15 de octubre de 2026). */
export const DEFAULT_REFERRAL_TEMPLATE = `Hola, {nombre} 👋

Ya puedes planear tu evento en {salon} en 3D para tu evento del {fecha}: acomoda las mesas, sienta a tus invitados y compártelo con tu familia.

Tu código: {codigo}

Crea tu cuenta aquí: {enlace}`;

export const MAX_TEMPLATE_LENGTH = 1000;

export const referralLink = (origin: string, code: string) => `${origin}/registro?codigo=${encodeURIComponent(code)}`;

const day = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });

export type ReferralInfo = { code: string; guestName: string; venueName: string; eventDate?: string | null };

export function referralMessage(c: ReferralInfo, origin: string, template?: string | null) {
  let text = (template?.trim() || DEFAULT_REFERRAL_TEMPLATE).slice(0, MAX_TEMPLATE_LENGTH);
  if (c.eventDate) {
    text = text.replaceAll("{fecha}", day.format(new Date(`${c.eventDate}T12:00:00Z`)));
  } else {
    text = text.replace(/\s*para tu evento del \{fecha\}/gi, "").replace(/\s*del \{fecha\}/gi, "").replaceAll("{fecha}", "");
  }
  return text
    .replaceAll("{nombre}", c.guestName)
    .replaceAll("{salon}", c.venueName)
    .replaceAll("{codigo}", c.code)
    .replaceAll("{enlace}", referralLink(origin, c.code));
}

/** Avisos al guardar un mensaje propio: sin código o sin enlace, el cliente no puede entrar. */
export function templateWarnings(template: string) {
  const missing: string[] = [];
  if (!template.includes("{codigo}")) missing.push("el código ({codigo})");
  if (!template.includes("{enlace}")) missing.push("el enlace ({enlace})");
  return missing;
}

export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
