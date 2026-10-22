import { describe, expect, it } from "vitest";
import chardonnay from "@/designer/casas/chardonnay.json";
import salon from "@/designer/salones/salon-demo.json";
import { sampleGuests, seatGuests } from "./samples";
import { designDocSchema } from "./schema";
import { starterDesign, starterFurniture } from "./starter";
import { withoutVendors, type DesignDoc, type DesignerPlan, type Furniture } from "./types";

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

  it("cada tipo de evento pone lo suyo y quita lo que no le toca", () => {
    const names = (kind: Parameters<typeof starterFurniture>[1]["kind"]) => starterFurniture(SALON, { guests: 120, kind }).map((f) => f.name);
    const infantil = names("infantil");
    expect(infantil).toEqual(expect.arrayContaining(["Show de payasitas", "Show de botargas", "Área infantil", "Barra de snacks y bebidas", "Mesa de dulces"]));
    expect(infantil).not.toContain("Pista de baile");
    expect(infantil).not.toContain("Candelabro de piso");
    const bautizo = names("bautizo");
    expect(bautizo).toEqual(expect.arrayContaining(["Mesa de regalos", "Barra de snacks y bebidas", "Mesa de pastel"]));
    expect(bautizo).not.toContain("Pista de baile");
    const corp = names("corporativo");
    expect(corp).toEqual(expect.arrayContaining(["Podio", "Pantalla LED", "Mesa de registro", "Estación de café"]));
    expect(corp).not.toContain("Pista de baile");
    expect(corp).not.toContain("Mesa de pastel");
    expect(names("graduacion")).toContain("Mesa de presídium");
    expect(names("cumpleanos")).toEqual(expect.arrayContaining(["Pista de baile", "Mesa de pastel"]));
    expect(names("posada")).not.toContain("Mesa de pastel");
    // Candelabros solo en boda y XV.
    expect(names("boda")).toContain("Candelabro de piso");
    expect(names("cumpleanos")).not.toContain("Candelabro de piso");
  });

  it("auditorio y escuela sientan a todos mirando al escenario, sin choques", () => {
    for (const [template, type, per] of [["auditorio", "chairrow", 8], ["escuela", "schooltable", 3]] as const) {
      const items = starterFurniture(SALON, { guests: 120, kind: "corporativo", template });
      const rows = items.filter((f) => f.type === type);
      expect(rows.length).toBe(Math.ceil(120 / per));
      expect(new Set(rows.map((r) => r.rot)).size).toBe(1);
      rows.forEach((t, i) => rows.slice(i + 1).forEach((u) => expect(overlap(box(t), box(u))).toBe(false)));
    }
    // El corporativo arma auditorio si no se pide otra plantilla.
    expect(starterFurniture(SALON, { guests: 80, kind: "corporativo" }).some((f) => f.type === "chairrow")).toBe(true);
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

  it("rechaza ids, tipos, materiales y medidas que podrían meter código en la página del diseñador", () => {
    const table = { id: "t1", type: "rtable", name: "Mesa 1", cx: 0, cy: 0, w: 2900, d: 2900, rot: 0, color: "#f4efe6" };
    const ok = (state: object) => designDocSchema.safeParse({ v: 1, levels: { salon: { furniture: [table], ...state } } }).success;
    const xss = `a"><img src=x onerror=alert(1)>`;
    expect(ok({})).toBe(true);
    expect(designDocSchema.safeParse({ v: 1, levels: { salon: { furniture: [{ ...table, id: xss }] } } }).success).toBe(false);
    expect(designDocSchema.safeParse({ v: 1, levels: { salon: { furniture: [{ ...table, type: "rtable x" }] } } }).success).toBe(false);
    expect(designDocSchema.safeParse({ v: 1, levels: { [xss]: { furniture: [] } } }).success).toBe(false);
    expect(ok({ rooms: { sala: { name: "Sala <b>", mat: "wood" } } })).toBe(true); // el nombre se escapa al pintarlo
    expect(ok({ rooms: { sala: { name: "Sala", mat: 'x)" onclick="alert(1)' } } })).toBe(false);
    expect(ok({ rooms: { [xss]: { name: "Sala", mat: "wood" } } })).toBe(false);
    expect(ok({ measures: [{ a: { x: 0, y: 0 }, b: { x: 1000, y: 0 } }] })).toBe(true);
    expect(ok({ measures: [{ a: { x: '0"/><script>', y: 0 }, b: { x: 1000, y: 0 } }] })).toBe(false);
    expect(ok({ demolished: ["w3"] })).toBe(true);
    expect(ok({ demolished: [xss.slice(0, 16)] })).toBe(false);
    expect(ok({ guestList: [{ id: "g1", name: "Ana", table: "t1" }] })).toBe(true);
    expect(ok({ guestList: [{ id: xss, name: "Ana" }] })).toBe(false);
  });

  const vendor = { id: "v1", type: "vendor", name: "DJ Beto", cx: 0, cy: 0, w: 700, d: 700, rot: 0, color: "#6d3fa0", kind: "dj",
    contact: "Beto", phone: "6681234567", arrive: "15:00", setupFrom: "15:00", setupTo: "17:00", power: 2000,
    load: "Acceso de servicio", notes: "Trae su planta", items: ["d1"] };

  it("guarda la ficha completa de un proveedor y rechaza horas inválidas", () => {
    const parsed = designDocSchema.parse({ v: 1, levels: { salon: { furniture: [vendor] } } });
    expect(parsed.levels.salon.furniture[0]).toEqual(vendor);
    const bad = { v: 1, levels: { salon: { furniture: [{ ...vendor, arrive: "25:00" }] } } };
    expect(designDocSchema.safeParse(bad).success).toBe(false);
  });

  it("el enlace del cliente no lleva proveedores (sus teléfonos y notas son de la planner)", () => {
    const table = { id: "t1", type: "rtable", name: "Mesa 1", cx: 0, cy: 0, w: 2900, d: 2900, rot: 0, color: "#f4efe6" };
    const doc = { v: 1, levels: { salon: { furniture: [table, vendor], guestList: [] } } } as DesignDoc;
    const out = withoutVendors(doc) as DesignDoc;
    expect(out.levels.salon.furniture.map((f) => f.id)).toEqual(["t1"]);
    expect(out.levels.salon.guestList).toEqual([]);
    expect(doc.levels.salon.furniture).toHaveLength(2);   // no toca el original
    expect(withoutVendors(null)).toBeNull();
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

describe("enlace del cliente", () => {
  it("no lleva la dieta ni las alergias de los invitados", () => {
    const doc = {
      v: 1,
      levels: { salon: { furniture: [], guestList: [{ id: "g1", name: "Tía Rosa", group: "Novia", diet: "Sin gluten", table: "t1" }] } },
    } as DesignDoc;
    const out = withoutVendors(doc) as DesignDoc;
    expect(out.levels.salon.guestList).toEqual([{ id: "g1", name: "Tía Rosa", group: "Novia", table: "t1" }]);
    expect(doc.levels.salon.guestList?.[0].diet).toBe("Sin gluten"); // no toca el original
  });
});
