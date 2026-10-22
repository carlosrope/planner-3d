// Recorrido de botones: presiona cada control de cada página (salvo los que borran, pagan o publican) y anota
// errores de JavaScript, respuestas fallidas, enlaces rotos y controles sin efecto. Las anotaciones se revisan a mano:
// un formulario vacío que el navegador no deja mandar o una opción que ya estaba elegida también salen como «sin efecto».
import { appendFileSync } from "node:fs";
import type { APIRequestContext, Page } from "@playwright/test";

const OUT = process.env.RECORRIDO_OUT ?? "test-results/recorrido-botones.jsonl";
export type Finding = { pagina: string; control: string; tipo: string; detalle: string };

let current = { pagina: "", control: "" };
const seen = new Set<string>();
export function note(tipo: string, detalle: string, control = current.control) {
  const f: Finding = { pagina: current.pagina, control, tipo, detalle: detalle.slice(0, 400) };
  const key = `${f.pagina}|${f.control}|${f.tipo}|${f.detalle}`;
  if (seen.has(key)) return;
  seen.add(key);
  appendFileSync(OUT, JSON.stringify(f) + "\n");
}

const IGNORE_URL = /webpack-hmr|__nextjs|_next\/static|favicon|\/__salud|cloudflareinsights|static\.cloudflareinsights/;

