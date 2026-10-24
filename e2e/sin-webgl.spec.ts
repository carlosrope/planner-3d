import { expect, test } from "@playwright/test";

// Navegadores sin WebGL (aceleración por hardware apagada, sin tarjeta gráfica o con WebGL bloqueado): el 3D no puede
// abrirse. Antes three.js tronaba, el diseñador se quedaba «ocupado» y el error llegaba a Sentry («Error creating WebGL
// context», 24 oct 2026). Ahora se queda en el plano 2D con un aviso; incrustado en la portada, se queda la foto.

test.use({ launchOptions: { args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] } });

test("sin WebGL, el diseñador se queda en 2D, avisa y no truena", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/disenador/salon-demo?vista=3d");
  await expect(page.locator(".pl-dlg")).toContainText("no puede mostrar el 3D");
  expect(await page.evaluate(() => document.body.classList.contains("busy"))).toBe(false);
  expect(await page.evaluate(() => document.body.classList.contains("m3d"))).toBe(false);
  expect(errors).toEqual([]);
});

test("sin WebGL, el 3D de la portada se queda en la foto, sin aviso ni errores", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/disenador/salon-demo?embed=1&vista=3d");
  await page.waitForTimeout(3000);
  await expect(page.locator(".pl-dlg")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.classList.contains("busy"))).toBe(false);
  expect(errors).toEqual([]);
});
