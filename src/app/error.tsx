"use client";

import { PaginaError } from "@/components/PaginaError";

/** Una página que falla: se queda el encabezado y el pie de siempre, con la marca y salidas claras (PaginaError). */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return <PaginaError error={error} retry={retry} />;
}
