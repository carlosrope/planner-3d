import { expect, test } from "@playwright/test";
import { E2E } from "../playwright.config";
import { signIn, signUp, uniqueEmail } from "./helpers";

// Los tres flujos que cobran: registro con código, evento con enlace para el cliente y pago por SPEI.
test.describe.configure({ mode: "serial" });

const planner = { name: `Planner E2E ${Date.now().toString(36)}`, email: uniqueEmail("planner") };

test("registro con código de invitación", async ({ page }) => {
  // Sin código válido no entra.
  await signUp(page, { name: planner.name, email: planner.email, code: "NOEXISTE" });
  await expect(page.getByText("El código de invitación no es válido.")).toBeVisible();

  // Con el código de 14 días queda en plan Prueba, solo con Eventos.
  await signUp(page, { name: planner.name, email: planner.email, code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  await expect(page.getByRole("heading", { name: "Proyectos" })).toBeVisible();
  await expect(page.getByText(new RegExp(`${planner.name} · Prueba · hasta el`))).toBeVisible();
  // Solo tiene el módulo Eventos: no aparece la barra de secciones Eventos / Casas.
  await expect(page.locator("main").getByRole("navigation", { name: "Secciones" })).toHaveCount(0);
});

test("crear un evento y compartir el enlace de solo vista", async ({ page, browser }) => {
  await signIn(page, planner.email);
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="title"]').fill("Boda E2E Ana y Luis");
  await page.locator('select[name="venueId"]').selectOption({ label: "Salón Demostración · Los Mochis" });
  await page.locator('input[name="guestCount"]').fill("120");
  await page.getByRole("button", { name: "Crear evento con plano inicial" }).click();
  await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]{36}/);
  await expect(page).toHaveTitle(/Boda E2E Ana y Luis/);

  // La guía de la primera vez tapa la barra: se cierra si aparece.
  const skip = page.getByRole("button", { name: "Saltar" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.locator('[data-a="share"]').click();
  const linkInput = page.locator("dialog input[readonly], .dlg input[readonly], input[readonly]").last();
  await expect(linkInput).toHaveValue(/\/v\/[a-z0-9]+/);
  const link = await linkInput.inputValue();

  // El cliente lo abre sin cuenta.
  const client = await browser.newContext();
  const view = await client.newPage();
  const res = await view.goto(link);
  expect(res?.status()).toBe(200);
  await expect(view).toHaveTitle(/Boda E2E Ana y Luis/);
  await expect(view.locator('[data-a="share"]')).toHaveCount(0);
  await client.close();
});

test("pago por SPEI con comprobante y confirmación en /admin", async ({ page, browser }) => {
  await signIn(page, planner.email);
  await page.goto("/negocio");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("000000000000000000")).toBeVisible();
  await page.locator('select[name="plan"]').selectOption("eventos");
  await page.locator('select[name="period"]').selectOption("mes");
  await page.locator('input[name="amount"]').fill("790");
  // Comprobante de prueba: un PNG de 1×1.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.locator('input[name="receipt"]').setInputFiles({ name: "comprobante.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Enviar comprobante" }).click();
  await expect(page.getByText("Por revisar").first()).toBeVisible();

  // ProLink lo confirma en /admin/pagos.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signUp(admin, { name: "Admin E2E", email: E2E.adminEmail, code: E2E.code });
  await expect(admin).toHaveURL(/\/eventos/);
  await admin.goto("/admin/pagos");
  const card = admin.locator("li", { hasText: planner.name });
  await expect(card).toContainText("Por revisar");
  await expect(card).toContainText("$790");
  await card.getByPlaceholder(/Nota/).fill("Folio E2E-001");
  await card.getByRole("button", { name: "Confirmar y activar" }).click();
  await expect(card).toContainText("Confirmado");

  // El rastro guarda quién lo confirmó, el monto y la nota.
  await admin.goto("/admin/rastro");
  const entry = admin.locator("li", { hasText: planner.name }).first();
  await expect(entry).toContainText("Confirmó un pago");
  await expect(entry).toContainText(E2E.adminEmail);
  await expect(entry).toContainText("$790");
  await expect(entry).toContainText("Folio E2E-001");

  // Lugares: mandar a la papelera y restaurar también queda en el rastro.
  await admin.goto("/admin");
  await admin.getByRole("link", { name: "Casa Chardonnay" }).click();
  await admin.getByRole("button", { name: "Mandar a la papelera" }).click();
  await expect(admin.getByText("En la papelera")).toBeVisible();
  await admin.getByRole("button", { name: "Restaurar" }).click();
  await expect(admin.getByRole("button", { name: "Mandar a la papelera" })).toBeVisible();
  await admin.goto("/admin/rastro");
  await expect(admin.locator("li", { hasText: "Casa Chardonnay" }).filter({ hasText: "Mandó el lugar a la papelera" })).toHaveCount(1);
  await expect(admin.locator("li", { hasText: "Casa Chardonnay" }).filter({ hasText: "Restauró el lugar" })).toHaveCount(1);
  await adminContext.close();

  // La planner ya ve su plan Eventos, con fecha de fin un mes después.
  await page.goto("/eventos");
  await expect(page.getByText(new RegExp(`${planner.name} · Eventos · hasta el`))).toBeVisible();
});
