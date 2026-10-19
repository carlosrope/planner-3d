import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cardPrice, checkoutRef, parseCheckoutRef, paymentMatches, verifyWebhookSignature } from "./card";

describe("pago con tarjeta", () => {
  it("cobra los precios de /planes, con IVA", () => {
    expect(cardPrice({ plan: "eventos", tier: "pro", period: "mes", orgKind: "venue" })).toEqual({ amount: 790, title: "Plantea · Salón Pro · mensual" });
    expect(cardPrice({ plan: "eventos", tier: "pro", period: "anio", orgKind: "planner" })?.amount).toBe(7900);
    expect(cardPrice({ plan: "eventos", tier: "ilimitado", period: "mes", orgKind: "planner" })?.amount).toBe(999);
    expect(cardPrice({ plan: "casas", tier: "pro", period: "mes", orgKind: "agency" })?.amount).toBe(690);
    expect(cardPrice({ plan: "casas", tier: "pro", period: "anio", orgKind: "developer" })?.amount).toBe(7900);
    expect(cardPrice({ plan: "personal", tier: "pro", period: "mes", orgKind: "planner" })?.amount).toBe(250);
  });

  it("suma $250 por cada salón adicional al mes", () => {
    expect(cardPrice({ plan: "eventos", tier: "pro", period: "mes", orgKind: "venue", extraVenues: 3 })?.amount).toBe(1540);
    expect(cardPrice({ plan: "eventos", tier: "ilimitado", period: "mes", orgKind: "venue", extraVenues: 1 })?.amount).toBe(1249);
    expect(cardPrice({ plan: "eventos", tier: "pro", period: "mes", orgKind: "planner", extraVenues: 3 })?.amount).toBe(790);
  });

  it("lo que no tiene precio publicado no se cobra con tarjeta", () => {
    expect(cardPrice({ plan: "eventos", tier: "ilimitado", period: "anio", orgKind: "venue" })).toBeNull();
    expect(cardPrice({ plan: "eventos", tier: "pro", period: "anio", orgKind: "venue", extraVenues: 1 })).toBeNull();
    expect(cardPrice({ plan: "ambos", tier: "pro", period: "mes", orgKind: "venue" })).toBeNull();
    expect(cardPrice({ plan: "personal", tier: "pro", period: "anio", orgKind: "planner" })).toBeNull();
    expect(cardPrice({ plan: "prueba", tier: "pro", period: "mes", orgKind: "venue" })).toBeNull();
  });

  it("la referencia identifica el intento de pago y no acepta otra cosa", () => {
    const id = "8f0c2a4e-1b2c-4d5e-8f90-123456789abc";
    expect(parseCheckoutRef(checkoutRef(id))).toBe(id);
    expect(parseCheckoutRef("plantea:../../x")).toBeNull();
    expect(parseCheckoutRef(null)).toBeNull();
  });

  it("verifica la firma de los avisos de Mercado Pago", () => {
    const secret = "secreto-de-prueba";
    const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");
    const v1 = sign("id:123abc;request-id:req-1;ts:1704908010;");
    expect(verifyWebhookSignature({ signature: `ts=1704908010,v1=${v1}`, requestId: "req-1", dataId: "123ABC", secret })).toBe(true);
    expect(verifyWebhookSignature({ signature: `ts=1704908010,v1=${v1}`, requestId: "req-2", dataId: "123ABC", secret })).toBe(false);
    expect(verifyWebhookSignature({ signature: `ts=1704908010,v1=${v1}`, requestId: "req-1", dataId: "123ABC", secret: "otro" })).toBe(false);
    expect(verifyWebhookSignature({ signature: null, requestId: "req-1", dataId: "1", secret })).toBe(false);
    expect(verifyWebhookSignature({ signature: "ts=1,v1=zz", requestId: "req-1", dataId: "1", secret })).toBe(false);
  });

  it("solo cuenta un pago aprobado, en pesos y por el monto pedido", () => {
    expect(paymentMatches({ status: "approved", currency_id: "MXN", transaction_amount: 790 }, 790)).toBe(true);
    expect(paymentMatches({ status: "pending", currency_id: "MXN", transaction_amount: 790 }, 790)).toBe(false);
    expect(paymentMatches({ status: "approved", currency_id: "MXN", transaction_amount: 1 }, 790)).toBe(false);
    expect(paymentMatches({ status: "approved", currency_id: "USD", transaction_amount: 790 }, 790)).toBe(false);
  });
});
