import { describe, expect, it } from "vitest";
import { safeNextPath } from "./site";

describe("a dónde volver después de entrar", () => {
  it("acepta rutas de la propia app", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/eventos?lugar=salon-demo")).toBe("/eventos?lugar=salon-demo");
  });

  it("descarta todo lo que lleva a otro sitio", () => {
    for (const bad of ["//evil.example", "/\\evil.example", "/\\/evil.example", "https://evil.example", "javascript:alert(1)", "/\t/evil.example", " /admin", "admin", "", undefined, ["/admin"]]) {
      expect(safeNextPath(bad)).toBeUndefined();
    }
  });
});
