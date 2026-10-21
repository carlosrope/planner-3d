import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../playwright.config";
import { PASSWORD, field, open, signUp, uniqueEmail } from "./helpers";

// Códigos de mes gratis: la administración los genera en /admin/codigos; un salón entra con uno y su mes empieza al
// publicarse su salón; una cuenta sin plan lo canjea en Mi negocio; uno desactivado ya no sirve.
test.describe.configure({ mode: "serial" });

const salon = { name: `Salón Fundador E2E ${Date.now().toString(36)}`, email: uniqueEmail("salon") };
const codes: { venue?: string; planner?: string; off?: string } = {};

/** Sesión de la administración (la crea si esta corrida todavía no la tiene). */
async function adminPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await open(page, "/entrar");
  await field(page, "email").fill(E2E.adminEmail);
  await field(page, "password").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).locator("visible=true").click();
  try {
    await expect(page).toHaveURL(/\/admin$/, { timeout: 8_000 });
  } catch {
    await signUp(page, { name: "Admin E2E", email: E2E.adminEmail, code: E2E.code });
    await expect(page).toHaveURL(/\/admin$/);
  }
  return page;
}

async function generate(admin: Page, kind: "venue" | "planner", count: number, note: string) {
  await open(admin, "/admin/codigos");
  await admin.locator('input[name="count"]').fill(String(count));
  await admin.locator('select[name="kind"]').selectOption(kind);
  await admin.locator('input[name="note"]').fill(note);
  await admin.getByRole("button", { name: "Generar" }).click();
  await expect(admin).toHaveURL(/nuevos=/);
  const items = admin.locator("li", { hasText: note });
  await expect(items).toHaveCount(count);
  return items.locator("p.font-mono").allTextContents();
}

test("la administración genera, manda y desactiva códigos", async ({ browser }) => {
  const admin = await adminPage(browser);
  [codes.venue] = await generate(admin, "venue", 1, "Salón fundador E2E");
  expect(codes.venue).toMatch(/^MES-[A-Z0-9]{6}$/);
  [codes.planner, codes.off] = await generate(admin, "planner", 2, "Recomendó un salón E2E");
  await expect(admin.getByText("Listos 2 códigos nuevos")).toBeVisible();

  // Cada código sin usar trae WhatsApp con el mensaje y el enlace de registro.
  const row = admin.locator("li", { hasText: codes.venue! });
  await expect(row).toContainText("Sin usar");
  await expect(row.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveAttribute("href", new RegExp(`registro%3Fcodigo%3D${codes.venue}`));

  // Desactivar uno.
  const off = admin.locator("li", { hasText: codes.off! });
  await off.getByRole("button", { name: "Desactivar" }).click();
  await expect(off).toContainText("Desactivado");
  await expect(off.getByRole("button", { name: "Reactivar" })).toBeVisible();
  await admin.context().close();
});

test("un salón entra con su código y su mes empieza cuando se publica su salón", async ({ page, browser }) => {
  // El enlace del mensaje llena el código solo y dice qué incluye.
  await open(page, `/registro?codigo=${codes.venue}`);
  await expect(page.getByText(/Código de Plantea: un mes sin costo para tu salón/)).toBeVisible();
  await field(page, "name").fill(salon.name);
  await field(page, "email").fill(salon.email);
  await field(page, "password").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).locator("visible=true").click();
  await expect(page).toHaveURL(/\/eventos/);
  await expect(page.getByText(new RegExp(`${salon.name} · Prueba · hasta el`))).toBeVisible();
  await page.goto("/negocio");
  await expect(page.getByText("5 códigos para tus clientes al mes")).toBeVisible();

  const admin = await adminPage(browser);
  await admin.goto("/admin/codigos");
  const row = admin.locator("li", { hasText: codes.venue! });
  await expect(row).toContainText("Usado");
  await expect(row).toContainText(salon.email);
  await expect(row).toContainText("Su mes empieza el día que su salón quede publicado");

  // La administración le asigna su salón (ya publicado): su mes empieza hoy.
  await admin.goto("/admin/lugares");
  await admin.getByRole("link", { name: "Salón Demostración" }).first().click();
  await admin.locator('select[name="ownerOrgId"]').selectOption({ label: `${salon.name} · Salón de eventos` });
  await admin.getByRole("button", { name: "Guardar estado" }).click();
  await expect(admin.getByRole("button", { name: "Guardado ✓" })).toBeVisible();
  await admin.goto("/admin/codigos");
  await expect(admin.locator("li", { hasText: codes.venue! })).toContainText(/Su mes: del .+ al .+\./);
  await admin.goto("/admin/rastro");
  await expect(admin.locator("li", { hasText: salon.name }).filter({ hasText: "Empezó su mes gratis" })).toHaveCount(1);

  // Se regresa el salón de demostración como estaba.
  await admin.goto("/admin/lugares");
  await admin.getByRole("link", { name: "Salón Demostración" }).first().click();
  await admin.locator('select[name="ownerOrgId"]').selectOption("");
  await admin.getByRole("button", { name: "Guardar estado" }).click();
  await expect(admin.getByRole("button", { name: "Guardado ✓" })).toBeVisible();
  await admin.context().close();
});

test("una cuenta sin plan canjea su código en Mi negocio; uno desactivado no sirve", async ({ page }) => {
  const person = { name: `Recomendó E2E ${Date.now().toString(36)}`, email: uniqueEmail("recomendo") };
  await signUp(page, { ...person, code: "" });
  await expect(page).toHaveURL(/\/eventos/);
  await page.goto("/negocio");
  await page.waitForLoadState("networkidle");
  await page.getByText("¿Tienes un código de mes gratis?").click();

  await page.locator('input[name="code"]').fill(codes.off!);
  await page.getByRole("button", { name: "Usar código" }).click();
  await expect(page.getByText("Ese código ya se usó o no es válido.")).toBeVisible();

  await page.locator('input[name="code"]').fill(codes.planner!.replace("-", "").toLowerCase());
  await page.getByRole("button", { name: "Usar código" }).click();
  await expect(page.getByText(/¡Listo! Tu mes gratis ya empezó/)).toBeVisible();
  await page.goto("/eventos");
  await expect(page.getByText(new RegExp(`${person.name} · Prueba · hasta el`))).toBeVisible();
});
