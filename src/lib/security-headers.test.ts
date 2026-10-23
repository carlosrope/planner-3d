import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

describe("cabeceras de seguridad", () => {
  it("la CSP solo deja scripts de la propia app (three.js incluido) y pide unsafe-eval solo en desarrollo", () => {
    const prod = contentSecurityPolicy({ dev: false, embeddable: false });
    expect(prod).toContain("script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com;");
    expect(prod).not.toContain("jsdelivr");
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).toContain("frame-ancestors 'self'");
    expect(contentSecurityPolicy({ dev: true, embeddable: false })).toContain("'unsafe-eval'");
  });
  it("el enlace de solo vista y el 3D público se pueden incrustar", () => {
    const rules = securityHeaders(false);
    const embed = rules.filter((r) => r.source.startsWith("/v/") || r.source.endsWith("/3d"));
    expect(embed).toHaveLength(2);
    for (const r of embed) expect(r.headers.find((h) => h.key === "X-Frame-Options")).toBeUndefined();
    expect(contentSecurityPolicy({ dev: false, embeddable: true, nonce: "abc" })).toContain("frame-ancestors *");
  });
  it("las rutas del diseñador no reciben aquí la CSP: la suya, con nonce, la pone designerResponse", () => {
    const designer = securityHeaders(false).slice(1);
    expect(designer.map((r) => r.source).sort()).toEqual(["/disenador/:path*", "/eventos/:id", "/lugares/:slug/3d", "/v/:path*"]);
    for (const r of designer) expect(r.headers.find((h) => h.key === "Content-Security-Policy")).toBeUndefined();
  });
  it("con nonce, los scripts en línea solo corren si lo traen (sin unsafe-inline)", () => {
    const csp = contentSecurityPolicy({ dev: false, embeddable: false, nonce: "N0nce+/=" });
    expect(csp).toContain("script-src 'self' 'nonce-N0nce+/=' https://static.cloudflareinsights.com;");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'self'");
  });
  it("el resto lleva X-Frame-Options y excluye las rutas del diseñador", () => {
    const [all] = securityHeaders(false);
    expect(all.headers.find((h) => h.key === "X-Frame-Options")?.value).toBe("SAMEORIGIN");
    const re = new RegExp(`^${all.source.replace("/((?!", "/(?!").replace(").*)", ").*")}$`);
    expect(re.test("/eventos")).toBe(true);
    expect(re.test("/lugares/palmas")).toBe(true);
    expect(re.test("/v/abc123")).toBe(false);
    expect(re.test("/lugares/palmas/3d")).toBe(false);
    expect(re.test("/disenador/salon-demo")).toBe(false);
    expect(re.test("/eventos/abc123")).toBe(false);
  });

  it("la CSP deja cargar Cloudflare Web Analytics y mandar sus visitas", () => {
    const prod = contentSecurityPolicy({ dev: false, embeddable: false });
    expect(prod).toMatch(/script-src [^;]*https:\/\/static\.cloudflareinsights\.com/);
    expect(prod).toMatch(/connect-src [^;]*https:\/\/cloudflareinsights\.com/);
  });
});
