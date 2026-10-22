// Recorrido de botones en un iPhone 13 (WebKit, como Safari). Solo corre con RECORRIDO=1: npm run test:recorrido.
import { devices, expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { createEvent, signUp, uniqueEmail } from "../helpers";
import { at, dismissOverlays, pressAll, watch } from "./lib";

test.use({ actionTimeout: 10_000, navigationTimeout: 45_000 });

test.use({ ...devices["iPhone 13"] });
test.skip(!process.env.RECORRIDO, "Solo con RECORRIDO=1 (npm run test:recorrido)");
test.describe.configure({ mode: "serial" });
test.setTimeout(30 * 60_000);

test("celular: visitante", async ({ page }) => {
  watch(page);
  for (const path of ["/", "/salones", "/lugares/salon-demostracion", "/para-salones", "/planes", "/alta", "/registro"]) {
    await pressAll(page, path, { name: `${path} (iPhone)` });
  }
  await pressAll(page, "/disenador/salon-demo", { name: "/disenador/salon-demo (iPhone)", skip: /pantalla completa|grabar|video de la visita/i, prepare: () => dismissOverlays(page) });
});

test("celular: planner", async ({ page }) => {
  watch(page);
  at("(registro en iPhone)");
  await signUp(page, { name: "Planner Celular", email: uniqueEmail("botones-cel"), code: E2E.code });
  await expect(page).toHaveURL(/\/eventos/);
  await createEvent(page, "Boda Celular");
  const path = new URL(page.url()).pathname;
  await pressAll(page, path, { name: "/eventos/[id] (diseñador, iPhone)", skip: /pantalla completa|grabar|video de la visita/i, prepare: () => dismissOverlays(page) });
  await pressAll(page, "/eventos", { name: "/eventos (iPhone)" });
  await pressAll(page, "/negocio", { name: "/negocio (iPhone)" });
});
