// Minifica el diseñador para producción: escribe en src/designer/.min/ una copia de cada archivo (.js, .json y los
// <script>/<style> de disenador.html) con el mismo nombre. «npm run build» lo corre antes de next build y
// src/lib/designer/page.ts usa esas copias en producción. Si esbuild no está, se sigue sin minificar.
//
// Los scripts normales se minifican sin renombrar sus nombres de arriba (los comparten entre sí: select, ROOMS…);
// el <script type="module"> del 3D sí, porque su alcance es propio. esbuild escapa «</script>» dentro del código.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "src/designer");
const OUT = path.join(DIR, ".min");

let esbuild;
try {
  esbuild = await import("esbuild");
} catch {
  console.log("minificar: no está esbuild; el diseñador se sirve sin minificar");
  process.exit(0);
}

const js = async (code, esm) =>
  (await esbuild.transform(code, { loader: "js", minify: true, target: "es2020", legalComments: "none", ...(esm ? { format: "esm" } : {}) })).code;
const css = async (code) => (await esbuild.transform(code, { loader: "css", minify: true })).code;

async function html(text) {
  let out = "";
  let at = 0;
  for (const m of text.matchAll(/<(script|style)(\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
    const [whole, tag, attrs = "", body] = m;
    out += text.slice(at, m.index);
    at = m.index + whole.length;
    if (tag === "style") out += `<style${attrs}>${await css(body)}</style>`;
    else if (/type="importmap"/.test(attrs) || !body.trim()) out += whole;
    else {
      const code = await js(body, /type="module"/.test(attrs));
      if (code.includes("</script")) throw new Error("minificar: quedó «</script» dentro de un script");
      out += `<script${attrs}>${code}</script>`;
    }
  }
  return out + text.slice(at);
}

async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (/\.(js|json|html)$/.test(e.name)) files.push(p);
  }
  return files;
}

let before = 0;
let after = 0;
for (const file of await walk(DIR)) {
  const rel = path.relative(DIR, file);
  const text = await readFile(file, "utf8");
  const min = rel.endsWith(".html") ? await html(text) : rel.endsWith(".json") ? JSON.stringify(JSON.parse(text)) : await js(text, false);
  await mkdir(path.dirname(path.join(OUT, rel)), { recursive: true });
  await writeFile(path.join(OUT, rel), min);
  before += Buffer.byteLength(text);
  after += Buffer.byteLength(min);
}
console.log(`minificar: diseñador de ${Math.round(before / 1024)} KB a ${Math.round(after / 1024)} KB en src/designer/.min/`);
