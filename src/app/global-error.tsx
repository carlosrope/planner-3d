"use client";

import { PaginaError } from "@/components/PaginaError";
import { dmSans, sora } from "./fonts";
import "./globals.css";

/** Cuando falla el diseño de toda la app (encabezado o pie): la misma página de error, con su propio documento. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es" className={`${sora.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <title>Algo salió mal · Plantea</title>
        <PaginaError error={error} retry={retry} />
      </body>
    </html>
  );
}
