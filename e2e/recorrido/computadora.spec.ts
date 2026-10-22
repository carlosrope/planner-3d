// Recorrido de botones en computadora, con cada tipo de cuenta. Solo corre con RECORRIDO=1 (tarda unos 20 minutos):
// npm run test:recorrido. Lo que encuentra queda en test-results/recorrido-botones.jsonl.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { E2E } from "../../playwright.config";
import { createEvent, signIn, signUp, uniqueEmail, verifyEmailInDb } from "../helpers";
import { at, checkLinks, dismissOverlays, note, pressAll, watch } from "./lib";

test.use({ actionTimeout: 10_000, navigationTimeout: 45_000 });

test.skip(!process.env.RECORRIDO, "Solo con RECORRIDO=1 (npm run test:recorrido)");
test.describe.configure({ mode: "serial" });
test.setTimeout(30 * 60_000);
const db = new Pool({ connectionString: E2E.databaseUrl, max: 2 });
test.afterAll(() => db.end());

const planner = uniqueEmail("botones-planner");
const salon = uniqueEmail("botones-salon");
let eventPath = "";

const PUBLIC = [
  "/",
  "/salones",
  "/salones/los-mochis",
  "/casas",
  "/lugares/salon-demostracion",
  "/lugares/casa-chardonnay",
  "/lugares/salon-demostracion/letrero",
  "/para-salones",
  "/planes",
  "/nosotros",
  "/privacidad",
  "/terminos",
  "/alta",
  "/entrar",
  "/registro",
  "/olvide",
];

test("visitante sin cuenta", async ({ page, request }) => {
  watch(page);
  for (const path of PUBLIC) {
    await pressAll(page, path);
    await checkLinks(page, request, path);
  }
  for (const path of ["/disenador/salon-demo", "/disenador/chardonnay", "/lugares/salon-demostracion/3d"]) {
    await pressAll(page, path, { skip: /pantalla completa|grabar|video de la visita/i, prepare: () => dismissOverlays(page) });
  }
});

test("planner con cuenta", async ({ page, request }) => {
  watch(page);
  at("(registro de la planner)");
  await signUp(page, { name: "Planner Botones", email: planner, code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  await createEvent(page, "Boda Botones");
  eventPath = new URL(page.url()).pathname;
  await pressAll(page, "/eventos");
  await checkLinks(page, request, "/eventos");
  await pressAll(page, eventPath, { name: "/eventos/[id] (diseñador)", skip: /pantalla completa|grabar|video de la visita/i, prepare: () => dismissOverlays(page) });
  await pressAll(page, "/negocio");
  await checkLinks(page, request, "/negocio");
  // Enlace de solo vista.
  at("/v/[token]");
  const share = await page.request.post(`/api/events/${eventPath.split("/").pop()}/share`, { data: { role: "cliente" } });
  if (!share.ok()) note(`HTTP ${share.status()}`, "no se pudo crear el enlace de solo vista");
  else {
    const { path } = (await share.json()) as { path: string };
    await pressAll(page, path, { name: "/v/[token] (enlace del cliente)", skip: /pantalla completa|grabar/i, prepare: () => dismissOverlays(page) });
  }
});

test("dueño de un salón", async ({ page, request }) => {
  watch(page);
  at("(registro del salón)");
  await signUp(page, { name: "Salón Botones", email: salon, code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  await db.query(
    `update organization set kind = 'venue', plan = 'eventos', plan_ends_at = now() + interval '30 days'
       where id = (select m.org_id from membership m join "user" u on u.id = m.user_id where u.email = $1)`,
    [salon],
  );
  await db.query(
    `update venue set owner_org_id = (select m.org_id from membership m join "user" u on u.id = m.user_id where u.email = $1) where name = 'Salón Demostración'`,
    [salon],
  );
  for (const path of ["/eventos", "/lugares", "/lugares/salon-demostracion/panel", "/negocio"]) {
    await pressAll(page, path);
    await checkLinks(page, request, path);
  }
});

test("administración", async ({ page, request }) => {
  watch(page);
  at("(registro de la administración)");
  await signUp(page, { name: "Admin Botones", email: E2E.adminEmail, code: E2E.code }).catch(() => {});
  if (!/\/(eventos|inicio|admin|verificar-correo)/.test(page.url())) await signIn(page, E2E.adminEmail).catch(() => {});
  // La administración solo abre con el correo verificado: primero se ve esa pantalla, luego se verifica.
  await pressAll(page, "/verificar-correo", { skip: /mandarme el enlace/i });
  await verifyEmailInDb(E2E.adminEmail);
  const venue = await db.query<{ id: string }>("select id from venue where name = 'Salón Demostración'");
  const paths = ["/admin", "/admin/lugares", `/admin/lugares/${venue.rows[0].id}`, "/admin/cuentas", "/admin/pagos", "/admin/codigos", "/admin/rastro", "/admin/actividad", "/admin/papelera", "/admin/sugerencias", "/admin/piloto"];
  for (const path of paths) {
    await pressAll(page, path, { name: path.replace(venue.rows[0].id, "[id]") });
    await checkLinks(page, request, path, path.replace(venue.rows[0].id, "[id]"));
  }
});
