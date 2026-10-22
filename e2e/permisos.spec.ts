import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { E2E } from "../playwright.config";
import { createEvent, signIn, signUp, uniqueEmail } from "./helpers";

// Permisos: otra cuenta (o alguien sin cuenta) no puede ver ni cambiar datos ajenos cambiando un id, y la
// administración solo abre con su correo verificado. Todo se pide directo al servidor, sin pasar por la interfaz.
test.describe.configure({ mode: "serial" });

const db = new Pool({ connectionString: E2E.databaseUrl, max: 2 });
test.afterAll(() => db.end());

const owner = { email: uniqueEmail("duena"), eventId: "", layoutId: "", token: "", commentId: "", paymentId: "", fileId: "" };

async function newAccount(browser: Browser, who: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = uniqueEmail(who);
  await signUp(page, { name: `Cuenta ${who}`, email, code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  return { context, page, email };
}

test("la dueña crea su evento, su enlace, un comentario y un comprobante", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signUp(page, { name: "Dueña Permisos", email: owner.email, code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  await createEvent(page, "Boda privada");
  owner.eventId = new URL(page.url()).pathname.split("/").pop()!;
  const layout = await db.query<{ id: string }>("select id from layout where event_id = $1 limit 1", [owner.eventId]);
  owner.layoutId = layout.rows[0].id;
  const share = await page.request.post(`/api/events/${owner.eventId}/share`, { data: {} });
  expect(share.ok()).toBe(true);
  owner.token = ((await share.json()) as { path: string }).path.split("/v/")[1].split("?")[0];
  // Un cliente deja un comentario desde el enlace, sin cuenta.
  const anon = await browser.newContext();
  const c = await anon.request.post(`/api/v/${owner.token}/comments`, { data: { layoutId: owner.layoutId, authorName: "Cliente", body: "¿Movemos la pista?" } });
  expect(c.ok()).toBe(true);
  await anon.close();
  owner.commentId = (await db.query<{ id: string }>("select id from comment where author_name = 'Cliente' order by created_at desc limit 1")).rows[0].id;
  // Un comprobante de pago y un archivo de un lugar (para probar las rutas de la administración).
  const org = await db.query<{ id: string }>(`select m.org_id as id from membership m join "user" u on u.id = m.user_id where u.email = $1`, [owner.email]);
  owner.paymentId = (
    await db.query<{ id: string }>(
      "insert into payment (id, org_id, plan, period, amount, receipt_name, receipt_type, receipt) values (gen_random_uuid()::text, $1, 'eventos', 'mes', 790, 'c.png', 'image/png', '\\x89504e47') returning id",
      [org.rows[0].id],
    )
  ).rows[0].id;
  owner.fileId = (await db.query<{ id: string }>("select id from venue_file limit 1")).rows[0]?.id ?? "00000000-0000-0000-0000-000000000000";
  await context.close();
});

test("otra cuenta no puede ver ni cambiar el evento, sus distribuciones ni sus comentarios", async ({ browser }) => {
  const other = await newAccount(browser, "intrusa");
  const req = other.page.request;
  const doc = { v: 1, levels: { salon: { furniture: [] } } };
  const checks: [string, Promise<{ status(): number }>][] = [
    ["abrir el diseñador ajeno", req.get(`/eventos/${owner.eventId}`, { maxRedirects: 0 })],
    ["guardar la distribución ajena", req.put(`/api/layouts/${owner.layoutId}`, { data: { doc, revision: 1 } })],
    ["renombrar la distribución ajena", req.patch(`/api/layouts/${owner.layoutId}`, { data: { name: "X" } })],
    ["borrar la distribución ajena", req.delete(`/api/layouts/${owner.layoutId}`)],
    ["cambiar el evento ajeno", req.patch(`/api/events/${owner.eventId}`, { data: { title: "Hackeado" } })],
    ["crear distribución en el evento ajeno", req.post(`/api/events/${owner.eventId}/layouts`, { data: { name: "Z", note: "", doc } })],
    ["crear enlace del evento ajeno", req.post(`/api/events/${owner.eventId}/share`, { data: {} })],
    ["marcar el comentario ajeno", req.patch(`/api/comments/${owner.commentId}`, { data: { resolved: true } })],
  ];
  for (const [what, call] of checks) {
    const status = (await call).status();
    expect([307, 308, 400, 401, 403, 404], `${what}: respondió ${status}`).toContain(status);
  }
  // Y nada cambió en la base.
  const layout = await db.query<{ revision: number; name: string }>("select revision, name from layout where id = $1", [owner.layoutId]);
  expect(layout.rows[0].revision).toBe(1);
  const event = await db.query<{ title: string }>("select title from event where id = $1", [owner.eventId]);
  expect(event.rows[0].title).toBe("Boda privada");
  const comment = await db.query<{ resolved: boolean }>("select resolved from comment where id = $1", [owner.commentId]);
  expect(comment.rows[0].resolved).toBe(false);
  await other.context.close();
});

test("sin cuenta, las rutas privadas piden entrar y la administración no se abre", async ({ playwright }) => {
  const anon: APIRequestContext = await playwright.request.newContext({ baseURL: `http://localhost:${E2E.port}` });
  for (const [path, method] of [
    [`/api/layouts/${owner.layoutId}`, "put"],
    [`/api/events/${owner.eventId}`, "patch"],
    [`/api/comments/${owner.commentId}`, "patch"],
    [`/admin/comprobantes/${owner.paymentId}`, "get"],
    [`/admin/archivos/${owner.fileId}`, "get"],
  ] as const) {
    const status = (await anon[method](path, { data: {}, maxRedirects: 0 })).status();
    expect([401, 403, 404], `${method.toUpperCase()} ${path}: respondió ${status}`).toContain(status);
  }
  // Con Cache Components la página llega con 200 y la redirección viaja dentro del contenido: lo que importa es que no
  // traiga ningún dato de la administración y que mande a entrar.
  const admin = await anon.get("/admin/pagos", { maxRedirects: 0 });
  const html = await admin.text();
  expect(html).toMatch(/\/entrar\?next=%2Fadmin/);
  expect(html).not.toContain("Dueña Permisos");
  expect(html).not.toContain("Por revisar");
  await anon.dispose();
});

test("una cuenta normal no entra a la administración ni a sus archivos", async ({ browser }) => {
  const other = await newAccount(browser, "curiosa");
  const req = other.page.request;
  expect((await req.get(`/admin/comprobantes/${owner.paymentId}`)).status()).toBe(403);
  expect((await req.get(`/admin/archivos/${owner.fileId}`)).status()).toBe(403);
  await other.page.goto("/admin/pagos");
  await expect(other.page).toHaveURL(/\/eventos/);
  await other.context.close();
});

test("un diseño con código escondido no se guarda (XSS)", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, owner.email);
  const evil = { v: 1, levels: { salon: { furniture: [{ id: `a"><img src=x onerror=alert(1)>`, type: "rtable", name: "Mesa", cx: 0, cy: 0, w: 2900, d: 2900, rot: 0, color: "#f4efe6" }] } } };
  const res = await page.request.put(`/api/layouts/${owner.layoutId}`, { data: { doc: evil, revision: 1 } });
  expect(res.status()).toBe(400);
  await context.close();
});
