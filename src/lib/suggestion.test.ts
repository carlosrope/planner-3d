import { describe, expect, it } from "vitest";
import { makeLimiter, suggestionEmail, suggestionSchema } from "./suggestion";

describe("sugerencias del catálogo", () => {
  it("valida y limpia lo que llega", () => {
    const s = suggestionSchema.parse({ termino: "  Brincolín ", categoria: "Inventada", uso: "fiesta infantil" });
    expect(s).toEqual({ termino: "Brincolín", categoria: "Otro", uso: "fiesta infantil", lugar: "", tipoEvento: "", pagina: "" });
    expect(suggestionSchema.safeParse({ termino: "" }).success).toBe(false);
  });
  it("arma el correo sin datos de la persona", () => {
    const m = suggestionEmail(suggestionSchema.parse({ termino: "Brincolín", categoria: "Servicio o show", tipoEvento: "Infantil o baby shower" }));
    expect(m.subject).toBe("Sugerencia para el catálogo: Brincolín");
    expect(m.text).toContain("Qué es: Servicio o show");
    expect(m.text).toContain("Tipo de evento abierto: Infantil o baby shower");
    expect(m.text).not.toContain("Para qué lo usaría");
  });
  it("limita las sugerencias por IP", () => {
    const ok = makeLimiter(2, 1000);
    expect([ok("a", 0), ok("a", 1), ok("a", 2), ok("b", 2), ok("a", 1500)]).toEqual([true, true, false, true, true]);
  });
});
