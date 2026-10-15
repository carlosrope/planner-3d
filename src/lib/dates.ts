/**
 * Una sola regla de fechas para toda la app (hora de Los Mochis, America/Mazatlan):
 *
 * - **Días de calendario** (columnas `date`: fecha del evento, de la solicitud, del código): "2026-11-21" es ese día y
 *   nada más. Se muestran con `formatDay`, que no convierte zonas (así el sábado 21 nunca se vuelve viernes).
 * - **Instantes** (columnas `timestamp`: alta, pago, vencimiento): se muestran con `formatInstant`, siempre en
 *   America/Mazatlan, aunque el servidor (Railway) esté en UTC.
 * - "Hasta tal día" se guarda como el último segundo de ese día en Los Mochis (`endOfDay`), y se vuelve a leer como
 *   día con `dayOf`.
 *
 * Sinaloa usa UTC−7 todo el año (sin horario de verano desde 2022): el desfase fijo de `endOfDay` y `startOfDay` es
 * correcto; si eso cambiara, solo hay que tocar MX_OFFSET.
 */
export const APP_TIME_ZONE = "America/Mazatlan";
const MX_OFFSET = "-07:00";

const STYLES = {
  /** 21 nov 2026 */
  short: { day: "numeric", month: "short", year: "numeric" },
  /** 21 de noviembre de 2026 */
  long: { day: "numeric", month: "long", year: "numeric" },
  /** 21 de noviembre */
  dayMonth: { day: "numeric", month: "long" },
  /** 21 nov */
  dayMonthShort: { day: "numeric", month: "short" },
  /** sábado, 21 de noviembre de 2026 */
  weekday: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  /** 21 nov, 7:30 p.m. */
  dateTime: { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" },
  /** nov 26 */
  month: { month: "short", year: "2-digit" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;
export type DateStyle = keyof typeof STYLES;

const cache = new Map<string, Intl.DateTimeFormat>();
const formatter = (style: DateStyle, timeZone: string) => {
  const key = `${style}|${timeZone}`;
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.DateTimeFormat("es-MX", { ...STYLES[style], timeZone })));
  return f;
};

/** Un instante (timestamp) en la hora de Los Mochis. */
export const formatInstant = (d: Date, style: DateStyle = "short") => formatter(style, APP_TIME_ZONE).format(d);

/** Atajo de `formatInstant` en el estilo corto: "15 oct 2026". */
export const formatDate = (d: Date) => formatInstant(d, "short");

/** Un día de calendario ("AAAA-MM-DD" o el Date que da Postgres a medianoche UTC) tal cual, sin cambiar de zona. */
export function formatDay(day: string | Date, style: DateStyle = "short") {
  const ymd = typeof day === "string" ? day.slice(0, 10) : day.toISOString().slice(0, 10);
  return formatter(style, "UTC").format(new Date(`${ymd}T12:00:00Z`));
}

/** "AAAA-MM-DD" del día que es ese instante en Los Mochis. */
export const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Hoy en Los Mochis, "AAAA-MM-DD". */
export const today = (now = new Date()) => dayOf(now);

/** Suma días a un día de calendario. */
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Último instante de ese día en Los Mochis (para "vigente hasta el día X" inclusive). */
export const endOfDay = (day: string) => new Date(`${day}T23:59:59${MX_OFFSET}`);
/** Primer instante de ese día en Los Mochis. */
export const startOfDay = (day: string) => new Date(`${day}T00:00:00${MX_OFFSET}`);

/** "AAAA-MM" del mes en que cae ese instante en Los Mochis. */
export const monthOf = (d: Date) => dayOf(d).slice(0, 7);
