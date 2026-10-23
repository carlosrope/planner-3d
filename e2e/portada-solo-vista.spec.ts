import { expect, test, type Page } from "@playwright/test";

// La portada (src/components/Hero3D.tsx) incrusta el diseñador con ?embed=1: ahí solo se mira. Se gira, se acerca y
// se recorre el plano, pero nada se selecciona, mueve, gira ni borra (tools/designer/adapt.py, «viewOnly»). En el
// diseñador en grande sí se edita.

const furniture = (page: Page) => page.evaluate("JSON.stringify(state.furniture)") as Promise<string>;
const selectFirst = (page: Page) => page.evaluate("select({kind: 'furn', id: state.furniture[0].id}), ui.sel?.id ?? null");

test("el salón de la portada solo se mira: no se mueve ni se borra nada", async ({ page }) => {
  await page.goto("/disenador/salon-demo?embed=1&vista=3d");
  await page.waitForFunction(() => document.getElementById("stage")?.classList.contains("is3d"), undefined, { timeout: 30_000 });
  const before = await furniture(page);

  // 3D: tocar el salón no selecciona nada
  const canvas = page.locator("#stage canvas").first();
  const box = (await canvas.boundingBox())!;
  for (const [fx, fy] of [[0.5, 0.5], [0.35, 0.6], [0.65, 0.4]]) await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  expect(await page.evaluate("ui.sel")).toBeNull();
  expect(await selectFirst(page)).toBeNull();

  // 2D: arrastrar un mueble mueve la vista, no el mueble; doble clic no lo gira
  await page.evaluate(() => (document.querySelector('[data-view="2d"]') as HTMLElement).click());
  const piece = page.locator("svg [data-fid]").first();
  await expect(piece).toBeVisible();
  const p = (await piece.boundingBox())!;
  const x0 = await page.evaluate("view.x0");
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.down();
  await page.mouse.move(p.x + p.width / 2 + 120, p.y + p.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate("view.x0")).not.toBe(x0);
  await piece.dblclick({ force: true });

  // Las teclas del diseñador no hacen nada
  for (const key of ["Delete", "r", "ArrowLeft", "Control+d", "Control+z", "x", "m"]) await page.keyboard.press(key);

  expect(await page.evaluate("ui.sel")).toBeNull();
  expect(await furniture(page)).toBe(before);
});

test("en el diseñador en grande sí se seleccionan los muebles", async ({ page }) => {
  await page.goto("/disenador/salon-demo");
  await page.waitForFunction(() => typeof (window as Window & { View3D?: unknown }).View3D !== "undefined", undefined, { timeout: 30_000 });
  expect(await selectFirst(page)).not.toBeNull();
});
