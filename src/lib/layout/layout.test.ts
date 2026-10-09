import { describe, expect, it } from "vitest";
import { analyzeLayout, layoutStats } from "./analysis";
import { demoLayout, DEMO_VENUE_SPEC, stressLayout } from "./demo";
import { chairsLocal, closestPoints, pointInPolygon, rectPolygon } from "./geometry";
import { layoutDocSchema } from "./schema";
import { autoNumber, createObject, fillArea, sequentialIds } from "./tools";
import { emptyLayout, type PlacedObject } from "./types";

const ids = sequentialIds("t");
const table = (x: number, z: number, catalogId = "mesa-redonda-180"): PlacedObject =>
  createObject(catalogId, { x, z }, [], ids);

describe("geometría", () => {
  it("acomoda las sillas según el tipo de mesa", () => {
    expect(chairsLocal(table(0, 0))).toHaveLength(10);
    const imperial = chairsLocal(table(0, 0, "mesa-imperial"));
    expect(imperial.filter((c) => c.z < 0)).toHaveLength(4);
    expect(imperial.filter((c) => c.z > 0)).toHaveLength(4);
    expect(chairsLocal(table(0, 0, "mesa-novios")).every((c) => c.z < 0)).toBe(true);
  });

  it("mide la distancia entre polígonos y detecta encimados", () => {
    const a = rectPolygon(0, 0, 2, 2, 0);
    expect(closestPoints(a, rectPolygon(4, 0, 2, 2, 0)).dist).toBeCloseTo(2);
    expect(closestPoints(a, rectPolygon(1, 0, 2, 2, 45)).overlap).toBe(true);
    expect(closestPoints(a, rectPolygon(0, 0, 0.5, 0.5, 0)).overlap).toBe(true);
  });

  it("respeta la esquina recortada del salón", () => {
    expect(pointInPolygon({ x: 1, z: 44 }, DEMO_VENUE_SPEC.floor)).toBe(false);
    expect(pointInPolygon({ x: 15, z: 22 }, DEMO_VENUE_SPEC.floor)).toBe(true);
  });
});

describe("validaciones", () => {
  it("marca mesas encimadas y pasillos angostos", () => {
    const doc = emptyLayout();
    doc.objects = [table(10, 10), table(10.5, 10), table(13.9, 10)];
    const issues = analyzeLayout(doc, DEMO_VENUE_SPEC);
    expect(issues.some((i) => i.id.startsWith("encima:"))).toBe(true);
    expect(issues.some((i) => i.id.startsWith("pasillo:"))).toBe(true);
  });

  it("marca objetos fuera del salón y frente a salidas", () => {
    const doc = emptyLayout();
    doc.objects = [table(-3, 10), table(1.6, 20)];
    const ids = analyzeLayout(doc, DEMO_VENUE_SPEC).map((i) => i.id.split(":")[0]);
    expect(ids).toContain("fuera");
    expect(ids).toContain("acceso");
  });
});

describe("herramientas", () => {
  it("numera en zigzag por filas", () => {
    const row = autoNumber([table(8, 5), table(2, 5), table(5, 5), table(2, 10), table(8, 10)]);
    const label = (x: number, z: number) => row.find((o) => o.x === x && o.z === z)?.label;
    expect([label(2, 5), label(5, 5), label(8, 5)]).toEqual(["1", "2", "3"]);
    expect([label(8, 10), label(2, 10)]).toEqual(["4", "5"]);
  });

  it("llena el salón sin pasillos angostos ni choques", () => {
    const doc = emptyLayout();
    doc.objects = fillArea(doc, DEMO_VENUE_SPEC, "mesa-redonda-180", { aisle: 1.2 });
    expect(doc.objects.length).toBeGreaterThan(30);
    expect(analyzeLayout(doc, DEMO_VENUE_SPEC)).toEqual([]);
  });

  it("arma el montaje de demostración sin errores", () => {
    const doc = demoLayout();
    const stats = layoutStats(doc);
    expect(stats.tables).toBe(25); // 24 mesas + mesa de novios
    expect(stats.seats).toBe(242);
    expect(analyzeLayout(doc, DEMO_VENUE_SPEC)).toEqual([]);
    expect(layoutDocSchema.safeParse(doc).success).toBe(true);
  });

  it("genera la prueba de rendimiento de 60 mesas", () => {
    const stats = layoutStats(stressLayout());
    expect(stats.tables).toBe(60);
    expect(stats.seats).toBe(600);
  });
});
