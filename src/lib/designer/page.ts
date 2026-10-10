import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withoutVendors, type DesignerPlan, type PropertyDetails } from "./types";

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
  /** Fecha del evento (AAAA-MM-DD) para las hojas y los mensajes a proveedores. */
  date: string | null;
  backHref?: string;
  backLabel?: string;
  activeId: string;
  distributions: { id: string; name: string; note: string; recommended: boolean; revision: number; doc: unknown }[];
  /** Marca del negocio que hizo el diseño (portada del enlace del cliente y vista previa). */
  brand: Brand;
  /** Comentarios del cliente (en el enlace del cliente solo se muestran sus textos, sin borrar). */
  comments: HostComment[];
  /** Casas: ficha de la propiedad. */
  details: PropertyDetails | null;
};

export type HostComment = {
  id: string;
  layoutId: string;
  objectId: string | null;
  authorName: string;
  body: string;
  resolved: boolean;
  createdAt: Date | string;
};

export type Brand = { name: string; logo: string | null; color: string | null; whatsapp: string | null };

export const brandOf = (org: { name: string; logoUrl: string | null; brandColor: string | null; whatsapp: string | null } | null): Brand => ({
  name: org?.name ?? "",
  logo: org?.logoUrl ?? null,
  color: org?.brandColor ?? null,
  whatsapp: org?.whatsapp ?? null,
});

/** Origen público del sitio (para URLs absolutas en la vista previa de WhatsApp). */
export const publicOrigin = (request: Request) => process.env.BETTER_AUTH_URL?.replace(/\/$/, "") || new URL(request.url).origin;

type LayoutRow = { id: string; name: string; note: string; recommended: boolean; revision: number; doc: unknown };

/** Datos del anfitrión para un evento: abre la distribución pedida, la recomendada o la primera. */
export function hostFor(
  mode: HostData["mode"],
  ev: { id: string; title: string; guestCount: number | null; eventDate?: string | null; details?: PropertyDetails | null },
  layouts: LayoutRow[],
  wanted: string | null,
  brand: Brand,
  comments: HostComment[],
  back?: { href: string; label: string },
): HostData {
  const active = layouts.find((l) => l.id === wanted) ?? layouts.find((l) => l.recommended) ?? layouts[0];
  return {
    mode,
    eventId: ev.id,
    title: ev.title,
    guests: ev.guestCount,
    date: ev.eventDate ?? null,
    backHref: back?.href,
    backLabel: back?.label,
    activeId: active.id,
    brand,
    comments,
    details: ev.details ?? null,
    distributions: layouts.map(({ id, name, note, recommended, revision, doc }) => ({
      id, name, note, recommended, revision, doc: mode === "view" ? withoutVendors(doc) : doc,
    })),
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
const inline = (code: string) => `<script>\n${code}\n</script>\n`;

export async function designerResponse(
  plan: DesignerPlan,
  host?: HostData,
  meta?: { image?: string; description?: string; url?: string; siteName?: string },
) {
  const html = await file("disenador.html");
  let head = inline(`window.__CASA__ = ${json(plan)};`);
  if (plan.kind === "salon") {
    head += inline(`window.__EVENTOS__ = ${await file("eventos/catalogo.json")};`);
    head += inline(await file("eventos/modelos.js"));
    head += inline(await file("eventos/proveedores.js"));
    head += inline(await file("eventos/eventos.js"));
  }
  if (host) head += inline(`window.__HOST_DATA__ = ${json(host)};\n${await file("host.js")}`);
  // Título y vista previa del enlace (WhatsApp, iMessage).
  const title = escapeHtml(plan.title);
  const description = escapeHtml(
    meta?.description ?? (plan.kind === "salon" ? "Plano 2D y recorrido 3D del evento" : "Plano 2D y recorrido 3D de la casa"),
  );
  const tag = (property: string, content: string) => `\n<meta property="${property}" content="${escapeHtml(content)}">`;
  const image = meta?.image
    ? tag("og:image", meta.image) + tag("og:image:type", "image/jpeg") + tag("og:image:width", "1200") +
      tag("og:image:height", "630") + tag("og:image:alt", plan.title) + `\n<meta name="twitter:card" content="summary_large_image">`
    : "";
  const extra = tag("og:type", "website") + tag("og:locale", "es_MX") +
    (meta?.url ? tag("og:url", meta.url) : "") + (meta?.siteName ? tag("og:site_name", meta.siteName) : "");
  const page = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${title}</title>\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${description}">${extra}${image}`,
  );
  // Los datos van antes del primer <script> porque el diseñador los lee al cargar.
  const at = page.indexOf("<script");
  return new Response(page.slice(0, at) + head + page.slice(at), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
