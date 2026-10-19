import "server-only";
import { checkoutRef, paymentMatches, parseCheckoutRef } from "./card";
import { applyCardPayment, getCardCheckout, getCardCheckoutByMpId, listCardCheckouts, setCardCheckout, type CardCheckout } from "./dal";
import { getAuthorizedPayment, getPayment, getPreapproval, searchAuthorizedPayments, searchPayments, type MpPayment } from "./mercadopago";
import { reportError } from "./sentry";

/**
 * Aplica en Plantea lo que pasó en Mercado Pago. Todo se lee de su API con el token de Plantea (un aviso falso no
 * puede activar un plan); el pago se cuenta una sola vez aunque llegue por el aviso, por el regreso y por "Revisar".
 */

const PREAPPROVAL_STATUS: Record<string, string> = { authorized: "activa", paused: "pausada", cancelled: "cancelada", pending: "pendiente" };

async function applyIfPaid(checkout: CardCheckout, p: Pick<MpPayment, "id" | "status" | "currency_id" | "transaction_amount">) {
  if (!paymentMatches(p, checkout.amount)) {
    if (p.status === "approved") {
      void reportError({ message: `Pago de Mercado Pago aprobado que no coincide con el intento ${checkout.id}`, source: "server", extra: { pago: p.id, monto: p.transaction_amount, moneda: p.currency_id } });
    }
    return false;
  }
  return applyCardPayment(checkout, String(p.id));
}

/** Pago único (Checkout Pro) o cobro de una suscripción que llega como pago. */
export async function processPayment(id: string | number) {
  const p = await getPayment(id);
  const checkoutId = parseCheckoutRef(p.external_reference);
  const checkout = checkoutId ? await getCardCheckout(checkoutId) : null;
  if (!checkout) return { status: p.status, applied: false };
  if (p.status === "rejected" && checkout.kind === "pago" && checkout.status === "pendiente") await setCardCheckout(checkout.id, { status: "fallida" });
  return { status: p.status, applied: await applyIfPaid(checkout, p), checkout };
}

/** Cobro mensual de una suscripción. */
export async function processAuthorizedPayment(id: string | number) {
  const ap = await getAuthorizedPayment(id);
  const checkout = await getCardCheckoutByMpId(ap.preapproval_id);
  if (!checkout || !ap.payment) return { applied: false };
  const applied = await applyIfPaid(checkout, { id: ap.payment.id, status: ap.payment.status, currency_id: ap.currency_id, transaction_amount: ap.transaction_amount });
  return { applied, checkout };
}

/** Estado de una suscripción (autorizada, pausada, cancelada) y sus cobros ya aprobados. */
export async function processPreapproval(id: string) {
  const pa = await getPreapproval(id);
  const checkoutId = parseCheckoutRef(pa.external_reference);
  const checkout = (checkoutId ? await getCardCheckout(checkoutId) : null) ?? (await getCardCheckoutByMpId(pa.id));
  if (!checkout) return { status: pa.status, applied: false };
  const next = PREAPPROVAL_STATUS[pa.status];
  if (next && next !== checkout.status) await setCardCheckout(checkout.id, { status: next });
  let applied = false;
  for (const ap of await searchAuthorizedPayments(pa.id)) {
    if (ap.payment) applied = (await applyIfPaid(checkout, { id: ap.payment.id, status: ap.payment.status, currency_id: ap.currency_id, transaction_amount: ap.transaction_amount })) || applied;
  }
  return { status: pa.status, applied, checkout };
}

/** "Revisar mi pago": vuelve a preguntar a Mercado Pago por los intentos recientes del negocio. */
export async function syncOrgCardPayments(orgId: string) {
  const since = Date.now() - 60 * 86_400_000;
  let applied = 0;
  for (const c of await listCardCheckouts(orgId)) {
    if (c.createdAt.getTime() < since && c.status !== "activa") continue;
    try {
      if (c.kind === "pago") {
        for (const p of await searchPayments(checkoutRef(c.id))) if (await applyIfPaid(c, p)) applied++;
      } else if (c.mpId) {
        if ((await processPreapproval(c.mpId)).applied) applied++;
      }
    } catch (e) {
      void reportError({ message: `No se pudo revisar el intento ${c.id} en Mercado Pago: ${e instanceof Error ? e.message : e}`, source: "server" });
    }
  }
  return applied;
}
