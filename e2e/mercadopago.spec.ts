import { createHmac, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { Pool } from "pg";
import { E2E } from "../playwright.config";
import { addDays, endOfDay, today } from "../src/lib/dates";
import { planEndAfterPayment } from "../src/lib/domain";

// Avisos de Mercado Pago contra un Mercado Pago falso (e2e/mercadopago-falso.ts): repetidos, a la vez, fuera de orden,
// con su API caída y con firma falsa. Lo que cuenta es lo que queda en la base: pagos registrados y fin del plan.
test.describe.configure({ mode: "serial" });

const db = new Pool({ connectionString: E2E.databaseUrl, max: 4 });
test.afterAll(() => db.end());

let nextId = Date.now() % 1_000_000_000;
const newId = () => ++nextId;

async function falso(path: string, body: unknown = {}) {
  const res = await fetch(`http://localhost:${E2E.mpPort}${path}`, { method: "POST", body: JSON.stringify(body) });
  expect(res.ok).toBe(true);
}

/** Aviso firmado como lo firma Mercado Pago (o con otra clave, para probar el rechazo). */
async function notify(request: APIRequestContext, type: string, id: string | number, secret: string | null = E2E.mpSecret) {
  const ts = String(Date.now());
  const requestId = randomUUID();
  const v1 = createHmac("sha256", secret ?? "").update(`id:${String(id).toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
  const res = await request.post(`/api/pagos/mercadopago?data.id=${id}&type=${type}`, {
    data: { type, data: { id: String(id) } },
    headers: secret === null ? {} : { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
  });
  return res.status();
}

/** Negocio con plan Eventos que vence en 10 días. */
async function newOrg() {
  const id = randomUUID();
  const endsAt = endOfDay(addDays(today(), 10));
  await db.query(
    `insert into organization (id, name, kind, modules, plan, plan_ends_at, tier) values ($1, $2, 'planner', '["salones"]', 'eventos', $3, 'pro')`,
    [id, `Negocio MP ${id.slice(0, 6)}`, endsAt],
  );
  return { id, endsAt };
}

async function newCheckout(orgId: string, kind: "pago" | "suscripcion" = "pago", mpId: string | null = null) {
  const id = randomUUID();
  await db.query(
    `insert into card_checkout (id, org_id, kind, plan, tier, period, amount, title, mp_id) values ($1, $2, $3, 'eventos', 'pro', 'mes', 790, 'Plantea · Planner Pro · mensual', $4)`,
    [id, orgId, kind, mpId],
  );
  return { id, ref: `plantea:${id}` };
}

const approved = (id: number, ref: string, amount = 790) => ({ id, status: "approved", currency_id: "MXN", transaction_amount: amount, external_reference: ref });

async function state(orgId: string) {
  const org = await db.query<{ plan_ends_at: Date }>("select plan_ends_at from organization where id = $1", [orgId]);
  const pays = await db.query<{ n: string }>("select count(*) as n from payment where org_id = $1", [orgId]);
  return { endsAt: org.rows[0].plan_ends_at, payments: Number(pays.rows[0].n) };
}

const months = (from: Date, n: number) => Array.from({ length: n }).reduce<Date>((d) => planEndAfterPayment(d, "mes"), from);

test("el mismo aviso cinco veces a la vez cuenta un solo pago", async ({ request }) => {
  const org = await newOrg();
  const checkout = await newCheckout(org.id);
  const pay = newId();
  await falso("/__estado", { payments: [approved(pay, checkout.ref)] });
  await falso("/__barrera", { n: 5 });

  const statuses = await Promise.all(Array.from({ length: 5 }, () => notify(request, "payment", pay)));
  expect(statuses).toEqual([200, 200, 200, 200, 200]);
  const after = await state(org.id);
  expect(after.payments).toBe(1);
  expect(after.endsAt.getTime()).toBe(months(org.endsAt, 1).getTime());

  // Mercado Pago lo vuelve a mandar más tarde (por ejemplo, si no le llegó nuestra respuesta): no cambia nada.
  expect(await notify(request, "payment", pay)).toBe(200);
  expect(await state(org.id)).toEqual(after);
});

test("dos pagos distintos del mismo negocio a la vez suman los dos meses", async ({ request }) => {
  const org = await newOrg();
  const [a, b] = [await newCheckout(org.id), await newCheckout(org.id)];
  const [payA, payB] = [newId(), newId()];
  await falso("/__estado", { payments: [approved(payA, a.ref), approved(payB, b.ref)] });
  await falso("/__barrera", { n: 2 });

  expect(await Promise.all([notify(request, "payment", payA), notify(request, "payment", payB)])).toEqual([200, 200]);
  const after = await state(org.id);
  expect(after.payments).toBe(2);
  expect(after.endsAt.getTime()).toBe(months(org.endsAt, 2).getTime());
});

test("si la API de Mercado Pago falla, responde 500 para que reintente y el reintento cuenta una vez", async ({ request }) => {
  const org = await newOrg();
  const checkout = await newCheckout(org.id);
  const pay = newId();
  await falso("/__estado", { payments: [approved(pay, checkout.ref)] });
  await falso("/__falla", { id: pay, veces: 1 });

  expect(await notify(request, "payment", pay)).toBe(500);
  expect(await state(org.id)).toEqual({ endsAt: org.endsAt, payments: 0 });
  expect(await notify(request, "payment", pay)).toBe(200);
  expect(await notify(request, "payment", pay)).toBe(200);
  expect(await state(org.id)).toEqual({ endsAt: months(org.endsAt, 1), payments: 1 });
});

test("un aviso sin firma o firmado con otra clave no cambia nada", async ({ request }) => {
  const org = await newOrg();
  const checkout = await newCheckout(org.id);
  const pay = newId();
  await falso("/__estado", { payments: [approved(pay, checkout.ref)] });

  expect(await notify(request, "payment", pay, null)).toBe(401);
  expect(await notify(request, "payment", pay, "otra-clave")).toBe(401);
  expect(await state(org.id)).toEqual({ endsAt: org.endsAt, payments: 0 });
});

test("un pago rechazado que llega después del aprobado no quita nada, y un monto distinto no activa", async ({ request }) => {
  const org = await newOrg();
  const checkout = await newCheckout(org.id);
  const [rejected, ok, short] = [newId(), newId(), newId()];
  await falso("/__estado", {
    payments: [{ ...approved(rejected, checkout.ref), status: "rejected" }, approved(ok, checkout.ref), approved(short, checkout.ref, 79)],
  });

  expect(await notify(request, "payment", ok)).toBe(200);
  expect(await notify(request, "payment", rejected)).toBe(200);
  expect(await notify(request, "payment", short)).toBe(200);
  expect(await state(org.id)).toEqual({ endsAt: months(org.endsAt, 1), payments: 1 });
  const status = await db.query<{ status: string }>("select status from card_checkout where id = $1", [checkout.id]);
  expect(status.rows[0].status).toBe("pagado");
});

test("suscripción: el cobro mensual llega antes que el aviso de la suscripción y cuenta una sola vez", async ({ request }) => {
  const org = await newOrg();
  const planId = `plan-e2e-${newId()}`;
  const checkout = await newCheckout(org.id, "suscripcion", planId);
  const [pre, ap, pay] = [`pre-e2e-${newId()}`, newId(), newId()];
  await falso("/__estado", {
    preapprovals: [{ id: pre, status: "authorized", external_reference: checkout.ref, preapproval_plan_id: planId }],
    authorized: [{ id: ap, preapproval_id: pre, status: "processed", transaction_amount: 790, currency_id: "MXN", payment: { id: pay, status: "approved" } }],
  });

  expect(await notify(request, "subscription_authorized_payment", ap)).toBe(200);
  expect(await notify(request, "subscription_preapproval", pre)).toBe(200);
  expect(await notify(request, "subscription_authorized_payment", ap)).toBe(200);
  expect(await state(org.id)).toEqual({ endsAt: months(org.endsAt, 1), payments: 1 });
  const row = await db.query<{ status: string; mp_subscription_id: string }>("select status, mp_subscription_id from card_checkout where id = $1", [checkout.id]);
  expect(row.rows[0]).toEqual({ status: "activa", mp_subscription_id: pre });
});
