import { describe, expect, it } from "vitest";
import { addDays, dayOf, endOfDay, formatDay, formatInstant, monthOf, startOfDay, today } from "./dates";

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
});
