import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Entrar" };

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <Suspense fallback={<AuthForm mode="entrar" />}>
      <Entrar searchParams={searchParams} />
    </Suspense>
  );
}

/** ?next=/ruta: a dónde volver después de entrar (solo rutas de la propia app). */
async function Entrar({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { next } = await searchParams;
  const safe = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return <AuthForm mode="entrar" next={safe} />;
}
