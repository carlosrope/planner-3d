import { describe, expect, it } from "vitest";
import { activeModules, referralQuota } from "./domain";
import { orgValuesFor, trialInvite } from "./invites";
import { codeFrom, referralCodeCandidates } from "./referrals";
import { canRedeemTrial, newTrialCode, redeemValues, trialCodeMessage, trialCodeState, trialEnd } from "./trial-codes";

const now = new Date("2026-10-21T18:00:00Z"); // 21 de octubre, 11:00 en Los Mochis

describe("códigos de mes gratis", () => {
  it("se generan con el prefijo MES y seis letras o dígitos que no se confunden", () => {
    const code = newTrialCode((n) => new Uint8Array(Array.from({ length: n }, (_, i) => i * 7)));
    expect(code).toMatch(/^MES-[2-9A-HJ-NP-Z]{6}$/);
    // Se pegan y se buscan igual que los de los salones, con o sin guion.
    expect(codeFrom(`Le comparto su código: ${code} gracias`)).toBe(code);
    expect(referralCodeCandidates(code.replace("-", "").toLowerCase())).toContain(code);
  });

  it("el de un salón abre una cuenta de salón en prueba con Eventos y 5 códigos para sus clientes", () => {
    const invite = trialInvite({ id: "c1", code: "MES-7K3MQ2", kind: "venue", days: 30 });
    expect(invite).toMatchObject({ kind: "venue", plan: "prueba", modules: ["salones"], days: 30, trial: { codeId: "c1", startsOnPublish: true } });
    const values = orgValuesFor(invite, now);
    // Acceso provisional de 30 días desde hoy; el mes de verdad empieza al publicarse su salón.
    expect(values.planEndsAt?.toISOString()).toBe("2026-11-21T06:59:59.000Z");
    expect(referralQuota({ kind: values.kind, plan: values.plan, tier: "pro" })).toBe(5);
  });

  it("el de una planner (o quien recomendó un salón) empieza al entrar y no reparte códigos", () => {
    const invite = trialInvite({ id: "c2", code: "MES-AB23CD", kind: "planner", days: 30 });
    expect(invite.trial?.startsOnPublish).toBe(false);
    const values = orgValuesFor(invite, now);
    expect(values.kind).toBe("planner");
    expect(referralQuota({ kind: values.kind, plan: values.plan, tier: "pro" })).toBe(0);
    expect(activeModules(values, now)).toEqual(["salones"]);
  });

  it("el mes termina a las 23:59 de Los Mochis del día 30 (publicado el 25 oct → 24 nov)", () => {
    expect(trialEnd(30, new Date("2026-10-25T17:00:00Z")).toISOString()).toBe("2026-11-25T06:59:59.000Z");
  });

  it("canjean en Mi negocio solo las cuentas sin plan de pago vigente", () => {
    const later = new Date("2026-12-01T00:00:00Z");
    expect(canRedeemTrial({ plan: "libre", modules: [], planEndsAt: null }, now)).toBe(true);
    expect(canRedeemTrial({ plan: "invitado", modules: ["salones"], planEndsAt: later }, now)).toBe(true);
    expect(canRedeemTrial({ plan: "prueba", modules: ["salones"], planEndsAt: later }, now)).toBe(true);
    expect(canRedeemTrial({ plan: "eventos", modules: ["salones"], planEndsAt: later }, now)).toBe(false);
    expect(canRedeemTrial({ plan: "personal", modules: ["salones"], planEndsAt: null }, now)).toBe(false);
    // Un plan de pago que ya venció sí puede canjear.
    expect(canRedeemTrial({ plan: "eventos", modules: ["salones"], planEndsAt: new Date("2026-10-01T00:00:00Z") }, now)).toBe(true);
  });

  it("al canjear: el de salón vuelve la cuenta de salón; una prueba más larga no se acorta", () => {
    const free = { kind: "planner" as const, plan: "libre" as const, modules: [], planEndsAt: null };
    expect(redeemValues(free, { kind: "venue", days: 30 }, now)).toMatchObject({ kind: "venue", plan: "prueba", modules: ["salones"] });
    expect(redeemValues(free, { kind: "planner", days: 30 }, now).kind).toBe("planner");
    const longTrial = new Date("2027-01-31T06:59:59Z");
    expect(redeemValues({ ...free, plan: "prueba", modules: ["casas"], planEndsAt: longTrial }, { kind: "planner", days: 30 }, now)).toEqual({
      kind: "planner",
      plan: "prueba",
      modules: ["casas", "salones"],
      planEndsAt: longTrial,
    });
  });

  it("estado para la lista y mensaje de WhatsApp de usted, con el enlace de registro", () => {
    expect(trialCodeState({ usedAt: null, disabledAt: null })).toBe("libre");
    expect(trialCodeState({ usedAt: now, disabledAt: null })).toBe("usado");
    expect(trialCodeState({ usedAt: null, disabledAt: now })).toBe("desactivado");
    const venueMsg = trialCodeMessage({ code: "MES-7K3MQ2", kind: "venue", days: 30 }, "https://plantea.com.mx");
    expect(venueMsg).toContain("https://plantea.com.mx/registro?codigo=MES-7K3MQ2");
    expect(venueMsg).toContain("el día que su salón quede publicado");
    expect(venueMsg).toContain("Mi negocio");
    expect(trialCodeMessage({ code: "MES-AB23CD", kind: "planner", days: 15 }, "https://plantea.com.mx")).toContain("15 días");
  });
});
