import { describe, expect, it } from "vitest";
import { MAX_DESCRIPTION, banquetRange, cityMeta, venueMeta } from "./seo-text";

describe("textos para buscadores", () => {
  it("ficha de un salón con su aforo en banquete, sin pasarse del largo", () => {
    const m = venueMeta({ kind: "salon", name: "Salón Jardín Real", city: "Guasave", capacity: 300, banquet: 280 });
    expect(m.title).toBe("Salón Jardín Real, salón de eventos en Guasave");
    expect(m.description).toContain("hasta 280 invitados en banquete");
    expect(m.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(venueMeta({ kind: "salon", name: "X", city: "Culiacán", capacity: 150, banquet: null }).description).toContain("aforo de 150 personas");
    const largo = venueMeta({ kind: "salon", name: "Centro de Eventos y Convenciones Hacienda Los Mezquites del Valle", city: "Mazatlán", capacity: 1200, banquet: 1200 });
    expect(largo.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(largo.description.endsWith("…")).toBe(true);
  });

  it("ficha de una casa", () => {
    expect(venueMeta({ kind: "casa", name: "Casa Chardonnay", city: "Los Mochis", capacity: null, banquet: null }).title).toBe("Casa Chardonnay, casa en Los Mochis en 3D");
  });

  it("página de la ciudad: cuántos hay y el rango en banquete", () => {
    expect(banquetRange([280, null, 120, 0, 380])).toEqual({ min: 120, max: 380 });
    expect(banquetRange([null])).toBeNull();
    const c = cityMeta("salon", "Guasave", 3, { min: 120, max: 380 });
    expect(c.intro).toContain("En Guasave hay 3 salones de eventos en Plantea");
    expect(c.intro).toContain("de 120 a 380 invitados");
    expect(c.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(cityMeta("salon", "Guasave", 1, { min: 300, max: 300 }).intro).toContain("1 salón de eventos en Plantea. ");
    expect(cityMeta("salon", "Navolato", 0, null).intro).toBe("");
  });
});
