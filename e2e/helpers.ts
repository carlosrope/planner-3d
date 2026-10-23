import { expect, type Page } from "@playwright/test";

/** Abre una página y espera a que termine de cargar (el formulario de espera de <Suspense> ya se reemplazó). */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // Espera a que React tome el formulario (hidratación): antes de eso, escribir o hacer clic no hace nada.
  await page.waitForFunction(
    () => {
      const form = [...document.querySelectorAll("form")].find((f) => f.offsetParent !== null);
      return Boolean(form && Object.keys(form).some((k) => k.startsWith("__react")));
    },
    undefined,
    { timeout: 30_000 },
  );
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
  // La primera vez el servidor de pruebas compila la página y el clic puede llegar antes de que el formulario esté
  // listo: si no avanzó, se vuelve a intentar una vez.
  const submit = page.getByRole("button", { name: "Entrar", exact: true }).locator("visible=true");
  await submit.click();
  try {
    await expect(page).toHaveURL(/\/eventos/, { timeout: 8_000 });
  } catch {
    await field(page, "password").fill(PASSWORD);
    await submit.click();
    await expect(page).toHaveURL(/\/eventos/);
  }
}

/** Crea un evento en el Salón Demostración desde Proyectos y espera a que abra el diseñador (sin la guía). */
export async function createEvent(page: Page, title: string) {
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="venueId"]').selectOption({ label: "Salón Demostración · Los Mochis" });
  await page.locator('input[name="guestCount"]').fill("120");
  await page.getByRole("button", { name: "Crear evento con plano inicial" }).click();
  await expect(page).toHaveURL(/\/eventos\/[0-9a-f-]{36}/);
  await page.waitForLoadState("networkidle");
  await skipGuide(page);
}

/**
 * La guía de la primera vez tapa la barra: se cierra si aparece. Abre 600 ms después de cargar el diseñador
 * (`src/designer/guia.js`), así que se le da hasta 3 s en lugar de mirar una sola vez.
 */
export async function skipGuide(page: Page) {
  const skip = page.getByRole("button", { name: "Saltar" });
  await skip.click({ timeout: 3000 }).catch(() => {});
}

/** Gira 90° un mueble desde el diseñador (sus funciones son globales de la página) y espera la respuesta del guardado. */
export async function rotateFurniture(page: Page, index: number) {
  const saved = page.waitForResponse((r) => r.request().method() === "PUT" && /\/api\/layouts\/[^/]+$/.test(r.url()));
  const id = await page.evaluate(`(() => { const f = state.furniture[${index}]; select({ kind: 'furn', id: f.id }); rotateSel(90); return f.id; })()`);
  return { id: String(id), response: await saved };
}

export const rotationOf = (page: Page, id: string) => page.evaluate(`state.furniture.find(f => f.id === ${JSON.stringify(id)}).rot`);

/** Espera a que el diseñador deje la copia de lo no guardado en el dispositivo (se escribe 0.8 s después del cambio). */
export const deviceBackup = (page: Page) => page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith("plantea-respaldo-")));
