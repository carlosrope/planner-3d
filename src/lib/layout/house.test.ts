import { describe, expect, it } from "vitest";
import { analyzeLayout, nearestNeighbors, obstaclesFor } from "./analysis";
import { CHARDONNAY, chardonnayDemoLayout } from "./houses";
import { layoutDocSchema } from "./schema";
import { createObject, emptyHouseLayout } from "./tools";

const spec = CHARDONNAY.spec;

describe("casa Chardonnay", () => {
  it("trae dos plantas con muros, vanos y escalera", () => {
    expect(spec.levels?.map((l) => l.id)).toEqual(["pb", "pa"]);
    for (const level of spec.levels!) {
      expect(level.walls.length).toBeGreaterThan(15);
      expect(level.openings.length).toBeGreaterThan(5);
    }
    expect(spec.levels![0].stairs[0].steps).toHaveLength(15);
  });

  it("el amueblado de demostración no tiene choques", () => {
    const doc = chardonnayDemoLayout();
    const issues = analyzeLayout(doc, spec);
    expect(issues.map((i) => i.message)).toEqual([]);
    expect(layoutDocSchema.safeParse(doc).success).toBe(true);
  });

  it("detecta una cama encimada en un muro y un ropero tapando una ventana", () => {
    const doc = emptyHouseLayout();
    const bed = { ...createObject("cama-king", { x: 4.7, z: 6 }, []), level: "pa" };
    const pb = spec.levels![0];
    const win = pb.openings.find((o) => o.kind === "ventana" && o.w > 1)!;
    const wardrobe = { ...createObject("ropero", { x: win.x, z: win.z + 0.5 }, []), level: "pb" };
    doc.objects = [bed, wardrobe];
    const messages = analyzeLayout(doc, spec).map((i) => i.message);
    expect(messages.some((m) => m.includes("choca con un muro"))).toBe(true);
    expect(messages.some((m) => m.includes("tapa una ventana"))).toBe(true);
  });

  it("cada planta tiene sus propios obstáculos y medidas a muros", () => {
    expect(obstaclesFor(spec, "pb").length).not.toBe(obstaclesFor(spec, "pa").length);
    const doc = chardonnayDemoLayout();
    const bed = doc.objects.find((o) => o.catalogId === "cama-king")!;
    const near = nearestNeighbors(doc, spec, bed);
    expect(near.some((n) => n.id.startsWith("muro:"))).toBe(true);
  });
});
