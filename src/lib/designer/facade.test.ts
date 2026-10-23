import { describe, expect, it } from "vitest";
import { facadeFromForm } from "./facade";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("facadeFromForm", () => {
  it("guarda solo lo que se llenó y pasa los colores a minúsculas", () => {
    expect(
      facadeFromForm(
        form({
          color: "#EADFCD",
          material: "ladrillo",
          street: "auto",
          sign: "  Salón Las Palmas ",
        }),
      ),
    ).toEqual({
      color: "#eadfcd",
      material: "ladrillo",
      sign: "Salón Las Palmas",
    });
  });

  it("sin nada lleno devuelve null (el diseñador usa lo de siempre)", () => {
    expect(facadeFromForm(form({ color: "", street: "auto" }))).toBeNull();
  });

  it("rechaza valores que no existen", () => {
    expect(facadeFromForm(form({ color: "rojo" }))).toBeNull();
    expect(facadeFromForm(form({ material: "mármol" }))).toBeNull();
    expect(facadeFromForm(form({ parking: "atrás" }))).toBeNull();
  });

  it("«Otro» toma el color del selector", () => {
    expect(
      facadeFromForm(form({ color: "otro", colorOtro: "#A1B2C3" })),
    ).toEqual({ color: "#a1b2c3" });
  });

  it("acepta «-» para quitar el letrero", () => {
    expect(facadeFromForm(form({ sign: "-" }))).toEqual({ sign: "-" });
  });
});
