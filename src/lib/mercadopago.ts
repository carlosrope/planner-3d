import "server-only";
import { randomUUID } from "node:crypto";
import { siteOrigin } from "./brand";
import { checkoutRef } from "./card";

/**
 * Cliente mínimo de la API de Mercado Pago (HTTP, sin SDK). Con MP_ACCESS_TOKEN el botón "Pagar con tarjeta" aparece en
 * Mi negocio; sin él, solo hay SPEI. En local se usan las credenciales de un vendedor de prueba y se paga entrando con el
 * comprador de prueba en la página de Mercado Pago.
 */
const API = "https://api.mercadopago.com";

export const mpEnabled = () => Boolean(process.env.MP_ACCESS_TOKEN?.trim());

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function mp<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) throw new MercadoPagoError("Mercado Pago no está configurado", 503);
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.method && init.method !== "GET" ? { "X-Idempotency-Key": randomUUID() } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new MercadoPagoError(`Mercado Pago ${res.status}: ${data?.message ?? "error"}`, res.status);
  return data;
}

/** Direcciones de regreso y de avisos. Mercado Pago solo manda avisos a https; en local se revisa al regresar. */
function urls() {
  const origin = siteOrigin() || "http://localhost:3000";
  const https = origin.startsWith("https://");
  return { origin, https, back: `${origin}/api/pagos/mercadopago/regreso`, notify: https ? `${origin}/api/pagos/mercadopago` : undefined };
}


export type MpPayment = {
  id: number;
  status: string;
  status_detail?: string;
  currency_id: string;
  transaction_amount: number;
  external_reference?: string | null;
  date_approved?: string | null;
};

export type MpPreapproval = {
  id: string;
  status: string;
  init_point?: string;
  external_reference?: string | null;
  preapproval_plan_id?: string | null;
  reason?: string;
};

export type MpAuthorizedPayment = {
  id: number;
  preapproval_id: string;
  status: string;
  transaction_amount: number;
  currency_id: string;
  payment?: { id: number; status: string; status_detail?: string } | null;
};

/** Pago único (Checkout Pro): manda a la página de Mercado Pago (tarjeta, meses sin intereses si aplican, OXXO). */
export async function createPreference(input: { checkoutId: string; title: string; amount: number; email: string }) {
  const u = urls();
  return mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    body: {
      items: [{ id: input.checkoutId, title: input.title, quantity: 1, unit_price: input.amount, currency_id: "MXN" }],
      payer: { email: input.email },
      external_reference: checkoutRef(input.checkoutId),
      back_urls: { success: u.back, pending: u.back, failure: u.back },
      ...(u.https ? { auto_return: "approved" } : {}),
      notification_url: u.notify,
      statement_descriptor: "PLANTEA",
    },
  });
}

/**
 * Suscripción mensual: un plan de suscripción (preapproval_plan) por intento; el cliente entra con su propia cuenta de
 * Mercado Pago y se suscribe (así no importa con qué correo tenga su cuenta). Mercado Pago cobra solo cada mes.
 */
export async function createSubscriptionPlan(input: { checkoutId: string; title: string; amount: number }) {
  const u = urls();
  return mp<{ id: string; init_point: string; status: string }>("/preapproval_plan", {
    method: "POST",
    body: {
      reason: input.title,
      external_reference: checkoutRef(input.checkoutId),
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: input.amount, currency_id: "MXN" },
      // La suscripción no acepta regresar a http; en local regresa a plantea.com.mx y se revisa con "Revisar mi pago".
      back_url: u.https ? `${u.back}?suscripcion=${input.checkoutId}` : `https://plantea.com.mx/negocio`,
    },
  });
}

export async function searchSubscriptionsOfPlan(planId: string) {
  const r = await mp<{ results?: MpPreapproval[] }>(`/preapproval/search?preapproval_plan_id=${encodeURIComponent(planId)}`);
  return r.results ?? [];
}

export const getPayment = (id: string | number) => mp<MpPayment>(`/v1/payments/${encodeURIComponent(String(id))}`);
export const getPreapproval = (id: string) => mp<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`);
export const getAuthorizedPayment = (id: string | number) => mp<MpAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(String(id))}`);
export const cancelPreapproval = (id: string) => mp<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`, { method: "PUT", body: { status: "cancelled" } });

export async function searchPayments(externalReference: string) {
  const r = await mp<{ results?: MpPayment[] }>(`/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc`);
  return r.results ?? [];
}

export async function searchAuthorizedPayments(preapprovalId: string) {
  const r = await mp<{ results?: MpAuthorizedPayment[] }>(`/authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`);
  return r.results ?? [];
}
