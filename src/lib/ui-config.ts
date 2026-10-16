/**
 * Interfaz del diseñador que define el administrador para todos: orden de las secciones de Propiedades, orden y
 * visibilidad de los grupos de la barra de arriba y tamaño de la barra y de los paneles. Se guarda en
 * app_setting ("ui-disenador") y el diseñador la recibe en window.__UI__ (src/designer/uieditor.js).
 * Puro (sin base de datos): cubierto por ui-config.test.ts.
 */
export type UiConfig = {
  /** Títulos de las secciones de Propiedades, en orden (las que no estén van al final). */
  panelOrder: string[];
  /** Claves de los grupos de la barra de arriba, en orden. */
  toolbarOrder: string[];
  /** Grupos de la barra de arriba ocultos para todos. */
  toolbarHidden: string[];
  /** Tamaño (1 = normal) de la barra de arriba y de los paneles de Catálogo y Propiedades. */
  scale: { toolbar: number; panels: number };
};

export const UI_SETTING_KEY = "ui-disenador";
export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.4;
export const DEFAULT_UI: UiConfig = { panelOrder: [], toolbarOrder: [], toolbarHidden: [], scale: { toolbar: 1, panels: 1 } };

const list = (v: unknown) =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 40)
    : [];
const scale = (v: unknown) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 1;
  return Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, n)) * 100) / 100;
};

/** Limpia lo que llega (de la base o del editor): listas de texto cortas y tamaños dentro del rango. */
export function parseUi(raw: unknown): UiConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sc = (o.scale && typeof o.scale === "object" ? o.scale : {}) as Record<string, unknown>;
  return {
    panelOrder: list(o.panelOrder),
    toolbarOrder: list(o.toolbarOrder),
    toolbarHidden: list(o.toolbarHidden),
    scale: { toolbar: scale(sc.toolbar), panels: scale(sc.panels) },
  };
}
