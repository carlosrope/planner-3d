import type { NextConfig } from "next";
import { lanHosts } from "./src/lib/lan";
import { securityHeaders } from "./src/lib/security-headers";
import { LEGACY_HOST, SITE_URL } from "./src/lib/site";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
      // Fuera de buscadores: cuentas, paneles y enlaces privados (el enlace /v/ y la revisión del dueño).
      ...["/v/:path*", "/revisar/:path*", "/admin/:path*", "/eventos/:path*", "/negocio/:path*", "/lugares/:slug/panel", "/olvide", "/restablecer"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
  // La dirección vieja de Railway pasa a plantea.com.mx con la misma ruta (los enlaces y QR que circulan siguen
  // sirviendo y Google no ve dos sitios iguales). La API se queda para no cortar sesiones abiertas.
  async redirects() {
    return [
      {
        source: "/:path((?!api/).*)",
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
