import { expect, test } from "@playwright/test";
import { E2E } from "../playwright.config";
import { createEvent, deviceBackup, rotateFurniture, rotationOf, signUp, skipGuide, uniqueEmail } from "./helpers";

// Dos pestañas (o dos personas) con el mismo evento abierto: lo que guardó una no se pierde cuando la otra guarda
// encima. El servidor rechaza el segundo guardado (409), el diseñador lo avisa y lo no guardado queda en el dispositivo.

test("dos pestañas con el mismo evento: el segundo guardado se rechaza y no pisa al primero", async ({ page, context }) => {
  await signUp(page, { name: `Planner Pestañas ${Date.now().toString(36)}`, email: uniqueEmail("pestanas"), code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  await createEvent(page, "Boda E2E dos pestañas");

  // La segunda pestaña abre el mismo evento y guarda primero.
  const other = await context.newPage();
  await other.goto(page.url());
  await other.waitForLoadState("networkidle");
  await skipGuide(other);
  const first = await rotateFurniture(other, 0);
  expect(first.response.status()).toBe(200);
  const rotated = await rotationOf(other, first.id);

  // La primera pestaña todavía tiene la versión anterior: su guardado se rechaza y lo avisa.
  const second = await rotateFurniture(page, 1);
  expect(second.response.status()).toBe(409);
  await expect(page.getByText("Otra persona guardó cambios en esta distribución.")).toBeVisible();

  // Al recargar, lo de la otra pestaña sigue ahí y lo que no se guardó se ofrece desde el dispositivo.
  await deviceBackup(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/no se guardaron .*Ojo: alguien guardó después/)).toBeVisible();
  await page.getByRole("button", { name: "Descartar" }).click();
  expect(await rotationOf(page, first.id)).toBe(rotated);

  // Dos guardados con la misma revisión al mismo tiempo: solo uno entra.
  const body = first.response.request().postDataJSON() as { doc: unknown };
  const { revision } = (await first.response.json()) as { revision: number };
  const url = first.response.url();
  const statuses = await Promise.all([1, 2].map(() => context.request.put(url, { data: { doc: body.doc, revision } }).then((r) => r.status())));
  expect(statuses.sort()).toEqual([200, 409]);
});
