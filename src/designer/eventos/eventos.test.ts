import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

// eventos.js es un script del navegador: se evalúa con los globales mínimos que usa.
type Guest = { id: string; name: string; group: string; diet: string; table?: string };
type Piece = { id: string; type: string; name?: string; kind?: string; items?: string[]; arrive?: string };
type Vendors = {
  KINDS: Record<string, { letters: string; links: string[] }>;
  waPhone: (phone: string) => string;
  message: (v: Record<string, unknown>, ctx: { title: string; date: string; brand: string }) => string;
  onAdd: (f: Piece, it: unknown, st: { furniture: Piece[] }) => boolean;
  byArrival: (a: Piece, b: Piece) => number;
};
type Ext = {
  parseList: (text: string) => Guest[];
  autoSeat: (st: { furniture: unknown[]; guestList: Guest[] }) => number;
  vendors: Vendors;
};
type CatalogFile = { cat: string; items: { type: string; name: string; kind?: string }[] }[];
let catalog: CatalogFile;
let ext: Ext;

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  g.window = g;
  g.tr = (_zh: string, _en: string, es?: string) => es ?? _en;
  g.nm = (s: string) => s;
  catalog = JSON.parse(readFileSync(new URL("./catalogo.json", import.meta.url), "utf8"));
  g.__EVENTOS__ = catalog;
  // Mismo orden que en la página: proveedores.js antes de eventos.js
  for (const file of ["./proveedores.js", "./eventos.js"]) new Function(readFileSync(new URL(file, import.meta.url), "utf8"))();
  ext = g.__EXT__ as Ext;
});

const table = (id: string, name: string, seats: number) => ({ id, type: "rtable", name, seats });

describe("lista pegada", () => {
  it("lee grupos, numeración, viñetas, dieta entre paréntesis y acompañantes", () => {
    const list = ext.parseList("Familia Pérez:\n1. Juan Pérez\n- Ana López (vegetariana)\n• Luis Pérez +2\n\nAmigos:\nSofía");
    expect(list.map((g) => g.name)).toEqual([
      "Juan Pérez",
      "Ana López",
      "Luis Pérez",
      "Acompañante de Luis Pérez",
      "Acompañante de Luis Pérez",
      "Sofía",
    ]);
    expect(list[1].diet).toBe("vegetariana");
    expect(list[0].group).toBe("Familia Pérez");
    expect(list[5].group).toBe("Amigos");
    expect(new Set(list.map((g) => g.id)).size).toBe(list.length);
  });

  it("lee columnas copiadas de Excel y salta el encabezado", () => {
    const list = ext.parseList("Nombre\tGrupo\tDieta\nMarta Ruiz\tNovia\tSin gluten\nPablo Soto\tNovio\t");
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ name: "Marta Ruiz", group: "Novia", diet: "Sin gluten" });
  });
});

describe("acomodo automático", () => {
  it("sienta a cada grupo junto y, si un grupo ya no cabe entero, lo reparte para no dejar lugares vacíos", () => {
    const furniture = [table("t1", "Mesa 1", 4), table("t2", "Mesa 2", 4)];
    const guestList = ext.parseList("A:\na1\na2\na3\nB:\nb1\nb2\nC:\nc1\nc2\nc3");
    const left = ext.autoSeat({ furniture, guestList });
    const at = (n: string) => guestList.filter((g) => g.table === n).map((g) => g.name);
    expect(at("t1")).toEqual(["a1", "a2", "a3", "c3"]);
    expect(at("t2")).toEqual(["b1", "b2", "c1", "c2"]);
    expect(left).toBe(0);
  });

  it("avisa cuántos no cupieron", () => {
    const furniture = [table("t1", "Mesa 1", 2)];
    const guestList = ext.parseList("x\ny\nz");
    expect(ext.autoSeat({ furniture, guestList })).toBe(1);
  });

  it("respeta a los que ya tienen mesa", () => {
    const furniture = [table("t1", "Mesa 1", 2)];
    const guestList = ext.parseList("x\ny\nz");
    guestList[2].table = "t1";
    ext.autoSeat({ furniture, guestList });
    expect(guestList.filter((g) => g.table === "t1").map((g) => g.name)).toEqual(["x", "z"]);
  });
});

describe("proveedores", () => {
  it("cada proveedor del catálogo tiene su tipo con letras para el marcador", () => {
    const items = catalog.find((c) => c.cat === "Proveedores")!.items;
    expect(items.length).toBeGreaterThanOrEqual(8);
    for (const i of items) expect(ext.vendors.KINDS[i.kind!]?.letters).toBeTruthy();
  });

  it("al agregarlo se liga con sus piezas de siempre (el DJ con la cabina, no con el pastel)", () => {
    const furniture: Piece[] = [{ id: "d1", type: "dj" }, { id: "p1", type: "cake" }, { id: "l1", type: "ledscreen" }];
    const f: Piece = { id: "v1", type: "vendor", kind: "dj" };
    expect(ext.vendors.onAdd(f, ["vendor"], { furniture })).toBe(true);
    expect(f).toMatchObject({ name: "DJ", items: ["d1", "l1"] });
    expect(ext.vendors.onAdd({ id: "x", type: "rtable" }, ["rtable"], { furniture })).toBe(false);
  });

  it("teléfono para WhatsApp: los 10 dígitos de México llevan el 52; si no alcanza, nada", () => {
    expect(ext.vendors.waPhone("(668) 123-4567")).toBe("526681234567");
    expect(ext.vendors.waPhone("+52 1 668 123 4567")).toBe("5216681234567");
    expect(ext.vendors.waPhone("123")).toBe("");
  });

  it("el mensaje lleva llegada, montaje, puerta de carga, corriente, notas y quién coordina", () => {
    const v = { contact: "Beto Ruiz", arrive: "15:00", setupFrom: "15:00", setupTo: "17:00", load: "Acceso de servicio", power: 2000, notes: "Trae su planta" };
    const text = ext.vendors.message(v, { title: "Boda Ana y Luis", date: "sábado 14 de noviembre de 2026", brand: "Eventos Sol" });
    expect(text).toContain("Hola Beto, te comparto los datos de Boda Ana y Luis (sábado 14 de noviembre de 2026):");
    expect(text).toContain("• Llegada: 15:00");
    expect(text).toContain("• Montaje: 15:00 a 17:00");
    expect(text).toContain("• Carga y descarga por: Acceso de servicio");
    expect(text).toContain("• Corriente: 2,000 W");
    expect(text).toContain("• Notas: Trae su planta");
    expect(text.endsWith("— Eventos Sol")).toBe(true);
    expect(ext.vendors.message({}, { title: "XV Sofía", date: "", brand: "" })).not.toContain("Llegada");
  });

  it("se ordenan por hora de llegada y los que no tienen hora van al final", () => {
    const vs: Piece[] = [{ id: "a", type: "vendor", name: "Foto", arrive: "" }, { id: "b", type: "vendor", name: "DJ", arrive: "16:30" },
      { id: "c", type: "vendor", name: "Banquete", arrive: "12:00" }];
    expect(vs.sort(ext.vendors.byArrival).map((v) => v.id)).toEqual(["c", "b", "a"]);
  });
});
