import { describe, expect, it } from "vitest";
import { TRASH_DAYS, planEndAfterPayment, trashDaysLeft, trashPurgeAt } from "./domain";
import { dayOf, endOfDay } from "./dates";

describe("papelera", () => {
  const deleted = new Date("2026-10-15T12:00:00Z");
  it("se borra de verdad 30 días después", () => {
    expect(TRASH_DAYS).toBe(30);
    expect(trashPurgeAt(deleted).toISOString()).toBe("2026-11-14T12:00:00.000Z");
  });
  it("cuenta los días que le quedan y no baja de cero", () => {
    expect(trashDaysLeft(deleted, deleted)).toBe(30);
    expect(trashDaysLeft(deleted, new Date("2026-11-13T12:00:00Z"))).toBe(1);
    expect(trashDaysLeft(deleted, new Date("2026-12-01T00:00:00Z"))).toBe(0);
  });
});

import { changedFields, venueStatusAction } from "./domain";

describe("rastro", () => {
  it("solo guarda los campos que cambiaron", () => {
    const before = { plan: "prueba", modules: ["casas", "salones"], planEndsAt: new Date("2026-10-31T06:59:59Z"), tier: "pro" };
    const changes = changedFields(before, { plan: "ambos", modules: ["salones", "casas"], planEndsAt: new Date("2026-10-31T06:59:59Z"), tier: undefined });
    expect(changes).toEqual({ plan: { antes: "prueba", despues: "ambos" } });
  });
  it("publicar y retirar tienen su propia acción", () => {
    expect(venueStatusAction("publicado")).toBe("lugar_publicado");
    expect(venueStatusAction("retirado")).toBe("lugar_retirado");
    expect(venueStatusAction("revision")).toBe("lugar_estado");
  });
});

describe("fin del plan después de un pago", () => {
  // Los planes terminan «hasta el día X» a las 23:59 de Los Mochis (06:59 UTC del día siguiente): el mes se cuenta en
  // el calendario de Los Mochis, no en UTC.
  const until = (day: string, period: "mes" | "anio", now = new Date("2026-01-10T12:00:00Z")) => dayOf(planEndAfterPayment(endOfDay(day), period, now));

  it("suma un mes sin brincarse al siguiente", () => {
    expect(until("2026-01-31", "mes")).toBe("2026-02-28");
    expect(until("2027-12-31", "mes")).toBe("2028-01-31");
    expect(until("2026-03-15", "anio")).toBe("2027-03-15");
    expect(planEndAfterPayment(endOfDay("2026-01-31"), "mes", new Date("2026-01-10T12:00:00Z"))).toEqual(endOfDay("2026-02-28"));
  });

  it("a fin de mes no gana ni pierde un día (antes se contaba en UTC)", () => {
    expect(until("2027-01-30", "mes")).toBe("2027-02-28"); // antes daba el 27
    expect(until("2026-11-30", "mes")).toBe("2026-12-30"); // antes daba el 31
    expect(until("2026-10-31", "mes")).toBe("2026-11-30");
    expect(until("2028-01-31", "mes")).toBe("2028-02-29"); // año bisiesto
    expect(until("2028-02-29", "anio")).toBe("2029-02-28");
    expect(until("2028-02-28", "anio")).toBe("2029-02-28"); // antes daba el 27
  });

  it("si el plan ya venció, el mes cuenta desde que paga, con su hora", () => {
    // Paga el 30 de enero a las 8 p.m. de Los Mochis (31 de enero 03:00 UTC): su mes llega al 28 de febrero, 8 p.m.
    const paid = new Date("2027-01-31T03:00:00Z");
    const end = planEndAfterPayment(endOfDay("2027-01-01"), "mes", paid);
    expect(dayOf(end)).toBe("2027-02-28");
    expect(end.toISOString()).toBe("2027-03-01T03:00:00.000Z");
    expect(dayOf(planEndAfterPayment(null, "anio", paid))).toBe("2028-01-30");
  });

  it("si todavía no vence, se suma a su fin y no a hoy", () => {
    expect(until("2026-02-20", "mes", new Date("2026-02-01T18:00:00Z"))).toBe("2026-03-20");
  });

  it("dos pagos seguidos suman dos meses", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const first = planEndAfterPayment(endOfDay("2026-01-31"), "mes", now);
    expect(dayOf(planEndAfterPayment(first, "mes", now))).toBe("2026-03-28");
  });
});
