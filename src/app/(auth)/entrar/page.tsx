import type { Metadata } from "next";
import { Suspense } from "react";
import { googleEnabled } from "@/lib/google";
import { safeNextPath } from "@/lib/site";
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
  const safe = safeNextPath(next);
  // Al volver de Google sin cuenta en Plantea (Entrar no crea cuentas): se explica cómo crearla.
  // account_not_linked: el correo ya tiene cuenta con contraseña (sin correo verificado, Google no se une solo).
  const notice = typeof error === "string"
    ? error === "signup_disabled"
      ? "Ese correo de Google todavía no tiene cuenta en Plantea. Créala en «Crear una»; si te dieron un código, escríbelo ahí."
      : error === "account_not_linked"
        ? "Ese correo ya tiene cuenta en Plantea con contraseña. Entra con tu correo y tu contraseña (si no la recuerdas, usa «¿Olvidaste tu contraseña?»)."
        : "No se pudo entrar con Google. Intenta de nuevo o entra con tu correo."
    : undefined;
  return <AuthForm mode="entrar" next={safe} google={googleEnabled()} notice={notice} />;
}
