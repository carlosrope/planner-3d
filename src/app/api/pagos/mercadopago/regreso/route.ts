import { NextResponse } from "next/server";
import { processPayment, processPreapproval } from "@/lib/card-sync";
import { siteOrigin } from "@/lib/brand";
import { getCardCheckout } from "@/lib/dal";
import { reportError } from "@/lib/sentry";

// Regreso del cliente desde Mercado Pago: se revisa el pago o la suscripción en su API (no se confía en lo que trae la
// dirección) y se vuelve a Mi negocio con el resultado. Sirve también cuando el aviso no llegó (por ejemplo, en local).

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment_id") ?? url.searchParams.get("collection_id");
  const preapprovalId = url.searchParams.get("preapproval_id");
  const checkoutId = url.searchParams.get("suscripcion");
  let result = "pendiente";
  try {
    if (paymentId && paymentId !== "null") {
      const r = await processPayment(paymentId);
      result = r.status === "approved" ? "ok" : r.status === "rejected" ? "rechazado" : "pendiente";
    } else {
      const id = preapprovalId ?? (checkoutId ? (await getCardCheckout(checkoutId))?.mpId : null);
      if (id) {
        const r = await processPreapproval(id);
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
