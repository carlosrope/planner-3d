/**
 * Mercado Pago falso para las pruebas de punta a punta (e2e/mercadopago.spec.ts). El servidor de pruebas lo usa con
 * MP_API_URL; nunca sale a la API real. Las pruebas le dicen qué pagos y suscripciones existen y cómo debe fallar:
 *
 * - POST /__estado     {payments?, preapprovals?, authorized?}: agrega o reemplaza registros por id.
 * - POST /__falla      {id, veces, status?}: las próximas `veces` consultas de ese id responden con error (500).
 * - POST /__barrera    {n}: las próximas `n` consultas esperan a que lleguen todas y responden juntas (avisos a la vez).
 * - POST /__reiniciar: borra todo.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type Rec = Record<string, unknown>;
const port = Number(process.env.MP_FALSO_PORT ?? 3101);

const payments = new Map<string, Rec>();
const preapprovals = new Map<string, Rec>();
const authorized = new Map<string, Rec>();
const failures = new Map<string, { left: number; status: number }>();
let barrier: { n: number; waiting: (() => void)[] } | null = null;

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

async function readJson(req: IncomingMessage): Promise<Rec> {
  let text = "";
  for await (const chunk of req) text += chunk;
  return text ? (JSON.parse(text) as Rec) : {};
}

/** Espera en la barrera, si hay una: así los avisos de una prueba llegan a la base de datos al mismo tiempo. */
function wait(): Promise<void> {
  const b = barrier;
  if (!b) return Promise.resolve();
  return new Promise((resolve) => {
    b.waiting.push(resolve);
    if (b.waiting.length >= b.n) {
      barrier = null;
      for (const go of b.waiting) go();
    }
  });
}

function failure(id: string) {
  const f = failures.get(id);
  if (!f || f.left <= 0) return null;
  f.left -= 1;
  return f.status;
}

function merge(target: Map<string, Rec>, items: unknown) {
  for (const item of (items as Rec[] | undefined) ?? []) target.set(String(item.id), item);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const path = url.pathname;
  try {
    if (req.method === "POST" && path === "/__estado") {
      const body = await readJson(req);
      merge(payments, body.payments);
      merge(preapprovals, body.preapprovals);
      merge(authorized, body.authorized);
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && path === "/__falla") {
      const body = await readJson(req);
      failures.set(String(body.id), { left: Number(body.veces ?? 1), status: Number(body.status ?? 500) });
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && path === "/__barrera") {
      barrier = { n: Number((await readJson(req)).n ?? 2), waiting: [] };
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && path === "/__reiniciar") {
      for (const m of [payments, preapprovals, authorized, failures]) m.clear();
      barrier = null;
      return send(res, 200, { ok: true });
    }
    if (path === "/__salud") return send(res, 200, { ok: true });

    if (!req.headers.authorization?.startsWith("Bearer ")) return send(res, 401, { message: "unauthorized" });
    if (req.method !== "GET") return send(res, 405, { message: "solo lectura en el falso" });

    // Búsquedas.
    if (path === "/v1/payments/search") {
      const ref = url.searchParams.get("external_reference");
      return send(res, 200, { results: [...payments.values()].filter((p) => p.external_reference === ref) });
    }
    if (path === "/authorized_payments/search") {
      const pre = url.searchParams.get("preapproval_id");
      return send(res, 200, { results: [...authorized.values()].filter((a) => a.preapproval_id === pre) });
    }
    if (path === "/preapproval/search") {
      const plan = url.searchParams.get("preapproval_plan_id");
      return send(res, 200, { results: [...preapprovals.values()].filter((p) => p.preapproval_plan_id === plan) });
    }

    // Consultas por id.
    const m = /^\/(v1\/payments|preapproval|authorized_payments)\/([^/]+)$/.exec(path);
    if (!m) return send(res, 404, { message: "not_found" });
    const id = decodeURIComponent(m[2]);
    await wait();
    const failed = failure(id);
    if (failed) return send(res, failed, { message: "internal_error (falso)" });
    const store = m[1] === "v1/payments" ? payments : m[1] === "preapproval" ? preapprovals : authorized;
    const item = store.get(id);
    return item ? send(res, 200, item) : send(res, 404, { message: "not_found" });
  } catch (e) {
    return send(res, 500, { message: String(e) });
  }
}).listen(port, () => console.log(`Mercado Pago falso en http://localhost:${port}`));
