/**
 * Dominio público de Plantea para buscadores (canónicas, sitemap, Open Graph, datos estructurados).
 * Es fijo aunque la app también responda en la dirección de Railway, para que Google indexe una sola versión.
 */
import { SLOGAN_TEXT } from "./brand";

export const SITE_URL = (process.env.SITE_URL || "https://plantea.com.mx").replace(/\/$/, "");
/** Dirección vieja de Railway: se redirige a SITE_URL (los enlaces y QR que ya circulan siguen funcionando). */
export const LEGACY_HOST = "planner-3d-production.up.railway.app";

/** Imagen para la vista previa al compartir cuando el lugar o el evento no tiene foto propia (medidas reales del archivo). */
export const SHARE_IMAGE = {
  salon: { url: `${SITE_URL}/portada/espacios-salon-3d.jpg`, width: 800, height: 575 },
  casa: { url: `${SITE_URL}/portada/espacios-casa-2d.jpg`, width: 800, height: 575 },
};

/** Rutas que no deben aparecer en buscadores: cuentas, paneles, enlaces privados y la API. */
export const PRIVATE_PATHS = ["/admin", "/api", "/inicio", "/eventos", "/negocio", "/lugares/*/panel", "/revisar", "/v/", "/olvide", "/restablecer", "/alta/gracias"];

/** Datos estructurados (schema.org) de la marca, para la portada. */
export const organizationJsonLd = (extra: { sameAs?: string[] } = {}) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Plantea",
  slogan: SLOGAN_TEXT,
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  email: "hola@plantea.com.mx",
  founder: { "@type": "Person", name: "Carlos Manuel Robles Pérez" },
  address: { "@type": "PostalAddress", addressLocality: "Los Mochis", addressRegion: "Sinaloa", addressCountry: "MX" },
  contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: "hola@plantea.com.mx", telephone: "+52-668-130-5828", areaServed: "MX", availableLanguage: "es" },
  sameAs: ["https://prolink365.com.mx", ...(extra.sameAs ?? [])],
  areaServed: { "@type": "Country", name: "México" },
  description: "Planos 2D y recorridos 3D de salones de eventos y casas reales de México, para planear desde el celular.",
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

/** Migas de pan para buscadores (Plantea › Salones › Guasave › Salón X); `path` desde la raíz del sitio. */
export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
});

/** Los lugares de una página del catálogo, en orden, para buscadores. */
export const itemListJsonLd = (name: string, places: { name: string; slug: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  numberOfItems: places.length,
  itemListElement: places.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${SITE_URL}/lugares/${p.slug}` })),
});

/** JSON-LD listo para <script>: sin "<" para que no cierre la etiqueta. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
