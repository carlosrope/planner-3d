import { describe, expect, it } from "vitest";
import { activeModules } from "./domain";
import { FULL_ACCESS, orgValuesFor, parseInvites } from "./invites";

describe("códigos de invitación", () => {
  it("sin variables no hay códigos", () => {
    expect(parseInvites(undefined, undefined).size).toBe(0);
  });

  it("SIGNUP_CODE da acceso completo sin vencimiento", () => {
    const invites = parseInvites(undefined, " demo2026 ");
    expect(invites.get("demo2026")).toEqual(FULL_ACCESS);
    expect(orgValuesFor(FULL_ACCESS).planEndsAt).toBeNull();
  });

  it("SIGNUP_CODES define tipo, plan, módulos y días de prueba", () => {
    const invites = parseInvites(
      JSON.stringify({
        PLANNER14: { kind: "planner", plan: "prueba", modules: ["salones"], days: 14 },
        VDEVACA: { kind: "venue", plan: "eventos" },
        OZMAN: { kind: "agency", plan: "casas" },
        TODO: { plan: "ambos" },
        RARO: { kind: "x", plan: "y", modules: ["z"] },
      }),
      undefined,
    );
    expect(invites.get("PLANNER14")).toEqual({ kind: "planner", plan: "prueba", modules: ["salones"], days: 14 });
    expect(invites.get("VDEVACA")).toEqual({ kind: "venue", plan: "eventos", modules: ["salones"], days: null });
    expect(invites.get("OZMAN")).toEqual({ kind: "agency", plan: "casas", modules: ["casas"], days: null });
    expect(invites.get("TODO")).toEqual({ kind: "planner", plan: "ambos", modules: ["salones", "casas"], days: null });
    // Valores desconocidos: planner en prueba de 14 días con los dos módulos.
    expect(invites.get("RARO")).toEqual({ kind: "planner", plan: "prueba", modules: ["salones", "casas"], days: 14 });
  });

  it("la prueba vence a los días indicados", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    const values = orgValuesFor({ kind: "planner", plan: "prueba", modules: ["salones"], days: 14 }, now);
    expect(values.planEndsAt?.toISOString()).toBe("2026-10-26T12:00:00.000Z");
  });

  it("JSON inválido avisa", () => {
    expect(() => parseInvites("{no", undefined)).toThrow();
  });
});

describe("módulos activos", () => {
  const org = (modules: ("salones" | "casas")[], planEndsAt: Date | null) => ({ modules, planEndsAt });
  it("sin vencimiento, los contratados en el orden de la app", () => {
    expect(activeModules(org(["casas", "salones"], null))).toEqual(["salones", "casas"]);
    expect(activeModules(org(["casas"], null))).toEqual(["casas"]);
  });
  it("vencido, ninguno", () => {
    const now = new Date("2026-10-27T00:00:00Z");
    expect(activeModules(org(["salones"], new Date("2026-10-26T00:00:00Z")), now)).toEqual([]);
    expect(activeModules(org(["salones"], new Date("2026-10-28T00:00:00Z")), now)).toEqual(["salones"]);
  });
});
