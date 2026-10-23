/**
 * Pago con tarjeta por Mercado Pago: cuánto se cobra por cada plan, la referencia de cada intento de pago y la firma
 * de los avisos (webhooks). Puro (sin red ni base de datos): cubierto por card.test.ts.
 *
 * Mensual = suscripción que Mercado Pago cobra sola cada mes; anual = un solo pago con Checkout Pro.
 * Precios confirmados por el usuario (15 de octubre de 2026), en pesos con IVA incluido; los mismos de /planes.
 * El plan de Casas no tiene precio público (23 de octubre de 2026): se cotiza por proyecto y se arregla fuera de la tarjeta.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OrgKind, PaymentPeriod, Plan, Tier } from "./domain";

export const EXTRA_VENUE_PRICE = 250;

export type CardPriceInput = { plan: Plan; tier: Tier; period: PaymentPeriod; orgKind: OrgKind; extraVenues?: number };

/** Monto y descripción del cobro, o null si ese plan no se paga con tarjeta (se arregla por SPEI o WhatsApp). */
export function cardPrice({ plan, tier, period, orgKind, extraVenues = 0 }: CardPriceInput): { amount: number; title: string } | null {
  const extra = Math.max(0, Math.floor(extraVenues));
  if (plan === "personal") return period === "mes" ? { amount: 250, title: "Plantea · Personal · mensual" } : null;
  if (plan === "eventos") {
    const who = orgKind === "venue" ? "Salón" : "Planner";
    const extras = orgKind === "venue" ? extra : 0;
    const plus = extras ? ` + ${extras} salón adicional${extras === 1 ? "" : "es"}` : "";
    if (tier === "ilimitado") return period === "mes" ? { amount: 999 + EXTRA_VENUE_PRICE * extras, title: `Plantea · ${who} Ilimitado${plus} · mensual` } : null;
    if (period === "anio") return extras ? null : { amount: 7900, title: `Plantea · ${who} Pro · anual` };
    return { amount: 790 + EXTRA_VENUE_PRICE * extras, title: `Plantea · ${who} Pro${plus} · mensual` };
  }
  // Casas (desarrolladoras) se cotiza por proyecto desde el 23 de octubre de 2026: sin precio público ni cobro con tarjeta.
  return null; // "casas", "ambos" y los planes sin pago: por propuesta, SPEI o WhatsApp.
}

/** Referencia que viaja a Mercado Pago y regresa en cada pago: identifica el intento guardado en Plantea. */
export const checkoutRef = (checkoutId: string) => `plantea:${checkoutId}`;
export const parseCheckoutRef = (ref: string | null | undefined) => {
  const m = /^plantea:([0-9a-f-]{36})$/.exec(ref ?? "");
  return m ? m[1] : null;
};

/**
 * Firma de un aviso de Mercado Pago. Cabecera x-signature "ts=…,v1=…"; se firma con HMAC-SHA256 y el secreto de la
 * aplicación el texto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (data.id en minúsculas; lo que falte se omite).
 */
export function verifyWebhookSignature(input: { signature: string | null; requestId: string | null; dataId: string | null; secret: string }): boolean {
  const parts = Object.fromEntries(
    (input.signature ?? "").split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k?.trim(), v.join("=").trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !input.secret) return false;
  const manifest = `${input.dataId ? `id:${input.dataId.toLowerCase()};` : ""}${input.requestId ? `request-id:${input.requestId};` : ""}ts:${ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/** El pago cuenta solo si está aprobado, en pesos y por el monto que se pidió (un centavo de margen). */
export const paymentMatches = (p: { status?: string; currency_id?: string; transaction_amount?: number }, amount: number) =>
  p.status === "approved" && p.currency_id === "MXN" && typeof p.transaction_amount === "number" && Math.abs(p.transaction_amount - amount) < 0.01;
