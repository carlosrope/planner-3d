import { describe, expect, it } from "vitest";
import { cityFromSlug, slugify, uniqueSlug } from "./slug";

describe("slugs del catálogo", () => {
  it("quita acentos, espacios y signos", () => {
    expect(slugify("Salón Las Palmas")).toBe("salon-las-palmas");
    expect(slugify("  Casa Chardonnay (modelo 2)  ")).toBe("casa-chardonnay-modelo-2");
    expect(slugify("Ñandú & Cía.")).toBe("nandu-cia");
    expect(slugify("!!!")).toBe("");
  });

  it("numera cuando el slug ya existe", () => {
    expect(uniqueSlug("Salón Real", [])).toBe("salon-real");
    expect(uniqueSlug("Salón Real", ["salon-real"])).toBe("salon-real-2");
    expect(uniqueSlug("Salón Real", ["salon-real", "salon-real-2"])).toBe("salon-real-3");
    expect(uniqueSlug("???", [])).toBe("lugar");
  });

  it("reconstruye el nombre de la ciudad para los títulos", () => {
    expect(cityFromSlug("los-mochis")).toBe("Los Mochis");
    expect(cityFromSlug("villa-de-ahome")).toBe("Villa de Ahome");
    expect(cityFromSlug("guasave")).toBe("Guasave");
    expect(cityFromSlug("san-luis-rio-colorado")).toBe("San Luis Rio Colorado");
  });
});
