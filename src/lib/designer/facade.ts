// Fachada y entorno del 3D de un lugar (plan.facade): color y acabado de los muros de afuera, zoclo, lado de la calle,
// qué hay alrededor, estacionamiento, árboles y letrero del toldo. El diseñador los lee (tools/designer/adapt.py,
// «Fachada real»); si un campo falta, usa lo de siempre. Hoy solo los traen los lugares de demostración
// (src/lib/designer/page.ts), según su foto de «por fuera».

export type Facade = {
  /** Color de los muros por fuera (#rrggbb). */
  color?: string;
  material?: "aplanado" | "rugoso" | "piedra" | "ladrillo" | "concreto";
  /** Zoclo: la franja de abajo de los muros (#rrggbb). */
  plinth?: string;
  /** Lado del plano donde está la calle; sin él, el de la flecha de entrada. */
  street?: "S" | "N" | "E" | "W";
  around?: "ciudad" | "casas" | "campo";
  /** Estacionamiento visto desde la calle (solo salones). */
  parking?: "derecha" | "izquierda" | "no";
  trees?: "mixto" | "palmeras" | "arboles";
  /** Letrero del toldo: sin él, el nombre del lugar; «-» = sin letrero. */
  sign?: string;
};
