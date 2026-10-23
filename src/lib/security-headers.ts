/**
 * Cabeceras de seguridad (next.config.ts). Puro, sin Next: cubierto por security-headers.test.ts.
 *
 * - CSP básica: todo de la propia app (three.js también: public/vendor/three-0.160.0) y Cloudflare Web Analytics
 *   (visitas sin cookies: el script de static.cloudflareinsights.com y su envío a cloudflareinsights.com).
 *   En las páginas de Next queda 'unsafe-inline' en scripts: Next mete en línea los datos de React de cada visita y
 *   solo les pone nonce si la página se genera entera en cada visita (sin el prerender parcial que la hace rápida).
 *   El diseñador (disenador.html, que arma Plantea completo) no lo necesita: designerResponse le pone un nonce nuevo a
 *   cada <script> y manda su propia CSP con ese nonce, así que ahí solo corre lo que puso Plantea. 'unsafe-eval' solo
 *   en desarrollo (lo pide Next para recargar en caliente).
 * - X-Frame-Options SAMEORIGIN en toda la app (la portada automática abre el 3D en un iframe propio), salvo el
 *   enlace de solo vista /v/… y el 3D público /lugares/…/3d, que un salón puede incrustar en su página.
 */
type Header = { key: string; value: string };

/** Con `nonce`, los scripts en línea solo corren si traen ese nonce (diseñador); sin él, 'unsafe-inline' (Next). */
export function contentSecurityPolicy({ dev, embeddable, nonce }: { dev: boolean; embeddable: boolean; nonce?: string }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", nonce ? `'nonce-${nonce}'` : "'unsafe-inline'", "https://static.cloudflareinsights.com", ...(dev ? ["'unsafe-eval'"] : [])],
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

/** Rutas del diseñador que se pueden incrustar en otra página (iframe): enlace de solo vista y 3D público del lugar. */
export const EMBEDDABLE_SOURCES = ["/v/:path*", "/lugares/:slug/3d"];
/** Rutas del diseñador que no se incrustan: la demo y el evento de una cuenta. */
export const DESIGNER_SOURCES = ["/disenador/:path*", "/eventos/:id"];

/**
 * Las páginas de Next llevan aquí su CSP. Las del diseñador (incrustables o no) reciben la suya, con nonce, de
 * designerResponse; aquí solo llevan lo demás, para que el navegador no tenga dos políticas que cumplir.
 */
export function securityHeaders(dev: boolean) {
  return [
    {
      // Todo menos las rutas del diseñador (lookahead negativo de path-to-regexp).
      source: "/((?!v/|lugares/[^/]+/3d(?:$|\\?)|disenador/|eventos/[^/]+(?:$|\\?)).*)",
      headers: [...common(dev), { key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev, embeddable: false }) }],
    },
    ...DESIGNER_SOURCES.map((source) => ({ source, headers: [...common(dev), { key: "X-Frame-Options", value: "SAMEORIGIN" }] })),
    ...EMBEDDABLE_SOURCES.map((source) => ({ source, headers: common(dev) })),
  ];
}
