import { NextResponse } from "next/server";
import { processPayment, processPreapproval, processSubscriptionCheckout } from "@/lib/card-sync";
import { siteOrigin } from "@/lib/brand";
import { getCardCheckout } from "@/lib/dal";
import { reportError } from "@/lib/sentry";
import { clientIp, makeLimiter } from "@/lib/suggestion";

// Regreso del cliente desde Mercado Pago: se revisa el pago o la suscripción en su API (no se confía en lo que trae la
// dirección) y se vuelve a Mi negocio con el resultado. Sirve también cuando el aviso no llegó (por ejemplo, en local).
// Es pública (Mercado Pago regresa sin nuestra sesión): solo acepta ids con forma de id y 30 regresos por hora por IP,
// para que nadie la use para consultar la API de Mercado Pago a nombre de Plantea.

const perHour = makeLimiter(30, 60 * 60 * 1000);
const param = (url: URL, names: string[], shape: RegExp) => {
  for (const name of names) {
    const v = url.searchParams.get(name);
    if (v && shape.test(v)) return v;
  }
  return null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = param(url, ["payment_id", "collection_id"], /^\d{1,20}$/);
  const preapprovalId = param(url, ["preapproval_id"], /^[A-Za-z0-9-]{1,64}$/);
  const checkoutId = param(url, ["suscripcion"], /^[0-9a-f-]{36}$/);
  let result = "pendiente";
  if (!perHour(clientIp(request.headers))) return NextResponse.redirect(new URL("/negocio?pago=error#pagar", siteOrigin() || url.origin), 303);
  try {
    if (paymentId) {
      const r = await processPayment(paymentId);
      result = r.status === "approved" ? "ok" : r.status === "rejected" ? "rechazado" : "pendiente";
    } else if (preapprovalId) {
      const r = await processPreapproval(preapprovalId);
      result = r.status === "authorized" ? "suscripcion" : "pendiente";
    } else if (checkoutId) {
      const checkout = await getCardCheckout(checkoutId);
      if (checkout) {
        const r = await processSubscriptionCheckout(checkout);
        result = r.status === "authorized" ? "suscripcion" : "pendiente";
      }
    }
  } catch (e) {
    result = "error";
    void reportError({ message: `Regreso de Mercado Pago: ${e instanceof Error ? e.message : e}`, source: "server" });
  }
  // Detrás de Railway la dirección interna no es la pública: se regresa a plantea.com.mx (o a la de BETTER_AUTH_URL).
  return NextResponse.redirect(new URL(`/negocio?pago=${result}#pagar`, siteOrigin() || url.origin), 303);
}
