import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../playwright.config";
import { PASSWORD, field, open, signUp } from "./helpers";

// Fachada real: la administración la captura en /admin/lugares/[id] (sección «Fachada y entorno del 3D») y llega al
// 3D del lugar dentro de su plano (plan.facade); «Quitar la fachada» la borra.

/** Sesión de la administración (la crea si esta corrida todavía no la tiene). */
async function adminPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await open(page, "/entrar");
  await field(page, "email").fill(E2E.adminEmail);
  await field(page, "password").fill(PASSWORD);
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .locator("visible=true")
    .click();
  try {
    await expect(page).toHaveURL(/\/admin$/, { timeout: 8_000 });
  } catch {
    await signUp(page, {
      name: "Admin E2E",
      email: E2E.adminEmail,
      code: E2E.code,
    });
    await expect(page).toHaveURL(/\/admin$/);
  }
  return page;
}

test("la fachada que captura la administración llega al 3D del salón y se puede quitar", async ({
  browser,
}) => {
  const admin = await adminPage(browser);
  await admin.goto("/admin/lugares"); // sin formulario: open() esperaría uno
  await admin.waitForLoadState("networkidle");
  await admin.getByRole("link", { name: "Salón Demostración" }).first().click();
  await expect(
    admin.getByRole("heading", { name: /Fachada y entorno del 3D/ }),
  ).toBeVisible();

  const form = admin
    .locator("form")
    .filter({ has: admin.getByRole("button", { name: "Guardar fachada" }) });
  await form.locator('input[name="color"][value="#c9805a"]').check();
  await form.locator('select[name="material"]').selectOption("ladrillo");
  await form.locator('select[name="parking"]').selectOption("izquierda");
  await form.locator('input[name="sign"]').fill("Salón Prueba Fachada");
  await form.getByRole("button", { name: "Guardar fachada" }).click();
  await expect(
    admin.getByRole("button", { name: "Quitar la fachada" }),
  ).toBeVisible();
  await admin.reload();
  await expect(form.locator('select[name="material"]')).toHaveValue("ladrillo");
  await form.screenshot({ path: test.info().outputPath("fachada.png") });

  const page3d = async () =>
    (await admin.request.get("/lugares/salon-demostracion/3d")).text();
  const html = await page3d();
  for (const part of [
    '"color":"#c9805a"',
    '"material":"ladrillo"',
    '"parking":"izquierda"',
    '"sign":"Salón Prueba Fachada"',
  ])
    expect(html).toContain(part);

  // Mientras guarda, el botón dice «Guardando…»: se espera a que el 3D ya no traiga la fachada
  await admin.getByRole("button", { name: "Quitar la fachada" }).click();
  await expect
    .poll(page3d, { timeout: 15_000 })
    .not.toContain('"sign":"Salón Prueba Fachada"');
});
