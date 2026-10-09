import { readFile } from "node:fs/promises";
import path from "node:path";

// Diseñador de casas para inmobiliarias: adaptación de wy51ai/floorplan-3d (MIT, © 2026 wuyi).
// El HTML se genera con tools/designer/adapt.py y los datos de cada casa con tools/cad-import/to_designer.py.

const DIR = path.join(process.cwd(), "src/designer");
const CASAS = new Set(["chardonnay"]);

export async function GET(_request: Request, ctx: RouteContext<"/disenador/[casa]">) {
  const { casa } = await ctx.params;
  if (!CASAS.has(casa)) return new Response("Casa no encontrada.", { status: 404 });

  const [html, data] = await Promise.all([
    readFile(path.join(DIR, "disenador.html"), "utf8"),
    readFile(path.join(DIR, "casas", `${casa}.json`), "utf8"),
  ]);
  // Los datos van antes del primer <script> porque el diseñador los lee al cargar.
  const inline = `<script>window.__CASA__ = ${JSON.stringify(JSON.parse(data)).replace(/</g, "\\u003c")};</script>\n`;
  const at = html.indexOf("<script");
  return new Response(html.slice(0, at) + inline + html.slice(at), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
