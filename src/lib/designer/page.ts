import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DesignerPlan } from "./types";

// Arma la página del diseñador (src/designer/disenador.html, adaptación de
// wy51ai/floorplan-3d, MIT © 2026 wuyi) con los datos del lugar y, si aplica,
// el catálogo de eventos y el anfitrión que guarda en el servidor.

const DIR = path.join(process.cwd(), "src/designer");

/** Planos de demostración que se abren sin cuenta en /disenador/[lugar]. */
export const DEMO_PLANS: Record<string, string> = {
  chardonnay: "casas/chardonnay.json",
  "salon-demo": "salones/salon-demo.json",
};

const cache = new Map<string, string>();
async function file(rel: string) {
  // En desarrollo se relee para ver los cambios de adapt.py sin reiniciar.
  if (process.env.NODE_ENV === "production" && cache.has(rel)) return cache.get(rel)!;
  const text = await readFile(path.join(DIR, rel), "utf8");
  cache.set(rel, text);
  return text;
}

export async function demoPlan(slug: string): Promise<DesignerPlan | null> {
  const rel = DEMO_PLANS[slug];
  return rel ? (JSON.parse(await file(rel)) as DesignerPlan) : null;
}

/** Lo que necesita src/designer/host.js para guardar y compartir. */
export type HostData = {
  mode: "edit" | "view";
  eventId: string;
  title: string;
  guests: number | null;
  backHref?: string;
  activeId: string;
  distributions: { id: string; name: string; note: string; recommended: boolean; revision: number; doc: unknown }[];
};

type LayoutRow = { id: string; name: string; note: string; recommended: boolean; revision: number; doc: unknown };

/** Datos del anfitrión para un evento: abre la distribución pedida, la recomendada o la primera. */
export function hostFor(
  mode: HostData["mode"],
  ev: { id: string; title: string; guestCount: number | null },
  layouts: LayoutRow[],
  wanted: string | null,
  backHref?: string,
): HostData {
  const active = layouts.find((l) => l.id === wanted) ?? layouts.find((l) => l.recommended) ?? layouts[0];
  return {
    mode,
    eventId: ev.id,
    title: ev.title,
    guests: ev.guestCount,
    backHref,
    activeId: active.id,
    distributions: layouts.map(({ id, name, note, recommended, revision, doc }) => ({ id, name, note, recommended, revision, doc })),
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
const inline = (code: string) => `<script>\n${code}\n</script>\n`;

export async function designerResponse(plan: DesignerPlan, host?: HostData) {
  const html = await file("disenador.html");
  let head = inline(`window.__CASA__ = ${json(plan)};`);
  if (plan.kind === "salon") {
    head += inline(`window.__EVENTOS__ = ${await file("eventos/catalogo.json")};`);
    head += inline(await file("eventos/modelos.js"));
    head += inline(await file("eventos/eventos.js"));
  }
  if (host) head += inline(`window.__HOST_DATA__ = ${json(host)};\n${await file("host.js")}`);
  // Título y vista previa del enlace (WhatsApp, iMessage).
  const title = escapeHtml(plan.title);
  const description = escapeHtml(plan.kind === "salon" ? "Plano 2D y recorrido 3D del evento" : "Plano 2D y recorrido 3D de la casa");
  const page = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${title}</title>\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${description}">`,
  );
  // Los datos van antes del primer <script> porque el diseñador los lee al cargar.
  const at = page.indexOf("<script");
  return new Response(page.slice(0, at) + head + page.slice(at), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
