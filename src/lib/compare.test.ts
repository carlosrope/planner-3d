import { describe, expect, it } from "vitest";
import { dragVelocity, easeOut, flickTarget } from "./compare";

describe("comparador por fuera / por dentro", () => {
  it("un lanzamiento rápido manda la línea a la orilla", () => {
    expect(flickTarget(1.2)).toBe(100);
    expect(flickTarget(-0.9)).toBe(0);
  });
  it("un arrastre lento se queda donde se soltó", () => {
    expect(flickTarget(0.2)).toBeNull();
    expect(flickTarget(-0.3)).toBeNull();
  });
  it("la velocidad sale de los últimos 100 ms del arrastre", () => {
    const samples = [
      { t: 0, x: 0 },
      { t: 400, x: 10 },
      { t: 450, x: 40 },
      { t: 500, x: 100 },
    ];
    expect(dragVelocity(samples)).toBeCloseTo(90 / 100);
    expect(dragVelocity([{ t: 0, x: 5 }])).toBe(0);
  });
  it("el frenado empieza en 0 y termina en 1", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});
