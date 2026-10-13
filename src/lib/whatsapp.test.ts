import { describe, expect, it } from "vitest";
import { formatWhatsapp, normalizeWhatsapp, waLink } from "./whatsapp";

describe("números de WhatsApp", () => {
  it("normaliza números de México y respeta los que ya traen lada", () => {
    expect(normalizeWhatsapp("668 130 5828")).toBe("526681305828");
    expect(normalizeWhatsapp("+52 1 668 130 5828")).toBe("5216681305828");
    expect(normalizeWhatsapp("")).toBeNull();
    expect(normalizeWhatsapp("12345")).toBeUndefined();
  });

  it("arma el enlace y el formato para mostrar", () => {
    expect(waLink("526681305828", "Hola, ¿qué tal?")).toBe("https://wa.me/526681305828?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F");
    expect(formatWhatsapp("526681305828")).toBe("668 130 5828");
    expect(formatWhatsapp("5216681305828")).toBe("5216681305828");
  });
});
