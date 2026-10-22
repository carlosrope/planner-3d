import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/card";
import { processAuthorizedPayment, processPayment, processPreapproval } from "@/lib/card-sync";
import { MercadoPagoError } from "@/lib/mercadopago";
import { reportError } from "@/lib/sentry";

// Avisos (webhooks) de Mercado Pago: pagos, suscripciones y cobros mensuales. Se valida la firma con MP_WEBHOOK_SECRET y
// luego todo se lee de la API de Mercado Pago; se responde 200 para que no reintente, salvo si su API falló (500: reintenta).
// Cada aviso deja una línea «[mercadopago] aviso …» en los registros de Railway: así se comprueba una simulación del panel
// (un pago que no existe: «no existe en Mercado Pago (404), se ignora») sin tener que esperar un pago real.

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  const tag = `[mercadopago] aviso ${type || "sin tipo"} ${dataId || "sin id"}`;

  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (secret) {
    const ok = verifyWebhookSignature({
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: url.searchParams.get("data.id") ?? dataId,
      secret,
    });
    if (!ok) {
      console.warn(`${tag}: firma inválida (401)`);
      return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Sin secreto en producción no se procesa nada: se configura en Railway junto con las llaves.
    console.error(`${tag}: falta MP_WEBHOOK_SECRET (503)`);
    return NextResponse.json({ error: "Falta MP_WEBHOOK_SECRET." }, { status: 503 });
  }
  if (!dataId) return NextResponse.json({ ok: true });

  try {
    const result =
      type === "payment"
        ? await processPayment(dataId)
        : type === "subscription_authorized_payment"
          ? await processAuthorizedPayment(dataId)
          : type === "subscription_preapproval"
            ? await processPreapproval(dataId)
            : null;
    const outcome = !result
      ? "tipo que no se usa, se ignora"
      : result.applied
        ? "plan activado o alargado"
        : "reversed" in result && result.reversed
          ? "pago devuelto o con contracargo: se quitó del plan"
          : "sin cambios";
    console.info(`${tag}: ${outcome} (200)`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Un id que no existe (como el de «Simular notificación») se ignora con 200 para que Mercado Pago no reintente.
    if (e instanceof MercadoPagoError && e.status === 404) {
      console.info(`${tag}: no existe en Mercado Pago (404), se ignora (200)`);
      return NextResponse.json({ ok: true });
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error(`${tag}: falló al consultar Mercado Pago (500): ${message}`);
    void reportError({ message: `Aviso de Mercado Pago (${type} ${dataId}): ${message}`, source: "server" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
