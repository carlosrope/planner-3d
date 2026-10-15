/**
 * Testimonios de clientes reales para la portada. Solo se agregan con el permiso de quien lo dijo y tal como lo dijo
 * (nombre, cargo y negocio que esa persona autorizó). Vacío = la sección no se muestra.
 */
export type Testimonial = { quote: string; name: string; role: string; business: string };

export const TESTIMONIALS: Testimonial[] = [];

/** Lugares de demostración: no cuentan como "salones que ya usan Plantea". */
export const DEMO_SLUGS = ["salon-demostracion", "casa-chardonnay", "salon-demo", "chardonnay"];
