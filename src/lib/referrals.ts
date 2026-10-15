import { TOKEN_CHARS } from "./tokens";
import { monthOf, startOfDay } from "./dates";

/**
 * Códigos de referido: el dueño de un salón (o una planner) genera uno por cliente; con él, el cliente crea su
 * cuenta y arma un solo evento en ese lugar sin pagar. Son legibles y se dictan por teléfono: un prefijo que
 * recuerda al lugar y cuatro letras o dígitos que no se confunden (sin I, l, 1, O ni 0), por ejemplo PALMAS-7K3M.
 */

const PREFIX_LENGTH = 6;
const SUFFIX_LENGTH = 4;

/** Prefijo a partir del nombre del lugar: letras y dígitos, sin acentos, en mayúsculas. */
export function referralPrefix(venueName: string): string {
  const clean = venueName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/^(SALON|SALONES|JARDIN|QUINTA|HACIENDA|CASA|EL|LA|LOS|LAS|DE|DEL)\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
  return (clean || "PLANTEA").slice(0, PREFIX_LENGTH);
}

/** Código nuevo; `random` da bytes al azar (en el servidor, crypto.randomBytes). */
export function newReferralCode(venueName: string, random: (n: number) => Uint8Array): string {
  const bytes = random(SUFFIX_LENGTH);
  const suffix = Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length].toUpperCase()).join("");
  return `${referralPrefix(venueName)}-${suffix}`;
}

/** Lo que escribió el cliente, como se guardó: mayúsculas, sin espacios; acepta el guion escrito o no. */
export function normalizeReferralCode(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!s) return null;
  const m = /^([A-Z0-9]{1,6})-?([A-Z0-9]{4})$/.exec(s);
  return m ? `${m[1]}-${m[2]}` : s.length <= 24 ? s : null;
}

/** Primer instante del mes en curso (hora de México), para contar los códigos dados este mes. */
export function monthStart(now = new Date()): Date {
  return startOfDay(`${monthOf(now)}-01`);
}

/** Códigos que todavía puede dar este mes (null = sin tope). */
export function referralLeft(quota: number | null, usedThisMonth: number): number | null {
  return quota === null ? null : Math.max(0, quota - usedThisMonth);
}
