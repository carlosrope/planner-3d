import { describe, expect, it } from "vitest";
import { parseSetting, referralLink, referralMessage, serializeSetting, whatsappShare } from "./referral-message";

const info = { code: "PALMAS-7K3M", guestName: "Ana y Luis", venueName: "Salón Las Palmas", eventDate: "2026-11-21" };
const O = "https://plantea.com.mx";

describe("mensaje del código", () => {
  it("el sugerido (cercano) es el texto aprobado, sin «sin costo»", () => {
    expect(referralMessage(info, O)).toBe(`Hola, Ana y Luis 👋

Ya puedes planear tu evento en Salón Las Palmas en 3D para tu evento del 21 de noviembre: acomoda las mesas, sienta a tus invitados y compártelo con tu familia.

Tu código: PALMAS-7K3M

Crea tu cuenta aquí: https://plantea.com.mx/registro?codigo=PALMAS-7K3M`);
  });
  it("sin fecha no deja huecos", () => {
    expect(referralMessage({ ...info, eventDate: null }, O)).toContain("en Salón Las Palmas en 3D: acomoda");
    expect(referralMessage({ ...info, eventDate: null }, O, { style: "formal", body: null })).toContain("en 3D. Ahí podrá");
  });
  it("cada estilo lleva siempre el nombre, el código y el enlace", () => {
    for (const style of ["cercano", "formal", "corto"] as const) {
      const m = referralMessage(info, O, { style, body: "Te esperamos en el jardín." });
      expect(m).toContain("Ana y Luis");
      expect(m).toContain("PALMAS-7K3M");
      expect(m).toContain(referralLink(O, "PALMAS-7K3M"));
      expect(m).toContain("Te esperamos en el jardín.");
    }
  });
  it("guardar y leer", () => {
    expect(serializeSetting({ style: "cercano", body: "  " })).toBeNull();
    const raw = serializeSetting({ style: "formal", body: " Hola " });
    expect(parseSetting(raw)).toEqual({ style: "formal", body: "Hola" });
    expect(parseSetting("Hola {nombre} {codigo}")).toEqual({ style: "cercano", body: null });
    expect(parseSetting(null)).toEqual({ style: "cercano", body: null });
  });
  it("enlaces", () => {
    expect(referralLink("https://p.mx", "A B")).toBe("https://p.mx/registro?codigo=A%20B");
    expect(whatsappShare("hola mundo")).toBe("https://wa.me/?text=hola%20mundo");
  });
});
