import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/card";
import { processAuthorizedPayment, processPayment, processPreapproval } from "@/lib/card-sync";
import { MercadoPagoError } from "@/lib/mercadopago";
import { reportError } from "@/lib/sentry";

// Avisos (webhooks) de Mercado Pago: pagos, suscripciones y cobros mensuales. Se valida la firma con MP_WEBHOOK_SECRET y
// luego todo se lee de la API de Mercado Pago; se responde 200 para que no reintente, salvo si su API falló (500: reintenta).

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (secret) {
    const ok = verifyWebhookSignature({
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: url.searchParams.get("data.id") ?? dataId,
      secret,
    });
    if (!ok) return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  } else if (process.env.NODE_ENV === "production") {
    // Sin secreto en producción no se procesa nada: se configura en Railway junto con las llaves.
    return NextResponse.json({ error: "Falta MP_WEBHOOK_SECRET." }, { status: 503 });
  }
  if (!dataId) return NextResponse.json({ ok: true });

  try {
    if (type === "payment") await processPayment(dataId);
    else if (type === "subscription_authorized_payment") await processAuthorizedPayment(dataId);
    else if (type === "subscription_preapproval") await processPreapproval(dataId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof MercadoPagoError && e.status === 404 ? 200 : 500;
    void reportError({ message: `Aviso de Mercado Pago (${type} ${dataId}): ${e instanceof Error ? e.message : e}`, source: "server" });
    return NextResponse.json({ ok: status === 200 }, { status });
  }
}
