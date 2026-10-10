import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

// eventos.js es un script del navegador: se evalúa con los globales mínimos que usa.
type Guest = { id: string; name: string; group: string; diet: string; table?: string };
type Ext = {
  parseList: (text: string) => Guest[];
  autoSeat: (st: { furniture: unknown[]; guestList: Guest[] }) => number;
};
let ext: Ext;

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  g.window = g;
  g.tr = (_zh: string, _en: string, es?: string) => es ?? _en;
  g.nm = (s: string) => s;
  new Function(readFileSync(new URL("./eventos.js", import.meta.url), "utf8"))();
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
