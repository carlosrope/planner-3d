import { describe, expect, it } from "vitest";
import chardonnay from "@/designer/casas/chardonnay.json";
import salon from "@/designer/salones/salon-demo.json";
import { sampleGuests, seatGuests } from "./samples";
import { designDocSchema } from "./schema";
import { starterDesign, starterFurniture } from "./starter";
import type { DesignerPlan, Furniture } from "./types";

const SALON = salon as unknown as DesignerPlan;
const CASA = chardonnay as unknown as DesignerPlan;

const box = (f: Furniture) => {
  const turned = Math.round(f.rot / 90) % 2 !== 0;
  const hw = (turned ? f.d : f.w) / 2;
  const hh = (turned ? f.w : f.d) / 2;
  return [f.cx - hw, f.cy - hh, f.cx + hw, f.cy + hh];
};
const overlap = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

describe("montaje inicial de un salón", () => {
  it("sienta a todos los invitados de una boda con mesas de 10 y mesa de novios", () => {
    const items = starterFurniture(SALON, { guests: 240, kind: "boda" });
    const tables = items.filter((f) => f.type === "rtable");
    const seats = items.reduce((a, f) => a + (f.seats ?? 0), 0);
    expect(tables).toHaveLength(24);
    expect(seats).toBeGreaterThanOrEqual(240);
    expect(items.some((f) => f.name === "Mesa de novios")).toBe(true);
    expect(tables.map((t) => t.name)).toContain("Mesa 1");
  });

  it("en XV años pone mesa de honor y trono; en corporativo, ninguna mesa principal", () => {
    const xv = starterFurniture(SALON, { guests: 150, kind: "xv" });
    expect(xv.some((f) => f.name === "Mesa de honor XV")).toBe(true);
    expect(xv.some((f) => f.type === "throne")).toBe(true);
    const corp = starterFurniture(SALON, { guests: 150, kind: "corporativo" });
    expect(corp.some((f) => f.type === "headtable")).toBe(false);
  });

  it("las mesas no chocan entre sí, con los fijos ni con las columnas", () => {
    const items = starterFurniture(SALON, { guests: 300, kind: "boda" });
    const tables = items.filter((f) => f.type === "rtable");
    const fixed = items.filter((f) => f.type !== "rtable" && f.type !== "candelabra");
    const columns = SALON.levels[0].walls.filter((w) => w[2] - w[0] === 600 && w[3] - w[1] === 600);
    expect(columns).toHaveLength(4);
    tables.forEach((t, i) => {
      tables.slice(i + 1).forEach((u) => expect(overlap(box(t), box(u))).toBe(false));
      fixed.forEach((f) => expect(overlap(box(t), box(f))).toBe(false));
      columns.forEach((c) => expect(overlap(box(t), [c[0], c[1], c[2], c[3]])).toBe(false));
    });
  });

  it("la plantilla de imperiales sienta a todos con mesas de 16 sin choques", () => {
    const items = starterFurniture(SALON, { guests: 240, kind: "boda", template: "imperial" });
    const tables = items.filter((f) => f.type === "itable");
    expect(tables.length).toBe(Math.ceil((240 - 2) / 16));
    expect(items.reduce((a, f) => a + (f.seats ?? 0), 0)).toBeGreaterThanOrEqual(240);
    tables.forEach((t, i) => tables.slice(i + 1).forEach((u) => expect(overlap(box(t), box(u))).toBe(false)));
  });

  it("la plantilla de cóctel usa periqueras (una por cada 6) y salas lounge, sin mesas numeradas", () => {
    const items = starterFurniture(SALON, { guests: 180, kind: "corporativo", template: "coctel" });
    expect(items.filter((f) => f.type === "cocktail")).toHaveLength(30);
    expect(items.filter((f) => f.type === "lounge")).toHaveLength(3);
    expect(items.some((f) => /^Mesa \d+$/.test(f.name))).toBe(false);
  });

  it("si no caben todos, pone las que caben", () => {
    const items = starterFurniture(SALON, { guests: 2000, kind: "boda" });
    expect(items.filter((f) => f.type === "rtable").length).toBeLessThan(200);
  });
});

describe("documento del diseño", () => {
  it("el montaje de un salón es válido para guardarse", () => {
    const doc = starterDesign(SALON, { guests: 240, kind: "boda" });
    expect(designDocSchema.safeParse(doc).success).toBe(true);
    expect(Object.keys(doc.levels)).toEqual(["salon"]);
  });

  it("una casa arranca con el amueblado del modelo (sin plantas guardadas)", () => {
    expect(starterDesign(CASA, { guests: 0, kind: "casa" })).toEqual({ v: 1, levels: {} });
  });

  it("rechaza colores y medidas inválidos", () => {
    const bad = {
      v: 1,
      levels: { pb: { furniture: [{ id: "a", type: "rtable", name: "x", cx: 0, cy: 0, w: -1, d: 10, rot: 0, color: "rojo" }] } },
    };
    expect(designDocSchema.safeParse(bad).success).toBe(false);
  });
});

describe("proyectos de ejemplo", () => {
  it("genera invitados en familias, con ids únicos y algunas dietas", () => {
    const guests = sampleGuests(220);
    expect(guests).toHaveLength(220);
    expect(new Set(guests.map((g) => g.id)).size).toBe(220);
    expect(new Set(guests.map((g) => g.group)).size).toBeGreaterThan(20);
    expect(guests.some((g) => g.diet)).toBe(true);
  });

  it("sienta a 220 invitados en redondas y en imperiales sin que sobre nadie", () => {
    for (const template of ["redondas", "imperial"] as const) {
      const furniture = starterFurniture(SALON, { guests: 220, kind: "boda", template });
      const guests = sampleGuests(220);
      expect(seatGuests(furniture, guests)).toBe(0);
      for (const f of furniture) expect(guests.filter((g) => g.table === f.id).length).toBeLessThanOrEqual(f.seats ?? 0);
      const doc = { v: 1, levels: { salon: { furniture, guestList: guests } } };
      expect(designDocSchema.safeParse(doc).success).toBe(true);
    }
  });
});