export function watch(page: Page) {
  page.on("console", (m) => {
    if (m.type() === "error") note("consola", m.text());
  });
  page.on("pageerror", (e) => note("error de JavaScript", e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && !IGNORE_URL.test(r.url())) note(`HTTP ${r.status()}`, `${r.request().method()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    if (!IGNORE_URL.test(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText ?? "")) note("petición fallida", `${r.url()} ${r.failure()?.errorText}`);
  });
  page.on("dialog", (d) => {
    note("diálogo nativo", `${d.type()}: ${d.message()}`);
    void d.dismiss().catch(() => {});
  });
}

const DANGER = /(salir|cerrar sesi|eliminar|borrar|vaciar|desactivar|rechazar|papelera|cancelar (mi )?suscrip|cancelar cobro|regenerar|reemplazar|quitar|confirmar pago|descartar|^confirmar$|^publicar|retirar|recuperar|restablecer|olvid|pagar|suscrib)/i;

async function settle(page: Page, ms = 700) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(ms);
}

/** Observador de cambios del DOM para saber si un botón hizo algo. */
async function armObserver(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __mut?: number; __obs?: MutationObserver };
    w.__mut = 0;
    if (!w.__obs) {
      w.__obs = new MutationObserver((list) => {
        w.__mut = (w.__mut ?? 0) + list.length;
      });
      w.__obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    }
  });
}
const mutations = (page: Page) => page.evaluate(() => (window as unknown as { __mut?: number }).__mut ?? 0).catch(() => -1);

type Ctl = { label: string; nth: number };

async function controls(page: Page, scope: string): Promise<Ctl[]> {
  return page.evaluate((scopeSel) => {
    const root = document.querySelector(scopeSel) ?? document.body;
    const els = [...root.querySelectorAll<HTMLElement>("button, [role=button], summary, input[type=submit], select, input[type=checkbox], input[type=radio]")];
    const counts = new Map<string, number>();
    const out: { label: string; nth: number }[] = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (!r.width || !r.height || style.visibility === "hidden" || style.display === "none") continue;
      if ((el as HTMLButtonElement).disabled) continue;
      const label = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || (el as HTMLInputElement).value || el.getAttribute("name") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 60);
      const n = counts.get(label) ?? 0;
      counts.set(label, n + 1);
      out.push({ label, nth: n });
    }
    return out;
  }, scope);
}

async function findByLabel(page: Page, scope: string, c: Ctl) {
  const handle = await page.evaluateHandle(
    ({ scopeSel, label, nth }) => {
      const root = document.querySelector(scopeSel) ?? document.body;
      const els = [...root.querySelectorAll<HTMLElement>("button, [role=button], summary, input[type=submit], select, input[type=checkbox], input[type=radio]")].filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width && r.height && s.visibility !== "hidden" && s.display !== "none" && !(el as HTMLButtonElement).disabled;
      });
      const same = els.filter(
        (el) => (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || (el as HTMLInputElement).value || el.getAttribute("name") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 60) === label,
      );
      return same[nth] ?? null;
    },
    { scopeSel: scope, label: c.label, nth: c.nth },
  );
  return handle.asElement();
}

/** Presiona cada control visible de la página (salvo los destructivos) y anota errores o controles sin efecto. */
export async function pressAll(page: Page, path: string, opts: { scope?: string; skip?: RegExp; name?: string; prepare?: () => Promise<void>; fresh?: boolean } = {}) {
  const scope = opts.scope ?? "body";
  current = { pagina: opts.name ?? path, control: "(cargar la página)" };
  const res = await page.goto(path).catch((e) => (note("no abre", String(e)), null));
  if (res && res.status() >= 400) note(`página ${res.status()}`, path);
  await page.waitForLoadState("networkidle").catch(() => {});
  await opts.prepare?.();
  const list = await controls(page, scope);
  let pressed = 0;
  for (const c of list) {
    if (DANGER.test(c.label) || opts.skip?.test(c.label)) continue;
    current.control = c.label + (c.nth ? ` (#${c.nth + 1})` : "");
    if (opts.fresh !== false) {
      // Cada botón se prueba con la página recién abierta: así un panel o una vista que dejó abierta el anterior no estorba.
      await page.goto(path).catch(() => {});
      await page.waitForLoadState("networkidle").catch(() => {});
      await opts.prepare?.();
    }
    const startUrl = page.url();
    let el = await findByLabel(page, scope, c).catch(() => null);
    if (!el) {
      // Puede que un clic anterior lo haya escondido: se recarga la página y se intenta otra vez.
      await page.goto(path).catch(() => {});
      await page.waitForLoadState("networkidle").catch(() => {});
      await opts.prepare?.();
      el = await findByLabel(page, scope, c).catch(() => null);
      if (!el) continue;
    }
    await armObserver(page).catch(() => {});
    let requests = 0;
    const onReq = () => requests++;
    page.on("request", onReq);
    let dialogs = 0;
    const onDialog = () => dialogs++;
    page.on("dialog", onDialog);
    let others = 0;
    const onOther = () => others++;
    page.on("popup", onOther);
    page.on("download", onOther);
    const tag = await el.evaluate((n) => n.tagName.toLowerCase() + ((n as HTMLInputElement).type ? ":" + (n as HTMLInputElement).type : "")).catch(() => "");
    try {
      if (tag === "select") {
        const values = await el.evaluate((n) => [...(n as HTMLSelectElement).options].map((o) => o.value));
        const now = await el.evaluate((n) => (n as HTMLSelectElement).value);
        const other = values.find((v) => v !== now);
        if (other !== undefined) await el.selectOption(other);
      } else {
        await el.click({ timeout: 4000 });
      }
      pressed++;
    } catch (e) {
      const text = String(e);
      const blocker = text.split("\n").find((l) => /intercepts pointer events|not visible|outside of the viewport|not stable/.test(l));
      note("no se pudo presionar", (blocker ?? text.split("\n")[0]).trim());
    }
    await settle(page);
    page.off("request", onReq);
    page.off("dialog", onDialog);
    page.off("popup", onOther);
    page.off("download", onOther);
    const moved = page.url() !== startUrl;
    const changed = moved ? 1 : await mutations(page);
    if (!moved && changed === 0 && requests === 0 && dialogs === 0 && others === 0) note("sin efecto visible", `${tag} no cambió nada en la página`);
    if (moved) {
      const status = await page.evaluate(() => document.title).catch(() => "");
      if (/404|no encontr|error/i.test(status)) note("lleva a una página de error", `${page.url()} · ${status}`);
      await page.goto(path).catch(() => {});
      await page.waitForLoadState("networkidle").catch(() => {});
      await opts.prepare?.();
    } else {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(150);
    }
  }
  current.control = "(enlaces)";
  return { controls: list.length, pressed };
}

/** Revisa que cada enlace interno de la página responda (sin presionarlos uno por uno). */
export async function checkLinks(page: Page, request: APIRequestContext, path: string, name?: string) {
  current = { pagina: name ?? path, control: "(enlaces)" };
  await page.goto(path).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((a) => a.href))]);
  const origin = new URL(page.url()).origin;
  for (const href of hrefs) {
    if (!href.startsWith(origin)) continue;
    if (/\/(salir|api\/auth\/sign-out)/.test(href)) continue;
    const r = await request.get(href, { maxRedirects: 5 }).catch(() => null);
    if (!r) note("enlace roto", href, href.replace(origin, ""));
    else if (r.status() >= 400) note(`enlace ${r.status()}`, href, href.replace(origin, ""));
  }
  return hrefs.length;
}

export const at = (pagina: string) => {
  current = { pagina, control: "" };
};

/** Cierra lo que tapa el diseñador al abrir: la guía de la primera vez, el aviso de la demo y la portada del enlace. */
export async function dismissOverlays(page: Page) {
  for (const name of ["Saltar", "Cerrar aviso", "Ver plano"]) {
    const b = page.getByRole("button", { name, exact: true }).first();
    if (await b.isVisible().catch(() => false)) await b.click({ timeout: 3000 }).catch(() => {});
  }
}
