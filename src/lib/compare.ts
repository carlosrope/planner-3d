/**
 * Comparador «por fuera / por dentro» (src/components/CompareSlider.tsx): si al soltar la línea iba rápido, se
 * desliza sola hasta la orilla hacia la que se lanzó. Puro para probarlo con `npm test`.
 */

/** Velocidad mínima (px por milisegundo) para que el lanzamiento cuente. */
export const FLICK_SPEED = 0.55;

/** A qué orilla (0 o 100) se desliza la línea al soltarla con esta velocidad, o null si se queda donde está. */
export function flickTarget(velocityPxPerMs: number): 0 | 100 | null {
  if (velocityPxPerMs >= FLICK_SPEED) return 100;
  if (velocityPxPerMs <= -FLICK_SPEED) return 0;
  return null;
}

/** Velocidad del arrastre con las últimas muestras {t (ms), x (px)} de los últimos 100 ms. */
export function dragVelocity(samples: { t: number; x: number }[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const recent = samples.filter((s) => last.t - s.t <= 100);
  const first = recent[0];
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}

/** Curva de frenado para el deslizamiento (rápido al principio, suave al llegar). */
export const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
