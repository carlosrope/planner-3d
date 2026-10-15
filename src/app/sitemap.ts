import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listCatalog, listCatalogCities } from "@/lib/dal";
import { SITE_URL } from "@/lib/site";

/** Sitemap con las páginas públicas y cada lugar publicado del catálogo (se arma en cada petición). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [salones, casas, salonCities, casaCities] = await Promise.all([
    listCatalog("salon"),
    listCatalog("casa"),
    listCatalogCities("salon"),
    listCatalogCities("casa"),
  ]);
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page("", 1, "weekly"),
    page("/salones", 0.9, "daily"),
    page("/casas", 0.8, "daily"),
    ...salonCities.map((c) => page(`/salones/${c.slug}`, 0.8, "daily")),
    ...casaCities.map((c) => page(`/casas/${c.slug}`, 0.7, "daily")),
    ...[...salones, ...casas].flatMap((v) => {
      const key = v.slug ?? v.id;
      return [page(`/lugares/${key}`, 0.8), page(`/lugares/${key}/3d`, 0.6)];
    }),
    page("/disenador/salon-demo", 0.6, "monthly"),
    page("/disenador/chardonnay", 0.5, "monthly"),
    page("/planes", 0.6, "monthly"),
    page("/alta", 0.6, "monthly"),
    page("/registro", 0.4, "monthly"),
    page("/privacidad", 0.2, "monthly"),
    page("/terminos", 0.2, "monthly"),
  ];
}
