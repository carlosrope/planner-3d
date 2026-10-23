import type { NextConfig } from "next";
import { lanHosts } from "./src/lib/lan";
import { securityHeaders } from "./src/lib/security-headers";
import { LEGACY_HOST, SITE_URL } from "./src/lib/site";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Sin «x-powered-by: Next.js»: no hace falta anunciar con qué está hecha la app.
  poweredByHeader: false,
  // Las pruebas de punta a punta (Playwright) levantan su propio servidor sin pisar el de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  partialPrefetching: true,
  // Permite abrir el servidor de desarrollo desde el iPhone en la misma red Wi-Fi.
  allowedDevOrigins: lanHosts(),
  // El indicador de desarrollo tapa la barra inferior del editor en el teléfono.
  devIndicators: false,
  // Alta de lugares y comprobantes de pago: planos y fotos van en el cuerpo de la acción.
  experimental: { serverActions: { bodySizeLimit: "40mb" } },
  // CSP, X-Frame-Options (salvo /v/ y el 3D público), Referrer-Policy y demás: src/lib/security-headers.ts.
  async headers() {
    return [
      ...securityHeaders(process.env.NODE_ENV !== "production"),
      // three.js propio (public/vendor/three-0.160.0): la versión va en la ruta y nunca cambia, así que el navegador y
      // Cloudflare lo guardan un año (Next sirve public/ con max-age=0).
      { source: "/vendor/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Fuera de buscadores: cuentas, paneles y enlaces privados (el enlace /v/ y la revisión del dueño).
      ...["/v/:path*", "/revisar/:path*", "/admin/:path*", "/eventos/:path*", "/negocio/:path*", "/lugares/:slug/panel", "/olvide", "/restablecer"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
  // La dirección vieja de Railway pasa a plantea.com.mx con la misma ruta (los enlaces y QR que circulan siguen
  // sirviendo y Google no ve dos sitios iguales). También la API (desde el 22 oct): por esa dirección se llegaba sin
  // pasar por Cloudflare y se podía inventar la IP de los límites de intentos. Las páginas ya se iban a plantea.com.mx
  // desde el 15 oct, así que ya nadie tiene sesión abierta allá.
  async redirects() {
    return [
      {
        source: "/:path(.*)",
        has: [{ type: "host", value: LEGACY_HOST }],
        destination: `${SITE_URL}/:path`,
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
