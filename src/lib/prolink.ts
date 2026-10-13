// Datos de ProLink365 que aparecen en la app (demo pública, catálogo, plan de la cuenta).

/** WhatsApp de ProLink365 (solo dígitos con lada de país). */
export const PROLINK_WHATSAPP = process.env.PROLINK_WHATSAPP ?? "526681305828";
export const PROLINK_SITE = "https://prolink365.com.mx";
/** Los planes y precios de Plantea (antes Espacios 3D) viven solo en el sitio de ProLink; la app no muestra precios. */
export const PRICES_URL = `${PROLINK_SITE}/espacios-3d.html#planes`;

/** Datos para pagar por transferencia; sin ellos, Tu plan pide los datos por WhatsApp. */
export const spei = () =>
  process.env.SPEI_CLABE
    ? { bank: process.env.SPEI_BANK ?? "", clabe: process.env.SPEI_CLABE, holder: process.env.SPEI_HOLDER ?? "" }
    : null;

/** Origen público de la app para armar enlaces absolutos fuera de una petición (páginas). */
export const siteOrigin = () => process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "";
