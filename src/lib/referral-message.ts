/** Enlace y mensaje de WhatsApp con el que el dueño manda el código a su cliente (puro: servidor y navegador). */
export const referralLink = (origin: string, code: string) => `${origin}/registro?codigo=${encodeURIComponent(code)}`;

const day = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });

export function referralMessage(c: { code: string; guestName: string; venueName: string; eventDate?: string | null }, origin: string) {
  const when = c.eventDate ? ` para tu evento del ${day.format(new Date(`${c.eventDate}T12:00:00Z`))}` : "";
  return [
    `Hola, ${c.guestName} 👋`,
    `Ya puedes planear tu evento en ${c.venueName} en 3D${when}, sin costo: acomoda las mesas, sienta a tus invitados y compártelo con tu familia.`,
    `Tu código: *${c.code}*`,
    `Crea tu cuenta aquí: ${referralLink(origin, c.code)}`,
  ].join("\n\n");
}

export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
