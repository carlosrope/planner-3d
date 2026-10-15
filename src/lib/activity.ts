/**
 * Actividad de cada cuenta para /admin/actividad: en qué paso va (entró, armó un evento, lo compartió, su cliente
 * lo abrió). Puro, sin base de datos: cubierto por activity.test.ts.
 */

/** Robots que abren el enlace para armar la vista previa (WhatsApp, Facebook, iMessage…) o para indexar: no cuentan. */
const PREVIEW_BOTS = /bot\b|bot\/|crawler|spider|facebookexternalhit|facebookcatalog|whatsapp|telegram|slack|discord|twitter|linkedin|skype|embedly|preview|headless|lighthouse/i;
export const isPreviewBot = (userAgent: string | null | undefined) => !userAgent || PREVIEW_BOTS.test(userAgent);

export type ActivityStage = "sin_entrar" | "entro" | "armo" | "compartio" | "visto";
export const ACTIVITY_STAGE_LABELS: Record<ActivityStage, string> = {
  sin_entrar: "No ha entrado",
  entro: "Entró, sin evento",
  armo: "Armó un evento",
  compartio: "Compartió el enlace",
  visto: "Su cliente lo abrió",
};

/** El paso más avanzado de la cuenta. Los proyectos de ejemplo no cuentan como "armó un evento". */
export function activityStage(a: { lastLogin: Date | null; ownEvents: number; shares: number; shareViews: number }): ActivityStage {
  if (a.shareViews > 0) return "visto";
  if (a.shares > 0) return "compartio";
  if (a.ownEvents > 0) return "armo";
  if (a.lastLogin) return "entro";
  return "sin_entrar";
}

/** Días desde la última vez que hizo algo (null si nunca). */
export const daysSince = (d: Date | null, now = new Date()) => (d ? Math.floor((now.getTime() - d.getTime()) / 86_400_000) : null);

/** Lo más reciente de varias fechas (entrar, editar, compartir). */
export const latest = (...dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | null>((acc, d) => (d && (!acc || d > acc) ? d : acc), null);
