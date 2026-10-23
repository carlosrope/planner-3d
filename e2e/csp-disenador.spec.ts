import { expect, test, type Page } from "@playwright/test";

// El diseñador manda su propia CSP con un nonce nuevo en cada respuesta (src/lib/designer/page.ts): solo corren los
// <script> que puso Plantea. Aquí se comprueba que todo lo suyo lleva el nonce, que la CSP no trae 'unsafe-inline' en
// scripts y que el diseñador funciona sin un solo bloqueo, incluidos los botones que antes eran onclick="…".

const violations = (page: Page) => page.evaluate("window.__csp") as Promise<string[]>;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI || "inline"}`),
    );
  });
});

for (const url of ["/disenador/salon-demo", "/lugares/salon-demostracion/3d"]) {
  test(`${url}: CSP con nonce, sin unsafe-inline y sin bloqueos`, async ({ page }) => {
    const response = await page.goto(url);
    const csp = response!.headers()["content-security-policy"];
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain(url.endsWith("/3d") ? "frame-ancestors *" : "frame-ancestors 'self'");

    const html = await response!.text();
    const tags = html.match(/<script[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(5);
    for (const tag of tags) expect(tag).toContain(`nonce="${nonce}"`);

    await page.waitForFunction(() => typeof (window as unknown as { select?: unknown }).select === "function");
    await expect(page.locator("svg [data-fid]").first()).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
}

test("los botones que antes eran onclick siguen funcionando con la CSP", async ({ page }) => {
  await page.goto("/disenador/salon-demo");
  await page.waitForFunction(() => typeof (window as unknown as { select?: unknown }).select === "function");

  // Mesa → «Abrir lista de invitados»
  await page.evaluate("select({kind: 'furn', id: state.furniture.find(f => f.type === 'rtable').id})");
  await page.locator("#panel [data-open-panel]").click();
  expect(await page.evaluate("JSON.stringify(ui.sel)")).toBe(JSON.stringify({ kind: "ext", panel: "guests" }));

  // Pieza con proveedor → la fila del proveedor lo selecciona
  // state y select son globales del diseñador declarados con let/function: se usan desde una expresión, no desde window.
  await page.evaluate(`(() => {
    const piece = state.furniture.find((f) => !["rtable", "itable", "headtable", "schooltable", "chairrow", "vendor"].includes(f.type));
    state.furniture.push({ id: "prov-e2e", type: "vendor", name: "Florería de prueba", color: "#b5653a", items: [piece.id] });
    select({ kind: "furn", id: piece.id });
  })()`);
  await page.locator("#panel [data-sel-furn]").first().click();
  expect(await page.evaluate("ui.sel?.id")).toBe("prov-e2e");
  expect(await violations(page)).toEqual([]);
});
