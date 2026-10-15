/**
 * Mensaje de WhatsApp con el que el dueño manda el código a su cliente (puro: servidor y navegador).
 *
 * Pensado para quien no usa "etiquetas": el negocio elige un estilo y, si quiere, cambia el párrafo del medio con
 * sus palabras. El saludo con el nombre del cliente, el código y el enlace los pone Plantea siempre, en su lugar,
 * y no se pueden borrar (así el cliente siempre puede entrar). Se guarda como JSON en organization.referral_message.
 */
export const MESSAGE_STYLES = ["cercano", "formal", "corto"] as const;
export type MessageStyle = (typeof MESSAGE_STYLES)[number];
export const MESSAGE_STYLE_LABELS: Record<MessageStyle, string> = { cercano: "Cercano", formal: "Formal", corto: "Corto" };

export type MessageSetting = { style: MessageStyle; body: string | null };
export const DEFAULT_SETTING: MessageSetting = { style: "cercano", body: null };
export const MAX_BODY_LENGTH = 500;

export type ReferralInfo = { code: string; guestName: string; venueName: string; eventDate?: string | null };

const day = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
const dateOf = (c: ReferralInfo) => (c.eventDate ? day.format(new Date(`${c.eventDate}T12:00:00Z`)) : null);

export const referralLink = (origin: string, code: string) => `${origin}/registro?codigo=${encodeURIComponent(code)}`;

/** Párrafo del medio que trae cada estilo (con el salón y la fecha de cada cliente). */
export function defaultBody(style: MessageStyle, c: ReferralInfo) {
  const when = dateOf(c);
  if (style === "formal") {
    return `Le compartimos su acceso para planear su evento en ${c.venueName} en 3D${when ? `, del ${when}` : ""}. Ahí podrá acomodar las mesas, ubicar a sus invitados y compartirlo con su familia.`;
  }
  if (style === "corto") return `Arma tu evento en ${c.venueName} en 3D${when ? ` para el ${when}` : ""}.`;
  // Cercano: el texto que aprobó el usuario el 15 de octubre de 2026.
  return `Ya puedes planear tu evento en ${c.venueName} en 3D${when ? ` para tu evento del ${when}` : ""}: acomoda las mesas, sienta a tus invitados y compártelo con tu familia.`;
}

export function referralMessage(c: ReferralInfo, origin: string, setting: MessageSetting = DEFAULT_SETTING) {
  const body = setting.body?.trim() ? setting.body.trim().slice(0, MAX_BODY_LENGTH) : defaultBody(setting.style, c);
  const link = referralLink(origin, c.code);
  if (setting.style === "formal") return `Buen día, ${c.guestName}.\n\n${body}\n\nSu código: ${c.code}\n\nCree su cuenta aquí: ${link}`;
  if (setting.style === "corto") return `Hola, ${c.guestName} 👋 ${body}\n\nCódigo: ${c.code}\n${link}`;
  return `Hola, ${c.guestName} 👋\n\n${body}\n\nTu código: ${c.code}\n\nCrea tu cuenta aquí: ${link}`;
}

const isStyle = (v: unknown): v is MessageStyle => typeof v === "string" && (MESSAGE_STYLES as readonly string[]).includes(v);

/** Lee lo guardado; cualquier cosa rara (o el formato viejo con etiquetas) vuelve al sugerido. */
export function parseSetting(raw: string | null | undefined): MessageSetting {
  if (!raw) return DEFAULT_SETTING;
  try {
    const v = JSON.parse(raw) as { style?: unknown; body?: unknown };
    return { style: isStyle(v.style) ? v.style : "cercano", body: typeof v.body === "string" && v.body.trim() ? v.body.trim().slice(0, MAX_BODY_LENGTH) : null };
  } catch {
    return DEFAULT_SETTING;
  }
}

/** Lo que se guarda (null = el sugerido: cercano, sin texto propio). */
export function serializeSetting(s: MessageSetting): string | null {
  const body = s.body?.trim() || null;
  return s.style === "cercano" && !body ? null : JSON.stringify({ style: s.style, body });
}

export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
