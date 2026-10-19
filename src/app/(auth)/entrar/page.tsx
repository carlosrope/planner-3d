import type { Metadata } from "next";
import { Suspense } from "react";
import { googleEnabled } from "@/lib/google";
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
  const { next, error } = await searchParams;
  const safe = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  // Al volver de Google sin cuenta en Plantea (Entrar no crea cuentas): se explica cómo crearla.
  const notice = typeof error === "string"
    ? error === "signup_disabled"
      ? "Ese correo de Google todavía no tiene cuenta en Plantea. Créala en «Crear una» con el código que te dieron."
      : "No se pudo entrar con Google. Intenta de nuevo o entra con tu correo."
    : undefined;
  return <AuthForm mode="entrar" next={safe} google={googleEnabled()} notice={notice} />;
}
