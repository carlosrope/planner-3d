import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// public/.well-known/security.txt (RFC 9116): a quién avisar de una falla de seguridad. Su fecha de vencimiento es
// obligatoria; esta prueba falla un mes antes para acordarse de renovarla (otro año como máximo).
describe("security.txt", () => {
  const text = readFileSync("public/.well-known/security.txt", "utf8");
  const field = (name: string) => text.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];

  it("tiene contacto y la dirección canónica de plantea.com.mx", () => {
    expect(field("Contact")).toBe("mailto:hola@plantea.com.mx");
    expect(field("Canonical")).toBe("https://plantea.com.mx/.well-known/security.txt");
  });
  it("vence en menos de un año y todavía falta más de un mes", () => {
    const expires = new Date(field("Expires") ?? "");
    const days = (expires.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(30);
    expect(days).toBeLessThanOrEqual(366);
  });
});
