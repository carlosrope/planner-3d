import { describe, expect, it } from "vitest";
import { referralLink, referralMessage, whatsappShare } from "./referral-message";

describe("mensaje del código", () => {
  it("lleva el código, el lugar, la fecha y el enlace de registro", () => {
    const m = referralMessage({ code: "PALMAS-7K3M", guestName: "Ana y Luis", venueName: "Salón Las Palmas", eventDate: "2026-11-21" }, "https://plantea.com.mx");
    expect(m).toContain("Ana y Luis");
    expect(m).toContain("Salón Las Palmas");
    expect(m).toContain("21 de noviembre");
    expect(m).toContain("*PALMAS-7K3M*");
    expect(m).toContain("https://plantea.com.mx/registro?codigo=PALMAS-7K3M");
  });
  it("sin fecha no inventa una", () => {
    expect(referralMessage({ code: "X-1234", guestName: "Ana", venueName: "Salón", eventDate: null }, "https://p.mx")).not.toContain(" del ");
  });
  it("enlaces", () => {
    expect(referralLink("https://p.mx", "A B")).toBe("https://p.mx/registro?codigo=A%20B");
    expect(whatsappShare("hola mundo")).toBe("https://wa.me/?text=hola%20mundo");
  });
});
