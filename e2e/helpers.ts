import { expect, type Page } from "@playwright/test";

/** Abre una página y espera a que termine de cargar (el formulario de espera de <Suspense> ya se reemplazó). */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** Campo visible por su name: mientras llega el contenido de <Suspense> hay dos formularios en la página. */
export const field = (page: Page, name: string) => page.locator(`[name="${name}"]:visible`);

export const PASSWORD = "e2e-contrasena-1";

/** Cuenta nueva por corrida (la base de prueba se vuelve a crear, pero así cada prueba es independiente). */
export const uniqueEmail = (who: string) => `${who}-${Date.now().toString(36)}@planner3d.test`;

export async function signUp(page: Page, { name, email, code }: { name: string; email: string; code: string }) {
  await open(page, "/registro");
  await expect(field(page, "name")).toHaveCount(1);
  await field(page, "name").fill(name);
  await field(page, "email").fill(email);
  await field(page, "password").fill(PASSWORD);
  await field(page, "invite").fill(code);
  await page.getByRole("button", { name: "Crear cuenta" }).locator("visible=true").click();
}

export async function signIn(page: Page, email: string) {
  await open(page, "/entrar");
  await expect(field(page, "email")).toHaveCount(1);
  await field(page, "email").fill(email);
  await field(page, "password").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).locator("visible=true").click();
  await expect(page).toHaveURL(/\/eventos/);
}
