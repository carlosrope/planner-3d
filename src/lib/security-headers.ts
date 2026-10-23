/**
 * Cabeceras de seguridad (next.config.ts). Puro, sin Next: cubierto por security-headers.test.ts.
 *
 * - CSP básica: todo de la propia app (three.js también: public/vendor/three-0.160.0) y Cloudflare Web Analytics
 *   (visitas sin cookies: el script de static.cloudflareinsights.com y su envío a cloudflareinsights.com).
 *   'unsafe-inline' en scripts porque el diseñador lleva sus datos en <script> en línea; 'unsafe-eval' solo en
 *   desarrollo (lo pide Next para recargar en caliente).
 * - X-Frame-Options SAMEORIGIN en toda la app (la portada automática abre el 3D en un iframe propio), salvo el
 *   enlace de solo vista /v/… y el 3D público /lugares/…/3d, que un salón puede incrustar en su página.
 */
type Header = { key: string; value: string };

export function contentSecurityPolicy({ dev, embeddable }: { dev: boolean; embeddable: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https://cloudflareinsights.com", ...(dev ? ["ws:", "wss:"] : [])],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": embeddable ? ["*"] : ["'self'"],
  };
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

const common = (dev: boolean): Header[] => [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

/** Rutas que se pueden incrustar en otra página (iframe): enlace de solo vista y 3D público del lugar. */
export const EMBEDDABLE_SOURCES = ["/v/:path*", "/lugares/:slug/3d"];

export function securityHeaders(dev: boolean) {
  return [
    {
      // Todo menos las rutas incrustables (lookahead negativo de path-to-regexp).
      source: "/((?!v/|lugares/[^/]+/3d(?:$|\\?)).*)",
      headers: [...common(dev), { key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev, embeddable: false }) }],
    },
    ...EMBEDDABLE_SOURCES.map((source) => ({
      source,
      headers: [...common(dev), { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev, embeddable: true }) }],
    })),
  ];
}
