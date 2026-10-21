// Datos de contacto de Plantea que aparecen en la app (demo pública, catálogo, plan de la cuenta).

/** WhatsApp de Plantea (solo dígitos con lada de país). PROLINK_WHATSAPP queda como respaldo del nombre anterior. */
export const CONTACT_WHATSAPP = process.env.CONTACT_WHATSAPP ?? process.env.PROLINK_WHATSAPP ?? "526681305828";
/** Planes y precios de Plantea: página propia de la app. */
export const PRICES_URL = "/planes";
/** Slogan de la marca (elegido por el usuario el 21 de octubre de 2026): el plano, el 3D y la fiesta. */
export const SLOGAN = ["Plantéalo.", "Míralo.", "Vívelo."] as const;
export const SLOGAN_TEXT = SLOGAN.join(" ");
/** ProLink365, la empresa que desarrolla Plantea (solo para el "Hecho por" del pie). */
export const PARTNER_SITE = "https://prolink365.com.mx";

/** Datos para pagar por transferencia; sin ellos, Tu plan pide los datos por WhatsApp. */
export const spei = () =>
  process.env.SPEI_CLABE
    ? { bank: process.env.SPEI_BANK ?? "", clabe: process.env.SPEI_CLABE, holder: process.env.SPEI_HOLDER ?? "" }
    : null;

/** Origen público de la app para armar enlaces absolutos fuera de una petición (páginas). */
export const siteOrigin = () => process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "";

/** Redes de Plantea (las cuentas existen: @plantea.3d en Instagram y Plantea3D en Facebook). */
export const SOCIAL = {
  facebook: "https://www.facebook.com/Plantea3D",
  instagram: "https://www.instagram.com/plantea.3d",
};

/**
 * Datos opcionales para verificar a Plantea (página /nosotros y datos estructurados). Solo se muestran si existen
 * en las variables de Railway: no se inventa ninguno.
 */
export const trustData = () => ({
  rfc: process.env.PLANTEA_RFC?.trim() || null,
  instagram: process.env.PLANTEA_INSTAGRAM?.trim() || SOCIAL.instagram,
  facebook: process.env.PLANTEA_FACEBOOK?.trim() || SOCIAL.facebook,
  google: process.env.PLANTEA_GOOGLE_PROFILE?.trim() || null,
});
