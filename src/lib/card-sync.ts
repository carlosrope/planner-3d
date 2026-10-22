import "server-only";
import { checkoutRef, paymentMatches, parseCheckoutRef } from "./card";
import { applyCardPayment, getCardCheckout, getCardCheckoutByMpId, getCardCheckoutBySubscription, listCardCheckouts, reverseCardPayment, setCardCheckout, type CardCheckout } from "./dal";
import { getAuthorizedPayment, getPayment, getPreapproval, searchAuthorizedPayments, searchPayments, searchSubscriptionsOfPlan, type MpPayment } from "./mercadopago";
import { reportError } from "./sentry";

/**
 * Aplica en Plantea lo que pasó en Mercado Pago. Todo se lee de su API con el token de Plantea (un aviso falso no
 * puede activar un plan); el pago se cuenta una sola vez aunque llegue por el aviso, por el regreso y por "Revisar", y
 * si después se devuelve o tiene contracargo, deja de contar.
 */

const REVERSED = ["refunded", "charged_back"] as const;
const isReversed = (status: string): status is (typeof REVERSED)[number] => (REVERSED as readonly string[]).includes(status);

/** Día del próximo cobro de una suscripción según Mercado Pago (null si no lo dice o no se pudo consultar). */
const nextPaymentOf = (pa: { next_payment_date?: string | null } | null) => {
  const d = pa?.next_payment_date ? new Date(pa.next_payment_date) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
async function nextPaymentOfSubscription(id: string | null | undefined) {
  if (!id) return null;
  try {
    return nextPaymentOf(await getPreapproval(id));
  } catch {
    return null; // sin la fecha, el plan se alarga un mes (como antes)
  }
}

const PREAPPROVAL_STATUS: Record<string, string> = { authorized: "activa", paused: "pausada", cancelled: "cancelada", pending: "pendiente" };

async function applyIfPaid(checkout: CardCheckout, p: Pick<MpPayment, "id" | "status" | "currency_id" | "transaction_amount">, nextPayment: Date | null = null) {
  if (isReversed(p.status)) {
    await reverse(String(p.id), p.status);
    return false;
  }
  if (!paymentMatches(p, checkout.amount)) {
    if (p.status === "approved") {
      void reportError({ message: `Pago de Mercado Pago aprobado que no coincide con el intento ${checkout.id}`, source: "server", extra: { pago: p.id, monto: p.transaction_amount, moneda: p.currency_id } });
    }
    return false;
  }
  return applyCardPayment(checkout, String(p.id), nextPayment);
}

/** Un pago ya contado que se devolvió o tuvo contracargo: se quita del plan y se avisa (le llega correo de Sentry). */
async function reverse(mpPaymentId: string, status: (typeof REVERSED)[number]) {
  const reversed = await reverseCardPayment(mpPaymentId, status);
  if (reversed) {
    void reportError({
      message: `Mercado Pago: el pago ${mpPaymentId} ${status === "charged_back" ? "tuvo contracargo" : "se devolvió"}; se le quitó ese periodo al plan`,
      source: "server",
    });
  }
  return reversed;
}

/** Pago único (Checkout Pro) o cobro de una suscripción que llega como pago. */
export async function processPayment(id: string | number) {
  const p = await getPayment(id);
  // La devolución se busca por el id del pago: el de un cobro mensual puede no traer la referencia del intento.
  if (isReversed(p.status)) return { status: p.status, applied: false, reversed: await reverse(String(p.id), p.status) };
  const checkoutId = parseCheckoutRef(p.external_reference);
  const checkout = checkoutId ? await getCardCheckout(checkoutId) : null;
  if (!checkout) return { status: p.status, applied: false };
  if (p.status === "rejected" && checkout.kind === "pago" && checkout.status === "pendiente") await setCardCheckout(checkout.id, { status: "fallida" });
  const next = checkout.kind === "suscripcion" ? await nextPaymentOfSubscription(checkout.mpSubscriptionId) : null;
  return { status: p.status, applied: await applyIfPaid(checkout, p, next), checkout };
}

/** Cobro mensual de una suscripción. */
export async function processAuthorizedPayment(id: string | number) {
  const ap = await getAuthorizedPayment(id);
  const checkout = (await getCardCheckoutBySubscription(ap.preapproval_id)) ?? (await processPreapproval(ap.preapproval_id)).checkout ?? null;
  if (!checkout || !ap.payment) return { applied: false };
  const next = await nextPaymentOfSubscription(ap.preapproval_id);
  const applied = await applyIfPaid(checkout, { id: ap.payment.id, status: ap.payment.status, currency_id: ap.currency_id, transaction_amount: ap.transaction_amount }, next);
  return { applied, checkout };
}

/** Estado de una suscripción (autorizada, pausada, cancelada) y sus cobros ya aprobados. */
export async function processPreapproval(id: string) {
  const pa = await getPreapproval(id);
  const checkoutId = parseCheckoutRef(pa.external_reference);
  const checkout =
    (checkoutId ? await getCardCheckout(checkoutId) : null) ??
    (await getCardCheckoutBySubscription(pa.id)) ??
    (pa.preapproval_plan_id ? await getCardCheckoutByMpId(pa.preapproval_plan_id) : null);
  if (!checkout) return { status: pa.status, applied: false };
  const next = PREAPPROVAL_STATUS[pa.status];
  // Se guarda la suscripción del cliente (para sus cobros mensuales y para cancelarla desde Mi negocio).
  if ((next && next !== checkout.status) || checkout.mpSubscriptionId !== pa.id) {
    await setCardCheckout(checkout.id, { ...(next ? { status: next } : {}), mpSubscriptionId: pa.id });
  }
  let applied = false;
  for (const ap of await searchAuthorizedPayments(pa.id)) {
    if (ap.payment) applied = (await applyIfPaid(checkout, { id: ap.payment.id, status: ap.payment.status, currency_id: ap.currency_id, transaction_amount: ap.transaction_amount }, nextPaymentOf(pa))) || applied;
  }
  return { status: pa.status, applied, checkout };
}

/** Regreso de una suscripción: busca la suscripción del cliente en el plan del intento y la aplica. */
export async function processSubscriptionCheckout(checkout: CardCheckout) {
  if (checkout.mpSubscriptionId) return processPreapproval(checkout.mpSubscriptionId);
  if (!checkout.mpId) return { status: "pending", applied: false };
  let last: { status: string; applied: boolean } = { status: "pending", applied: false };
  for (const sub of await searchSubscriptionsOfPlan(checkout.mpId)) last = await processPreapproval(sub.id);
  return last;
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
      } else if (c.mpSubscriptionId) {
        if ((await processPreapproval(c.mpSubscriptionId)).applied) applied++;
      } else if (c.mpId) {
        for (const sub of await searchSubscriptionsOfPlan(c.mpId)) if ((await processPreapproval(sub.id)).applied) applied++;
      }
    } catch (e) {
      void reportError({ message: `No se pudo revisar el intento ${c.id} en Mercado Pago: ${e instanceof Error ? e.message : e}`, source: "server" });
    }
  }
  return applied;
}
