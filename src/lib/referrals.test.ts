import { describe, expect, it } from "vitest";
import { referralPlanEnd, referralQuota } from "./domain";
import { monthStart, newReferralCode, normalizeReferralCode, referralCodeCandidates, referralLeft, referralPrefix } from "./referrals";

describe("códigos de referido", () => {
  it("el prefijo recuerda al lugar, sin acentos ni artículos", () => {
    expect(referralPrefix("Salón Las Palmas")).toBe("LASPAL");
    expect(referralPrefix("Jardín Añoranza")).toBe("ANORAN");
    expect(referralPrefix("V de Vaca · Terraza")).toBe("VDEVAC");
    expect(referralPrefix("   ")).toBe("PLANTE");
  });

  it("el código lleva seis caracteres legibles después del guion", () => {
    const code = newReferralCode("Salón Las Palmas", (n) => new Uint8Array(n).map((_, i) => i * 7));
    expect(code).toMatch(/^LASPAL-[2-9A-HJKMNP-Z]{6}$/);
  });

  it("encuentra el código nuevo aunque lo escriban sin guion, y los viejos de cuatro siguen", () => {
    expect(referralCodeCandidates("laspal7k3mq2")).toEqual(["LASPAL7K3MQ2", "LASPAL-7K3MQ2"]);
    expect(referralCodeCandidates("LASPAL-7K3MQ2")).toEqual(["LASPAL-7K3MQ2"]);
    // Sin guion puede ser un código viejo (prefijo de 6 + 4) o uno nuevo con prefijo corto (4 + 6): se buscan los dos.
    expect(referralCodeCandidates("laspal7k3m")).toEqual(["LASPAL-7K3M", "LASP-AL7K3M"]);
    expect(referralCodeCandidates("")).toEqual([]);
  });

  it("acepta el código como lo escriba el cliente", () => {
    expect(normalizeReferralCode(" laspal-7k3m ")).toBe("LASPAL-7K3M");
    expect(normalizeReferralCode("LASPAL 7K3M")).toBe("LASPAL-7K3M");
    expect(normalizeReferralCode("laspal7k3m")).toBe("LASPAL-7K3M");
    expect(normalizeReferralCode("")).toBeNull();
    // Los códigos de invitación de Plantea (SIGNUP_CODES) se comparan antes de normalizar, tal como se escriben.
    expect(normalizeReferralCode("VDEVACA2026X")).toBe("VDEVACA2026X");
  });

  it("el tope de códigos depende del tipo de cuenta y del nivel", () => {
    expect(referralQuota({ kind: "venue", plan: "eventos", tier: "pro" })).toBe(10);
    expect(referralQuota({ kind: "developer", plan: "ambos", tier: "pro" })).toBe(50);
    expect(referralQuota({ kind: "planner", plan: "eventos", tier: "pro" })).toBe(5);
    expect(referralQuota({ kind: "venue", plan: "eventos", tier: "ilimitado" })).toBeNull();
    expect(referralQuota({ kind: "venue", plan: "prueba", tier: "pro" })).toBe(5);
    expect(referralQuota({ kind: "venue", plan: "prueba", tier: "ilimitado" })).toBe(5);
    expect(referralQuota({ kind: "planner", plan: "prueba", tier: "pro" })).toBe(0);
    expect(referralQuota({ kind: "developer", plan: "prueba", tier: "pro" })).toBe(0);
    expect(referralQuota({ kind: "planner", plan: "personal", tier: "pro" })).toBe(0);
    expect(referralQuota({ kind: "planner", plan: "invitado", tier: "pro" })).toBe(0);
    expect(referralLeft(50, 48)).toBe(2);
    expect(referralLeft(5, 9)).toBe(0);
    expect(referralLeft(null, 900)).toBeNull();
  });

  it("la cuenta con código dura 30 días después del evento, o 90 sin fecha", () => {
    const now = new Date("2026-10-13T18:00:00Z");
    expect(referralPlanEnd("2026-12-05", now).toISOString()).toBe("2027-01-05T06:59:59.000Z");
    expect(referralPlanEnd(null, now).toISOString()).toBe("2027-01-12T06:59:59.000Z");
  });

  it("el mes en curso empieza el día 1 a medianoche de Sinaloa", () => {
    expect(monthStart(new Date("2026-10-13T18:00:00Z")).toISOString()).toBe("2026-10-01T07:00:00.000Z");
    // A las 23:00 del 31 en Sinaloa todavía es octubre aunque en UTC ya sea noviembre.
    expect(monthStart(new Date("2026-11-01T06:30:00Z")).toISOString()).toBe("2026-10-01T07:00:00.000Z");
  });
});
