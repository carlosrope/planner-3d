/**
 * Dominio público de Plantea para buscadores (canónicas, sitemap, Open Graph, datos estructurados).
 * Es fijo aunque la app también responda en la dirección de Railway, para que Google indexe una sola versión.
 */
export const SITE_URL = (process.env.SITE_URL || "https://plantea.com.mx").replace(/\/$/, "");
/** Dirección vieja de Railway: se redirige a SITE_URL (los enlaces y QR que ya circulan siguen funcionando). */
export const LEGACY_HOST = "planner-3d-production.up.railway.app";

/** Rutas que no deben aparecer en buscadores: cuentas, paneles, enlaces privados y la API. */
export const PRIVATE_PATHS = ["/admin", "/api", "/eventos", "/negocio", "/lugares/*/panel", "/revisar", "/v/", "/olvide", "/restablecer", "/alta/gracias"];

/** Datos estructurados (schema.org) de la marca, para la portada. */
export const organizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Plantea",
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  areaServed: { "@type": "City", name: "Los Mochis" },
  description: "Planos 2D y recorridos 3D de salones de eventos y casas reales de Los Mochis, para planear desde el celular.",
});

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Plantea",
  url: SITE_URL,
  inLanguage: "es-MX",
});

/** Un lugar del catálogo como salón de eventos o casa (schema.org EventVenue / SingleFamilyResidence). */
export function venueJsonLd(v: {
  kind: "salon" | "casa";
  name: string;
  slug: string;
  city: string;
  address: string | null;
  description: string | null;
  capacity: number | null;
  image: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": v.kind === "salon" ? "EventVenue" : "SingleFamilyResidence",
    name: v.name,
    url: `${SITE_URL}/lugares/${v.slug}`,
    description: v.description ?? undefined,
    image: v.image ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: v.address ?? undefined, addressLocality: v.city, addressCountry: "MX" },
    maximumAttendeeCapacity: v.kind === "salon" && v.capacity ? v.capacity : undefined,
  };
}

/** JSON-LD listo para <script>: sin "<" para que no cierre la etiqueta. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
