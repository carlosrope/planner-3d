import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { E2E } from "../playwright.config";
import { PASSWORD, field, open, signUp, uniqueEmail } from "./helpers";

// Autenticación: la cookie de sesión no la puede leer JavaScript, recuperar la contraseña usa un enlace de un solo uso
// que cierra las demás sesiones, y «?next=» después de entrar nunca manda a otro sitio.
test.describe.configure({ mode: "serial" });

const db = new Pool({ connectionString: E2E.databaseUrl, max: 2 });
test.afterAll(() => db.end());
const email = uniqueEmail("cuenta");
const NEW_PASSWORD = "e2e-contrasena-nueva-2";

test("la cookie de sesión es HttpOnly y SameSite=Lax", async ({ page }) => {
  await signUp(page, { name: "Cuenta Segura", email, code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  const session = (await page.context().cookies()).find((c) => /session_token/.test(c.name));
  expect(session, "hay cookie de sesión").toBeTruthy();
  expect(session!.httpOnly).toBe(true);
  expect(session!.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toMatch(/session_token/);
});

test("recuperar la contraseña: enlace de un solo uso que cierra las demás sesiones", async ({ browser, playwright }) => {
  // Una sesión abierta en otro dispositivo.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await open(otherPage, "/entrar");
  await field(otherPage, "email").fill(email);
  await field(otherPage, "password").fill(PASSWORD);
  await otherPage.getByRole("button", { name: "Entrar", exact: true }).locator("visible=true").click();
  await expect(otherPage).toHaveURL(/\/eventos/);

  const api = await playwright.request.newContext({ baseURL: `http://localhost:${E2E.port}` });
  // La respuesta es la misma exista o no la cuenta (no revela correos).
  const asked = await api.post("/api/auth/request-password-reset", { data: { email, redirectTo: "/restablecer" } });
  const unknown = await api.post("/api/auth/request-password-reset", { data: { email: uniqueEmail("nadie"), redirectTo: "/restablecer" } });
  expect(asked.status()).toBe(200);
  expect(unknown.status()).toBe(200);
  expect(await unknown.json()).toEqual(await asked.json());

  // El enlace llega por correo; aquí se toma de la base de prueba.
  const row = await db.query<{ identifier: string }>(
    `select v.identifier from verification v join "user" u on u.id = v.value where u.email = $1 and v.identifier like 'reset-password:%' order by v.created_at desc limit 1`,
    [email],
  );
  const token = row.rows[0].identifier.slice("reset-password:".length);
  const reset = await api.post("/api/auth/reset-password", { data: { token, newPassword: NEW_PASSWORD } });
  expect(reset.status()).toBe(200);
  // El mismo enlace ya no sirve otra vez.
  expect((await api.post("/api/auth/reset-password", { data: { token, newPassword: "otra-contrasena-3" } })).status()).toBeGreaterThanOrEqual(400);

  // La sesión del otro dispositivo quedó cerrada.
  await otherPage.goto("/negocio");
  await expect(otherPage).toHaveURL(/\/entrar/);

  // La contraseña vieja ya no entra; la nueva sí.
  const oldTry = await api.post("/api/auth/sign-in/email", { data: { email, password: PASSWORD } });
  expect(oldTry.status()).toBe(401);
  const newTry = await api.post("/api/auth/sign-in/email", { data: { email, password: NEW_PASSWORD } });
  expect(newTry.status()).toBe(200);
  await api.dispose();
  await other.close();
});

test("después de entrar, ?next= solo regresa a páginas de Plantea", async ({ page }) => {
  for (const bad of ["/%5Cevil.example", "//evil.example", "https://evil.example"]) {
    await page.context().clearCookies();
    await open(page, `/entrar?next=${bad}`);
    await field(page, "email").fill(email);
    await field(page, "password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Entrar", exact: true }).locator("visible=true").click();
    await expect(page).toHaveURL(new RegExp(`^http://localhost:${E2E.port}/eventos`));
  }
});
