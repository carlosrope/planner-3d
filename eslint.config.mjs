import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",,
    ".venv-cad/**",
    // Pruebas de punta a punta: servidor propio y resultados de Playwright.
    ".next-e2e/**",
    ".next-build/**",
    "test-results/**",
    "playwright-report/**",
    // three.js tal como viene en su paquete de npm (public/vendor/three-0.160.0): no es código nuestro.
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
