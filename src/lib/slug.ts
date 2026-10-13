// Direcciones legibles para el catálogo público: "Salón Las Palmas" → "salon-las-palmas".

/** Minúsculas sin acentos, con guiones; vacío si no queda nada útil. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Primer slug libre: el base, o base-2, base-3… según los que ya existen. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || "lugar";
  if (!used.has(root)) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Ciudad tal como se escribe en la base a partir de su slug ("los-mochis" → "Los Mochis"), para títulos. */
export function cityFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w, i) => (i > 0 && ["de", "del", "la", "las", "los", "y"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
