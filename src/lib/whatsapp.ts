// WhatsApp: números en formato internacional (solo dígitos con lada de país) y enlaces wa.me.

/** 10 dígitos de México → 52 + número; con lada de país se respeta; vacío → null; raro → undefined. */
export function normalizeWhatsapp(raw: string): string | null | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `52${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return undefined;
}

/** Enlace que abre WhatsApp con el mensaje listo. */
export const waLink = (digits: string, text: string) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;

/** "52 668 130 5828" para mostrar un número guardado. */
export function formatWhatsapp(digits: string): string {
  const local = digits.startsWith("52") && digits.length === 12 ? digits.slice(2) : digits;
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : digits;
}
