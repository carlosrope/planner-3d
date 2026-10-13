import type { NextConfig } from "next";
import { lanHosts } from "./src/lib/lan";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Permite abrir el servidor de desarrollo desde el iPhone en la misma red Wi-Fi.
  allowedDevOrigins: lanHosts(),
  // El indicador de desarrollo tapa la barra inferior del editor en el teléfono.
  devIndicators: false,
  // Alta de lugares y comprobantes de pago: planos y fotos van en el cuerpo de la acción.
  experimental: { serverActions: { bodySizeLimit: "40mb" } },
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
