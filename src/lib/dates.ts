/** Fechas de la app: siempre en la hora de Los Mochis (America/Mazatlan). */
export const APP_TIME_ZONE = "America/Mazatlan";

const dayMonthYear = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: APP_TIME_ZONE });

/** "15 oct 2026" de un instante (timestamp de la base). */
export const formatDate = (d: Date) => dayMonthYear.format(d);
