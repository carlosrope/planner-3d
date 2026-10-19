/**
 * Piloto "Salones fundadores" para /admin/piloto: en qué día de su prueba va cada salón y si le está sacando
 * provecho o hay que llamarle. Puro, sin base de datos: cubierto por pilot.test.ts.
 */
import { daysSince } from "./activity";
import { dayOf } from "./dates";

export const PILOT_DAYS = 30;

export type PilotStats = {
  publishedAt: Date | null;
  lastLogin: Date | null;
  codesGiven: number;
  codesUsed: number;
  clientEvents: number;
  clientViews: number;
  inquiries: number;
};

export type PilotHealth = "provecho" | "en_camino" | "llamar" | "sin_publicar";
export const PILOT_HEALTH_LABELS: Record<PilotHealth, string> = {
  provecho: "Le está sacando provecho",
  en_camino: "En camino",
  llamar: "Llamarle",
  sin_publicar: "Sin publicar",
};

/** Día de la prueba en días de calendario de Los Mochis (1 = el día que se publicó), o null si todavía no se publica. */
export const pilotDay = (publishedAt: Date | null, now = new Date()) => {
  if (!publishedAt) return null;
  const days = (Date.parse(dayOf(now)) - Date.parse(dayOf(publishedAt))) / 86_400_000;
  return Math.max(1, Math.round(days) + 1);
};

/** Avisos que piden llamarle (la guía del administrador: sin entrar 5 días, sin códigos al día 7, códigos sin eventos al día 14). */
export function pilotAlerts(s: PilotStats, now = new Date()): string[] {
  const day = pilotDay(s.publishedAt, now);
  if (day === null) return [];
  const alerts: string[] = [];
  const idle = daysSince(s.lastLogin, now);
  if (day > 5 && (idle === null || idle >= 5)) alerts.push(idle === null ? "No ha entrado a su cuenta" : `No entra desde hace ${idle} días`);
  if (day > 7 && s.codesGiven === 0) alerts.push("No ha dado ningún código");
  if (day > 14 && s.codesGiven > 0 && s.clientEvents === 0) alerts.push("Dio códigos, pero ningún cliente ha armado su evento");
  return alerts;
}

/** Provecho = un cliente usó su código, armó su evento y la familia lo vio (o llegaron solicitudes). */
export function pilotHealth(s: PilotStats, now = new Date()): PilotHealth {
  if (!s.publishedAt) return "sin_publicar";
  if (s.codesUsed > 0 && s.clientEvents > 0 && (s.clientViews > 0 || s.inquiries > 0)) return "provecho";
  return pilotAlerts(s, now).length ? "llamar" : "en_camino";
}
