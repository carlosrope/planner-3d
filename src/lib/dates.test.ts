import { describe, expect, it } from "vitest";
import { addDays, addMonths, dayOf, endOfDay, formatDay, formatInstant, isRealDay, monthOf, startOfDay, today } from "./dates";

describe("fechas en America/Mazatlan", () => {
  it("un día de calendario no cambia de día", () => {
    expect(formatDay("2026-11-21", "weekday")).toMatch(/^sábado, 21 de noviembre/);
    // Postgres a veces entrega el date como Date a medianoche UTC.
    expect(formatDay(new Date("2026-11-21T00:00:00Z"), "short")).toMatch(/^21 nov/);
  });
  it("un instante se muestra en la hora de Los Mochis", () => {
    // 22 nov 02:00 UTC = 21 nov 19:00 en Los Mochis.
    const sabadoNoche = new Date("2026-11-22T02:00:00Z");
    expect(formatInstant(sabadoNoche, "dayMonth")).toBe("21 de noviembre");
    expect(dayOf(sabadoNoche)).toBe("2026-11-21");
    expect(today(sabadoNoche)).toBe("2026-11-21");
    expect(monthOf(new Date("2026-12-01T05:00:00Z"))).toBe("2026-11");
  });
  it("vigente hasta el día X incluye todo ese día y se vuelve a leer igual", () => {
    const end = endOfDay("2026-10-31");
    expect(end.toISOString()).toBe("2026-11-01T06:59:59.000Z");
    expect(dayOf(end)).toBe("2026-10-31");
    expect(startOfDay("2026-10-01").toISOString()).toBe("2026-10-01T07:00:00.000Z");
  });
  it("suma días de calendario", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("suma meses en el calendario de Los Mochis, con la misma hora", () => {
    // 30 de enero a las 23:59 de Los Mochis es el 31 a las 06:59 UTC: un mes después es el 28 de febrero, no el 27.
    expect(addMonths(endOfDay("2027-01-30"), 1)).toEqual(endOfDay("2027-02-28"));
    expect(addMonths(endOfDay("2026-11-30"), 1)).toEqual(endOfDay("2026-12-30"));
    expect(addMonths(endOfDay("2028-02-29"), 12)).toEqual(endOfDay("2029-02-28"));
    // 8 p.m. del 15 de marzo en Los Mochis → 8 p.m. del 15 de abril.
    expect(addMonths(new Date("2027-03-16T03:00:00Z"), 1).toISOString()).toBe("2027-04-16T03:00:00.000Z");
  });
});

import { monthGrid } from "../components/DateField";

describe("calendario", () => {
  it("la cuadrícula empieza en lunes y trae 6 semanas", () => {
    // Octubre de 2026 empieza en jueves: la cuadrícula arranca el lunes 28 de septiembre.
    const g = monthGrid(2026, 9);
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-09-28");
    expect(g[3]).toBe("2026-10-01");
    expect(g[41]).toBe("2026-11-08");
  });

  it("reconoce los días que sí existen", () => {
    expect(isRealDay("2026-02-28")).toBe(true);
    expect(isRealDay("2028-02-29")).toBe(true);
    expect(isRealDay("2026-02-31")).toBe(false);
    expect(isRealDay("2026-13-01")).toBe(false);
    expect(isRealDay("26-01-01")).toBe(false);
  });
});
