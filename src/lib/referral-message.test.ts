import { describe, expect, it } from "vitest";
import { DEFAULT_REFERRAL_TEMPLATE, referralLink, referralMessage, templateWarnings, whatsappShare } from "./referral-message";

const info = { code: "PALMAS-7K3M", guestName: "Ana y Luis", venueName: "Salón Las Palmas", eventDate: "2026-11-21" };

describe("mensaje del código", () => {
  it("el sugerido es el texto aprobado, sin «sin costo»", () => {
    const m = referralMessage(info, "https://plantea.com.mx");
    expect(m).toBe(`Hola, Ana y Luis 👋

Ya puedes planear tu evento en Salón Las Palmas en 3D para tu evento del 21 de noviembre: acomoda las mesas, sienta a tus invitados y compártelo con tu familia.

Tu código: PALMAS-7K3M

Crea tu cuenta aquí: https://plantea.com.mx/registro?codigo=PALMAS-7K3M`);
    expect(m).not.toContain("sin costo");
  });
  it("sin fecha quita la frase de la fecha", () => {
    const m = referralMessage({ ...info, eventDate: null }, "https://p.mx");
    expect(m).toContain("en Salón Las Palmas en 3D: acomoda");
    expect(m).not.toContain("{fecha}");
  });
  it("usa el mensaje propio del negocio", () => {
    expect(referralMessage(info, "https://p.mx", "Hola {nombre}, tu código es {codigo} → {enlace}")).toBe(
      "Hola Ana y Luis, tu código es PALMAS-7K3M → https://p.mx/registro?codigo=PALMAS-7K3M",
    );
    expect(referralMessage(info, "https://p.mx", "   ")).toContain("Ya puedes planear");
  });
  it("avisa si falta el código o el enlace", () => {
    expect(templateWarnings(DEFAULT_REFERRAL_TEMPLATE)).toEqual([]);
    expect(templateWarnings("Hola {nombre}")).toHaveLength(2);
  });
  it("enlaces", () => {
    expect(referralLink("https://p.mx", "A B")).toBe("https://p.mx/registro?codigo=A%20B");
    expect(whatsappShare("hola mundo")).toBe("https://wa.me/?text=hola%20mundo");
  });
});
