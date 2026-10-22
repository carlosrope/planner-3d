import { describe, expect, it } from "vitest";
import salonDemo from "@/designer/salones/salon-demo.json";
import { capacityFact, setupCapacities, shownCapacities } from "./capacity";
import { starterFurniture } from "./starter";
import type { DesignerPlan } from "./types";

const plan = salonDemo as unknown as DesignerPlan;
const seats = (guests: number, template: "redondas" | "auditorio") =>
  starterFurniture(plan, { guests, kind: template === "redondas" ? "boda" : "corporativo", template }).reduce((a, f) => a + (f.seats ?? 0), 0);

describe("aforo por montaje", () => {
  it("cuenta los lugares que el montaje sí acomoda en el plano real (Salón Demostración)", () => {
    const cap = setupCapacities(plan)!;
    expect(cap.redondas).toBeGreaterThan(200);
    expect(cap.imperial).toBeGreaterThan(200);
    expect(cap.auditorio).toBeGreaterThan(cap.redondas);
    expect(cap.coctel % 6).toBe(0);
    // Es el máximo: pedir más invitados ya no agrega lugares.
    expect(seats(cap.redondas + 100, "redondas")).toBe(cap.redondas);
    expect(seats(cap.auditorio + 100, "auditorio")).toBe(cap.auditorio);
  });

  it("sin lugares fijos o en una casa no se calcula", () => {
    expect(setupCapacities({ ...plan, setup: undefined })).toBeNull();
    expect(setupCapacities({ ...plan, kind: "casa" })).toBeNull();
  });

  it("redondea hacia abajo a decenas, respeta lo que puso la administración y nunca pasa del aforo del salón", () => {
    const auto = { redondas: 382, imperial: 434, coctel: 600, auditorio: 1016, escuela: 495 };
    const sinAforo = shownCapacities(auto, null, null);
    expect(sinAforo.map((c) => c.value)).toEqual([380, 430, 600, 1010, 490]);
    const conAforo = shownCapacities(auto, { imperial: 250 }, 300);
    expect(conAforo.find((c) => c.template === "redondas")).toMatchObject({ value: 300, capped: true, manual: false });
    expect(conAforo.find((c) => c.template === "imperial")).toMatchObject({ value: 250, capped: false, manual: true });
    expect(shownCapacities(null, null, 300)).toEqual([]);
    expect(capacityFact(conAforo, 300)).toBe("Banquete: hasta 300");
    expect(capacityFact([], 300)).toBe("300 personas");
    expect(capacityFact([], null)).toBeNull();
  });
});
