import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { E2E } from "../playwright.config";
import { createEvent, deviceBackup, rotateFurniture, rotationOf, signUp, uniqueEmail } from "./helpers";

// El plan se vence con el diseñador abierto: el cambio no se guarda, se avisa, queda en el dispositivo y se recupera al
// renovar.

const db = new Pool({ connectionString: E2E.databaseUrl, max: 2 });
test.afterAll(() => db.end());

const setPlanEnd = (email: string, interval: string) =>
  db.query(
    `update organization set plan_ends_at = now() + $2::interval
       where id = (select m.org_id from membership m join "user" u on u.id = m.user_id where u.email = $1)`,
    [email, interval],
  );

test("el plan se vence con el evento abierto: el cambio no se pierde y se recupera al renovar", async ({ page }) => {
  const email = uniqueEmail("vence");
  await signUp(page, { name: `Planner Vence ${Date.now().toString(36)}`, email, code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  await createEvent(page, "Boda E2E plan vencido");

  await setPlanEnd(email, "-1 minute");
  const change = await rotateFurniture(page, 0);
  expect(change.response.status()).toBe(403);
  await expect(page.getByText(/Tu plan de Plantea terminó, por eso este cambio no se guardó/)).toBeVisible();
  await deviceBackup(page);
  const wanted = await rotationOf(page, change.id);

  // Renueva (aquí, a mano en la base) y vuelve a abrir el evento: se ofrece recuperar el cambio y se guarda.
  await setPlanEnd(email, "30 days");
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/no se guardaron .*¿Los recuperas\?/)).toBeVisible();
  // Al recuperar, el diseñador guarda y recarga la página con la versión guardada.
  const saved = page.waitForResponse((r) => r.request().method() === "PUT" && /\/api\/layouts\//.test(r.url()));
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Recuperar" }).click();
  expect((await saved).status()).toBe(200);
  await reloaded;
  await page.waitForLoadState("networkidle");
  expect(await rotationOf(page, change.id)).toBe(wanted);
});
