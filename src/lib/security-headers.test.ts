import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

describe("cabeceras de seguridad", () => {
  it("la CSP permite three.js desde jsdelivr y solo pide unsafe-eval en desarrollo", () => {
    const prod = contentSecurityPolicy({ dev: false, embeddable: false });
    expect(prod).toContain("script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net");
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).toContain("frame-ancestors 'self'");
    expect(contentSecurityPolicy({ dev: true, embeddable: false })).toContain("'unsafe-eval'");
  });
  it("el enlace de solo vista y el 3D público se pueden incrustar", () => {
    const rules = securityHeaders(false);
    const embed = rules.filter((r) => r.source.startsWith("/v/") || r.source.endsWith("/3d"));
    expect(embed).toHaveLength(2);
    for (const r of embed) {
      expect(r.headers.find((h) => h.key === "X-Frame-Options")).toBeUndefined();
      expect(r.headers.find((h) => h.key === "Content-Security-Policy")?.value).toContain("frame-ancestors *");
    }
  });
  it("el resto lleva X-Frame-Options y excluye las rutas incrustables", () => {
    const [all] = securityHeaders(false);
    expect(all.headers.find((h) => h.key === "X-Frame-Options")?.value).toBe("SAMEORIGIN");
    const re = new RegExp(`^${all.source.replace("/((?!", "/(?!").replace(").*)", ").*")}$`);
    expect(re.test("/eventos")).toBe(true);
    expect(re.test("/lugares/palmas")).toBe(true);
    expect(re.test("/v/abc123")).toBe(false);
    expect(re.test("/lugares/palmas/3d")).toBe(false);
  });
});
