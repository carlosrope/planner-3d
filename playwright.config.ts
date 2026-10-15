import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta de los tres flujos que cobran (e2e/*.spec.ts). Usan su propia base
 * (planner3d_prueba, se borra y se vuelve a crear en cada corrida) y su propio servidor en el puerto 3100,
 * así que no tocan la base local de desarrollo. Uso: npm run test:e2e
 */
const localUrl = (() => {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("Falta DATABASE_URL en .env.local (o E2E_DATABASE_URL).");
  return line.slice("DATABASE_URL=".length).replace(/\/[^/?]+(\?|$)/, "/planner3d_prueba$1");
})();
export const E2E = {
  port: 3100,
  databaseUrl: localUrl,
  adminEmail: "admin-e2e@planner3d.test",
  code: "E2E14",
};
process.env.E2E_DATABASE_URL = localUrl;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${E2E.port}`,
    locale: "es-MX",
    timezoneId: "America/Mazatlan",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npx next dev -p ${E2E.port}`,
    url: `http://localhost:${E2E.port}/entrar`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL: localUrl,
      BETTER_AUTH_URL: `http://localhost:${E2E.port}`,
      BETTER_AUTH_SECRET: "e2e-solo-para-pruebas-no-es-secreto-0000",
      SIGNUP_CODES: JSON.stringify({ [E2E.code]: { kind: "planner", plan: "prueba", modules: ["salones"], days: 14 } }),
      ADMIN_EMAILS: E2E.adminEmail,
      // Datos de pago de EJEMPLO (no son reales).
      SPEI_BANK: "Banco de prueba",
      SPEI_CLABE: "000000000000000000",
      SPEI_HOLDER: "Titular de prueba",
      AUTH_RATE_LIMIT: "0",
      SENTRY_DSN: "",
      RESEND_API_KEY: "",
    },
  },
});
