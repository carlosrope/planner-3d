import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { getReferralInvite } from "@/lib/dal";
import { normalizeReferralCode } from "@/lib/referrals";
import { AuthForm } from "../AuthForm";
import { formatDay } from "@/lib/dates";
import { googleEnabled } from "@/lib/google";
import { clientIp, makeLimiter } from "@/lib/suggestion";

export const metadata: Metadata = { title: "Crear cuenta" };

// Para que nadie pruebe códigos al azar: 30 consultas por hora desde la misma conexión.
const lookups = makeLimiter(30, 60 * 60 * 1000);


export default function RegistroPage({ searchParams }: PageProps<"/registro">) {
  return (
    <Suspense fallback={<AuthForm mode="registro" />}>
      <Registro searchParams={searchParams} />
    </Suspense>
  );
}


/** ?codigo=: código de referido de un salón o una planner; se valida y se llena solo. */
async function Registro({ searchParams }: { searchParams: PageProps<"/registro">["searchParams"] }) {
  const { codigo, error } = await searchParams;
  const google = googleEnabled();
  const googleError =
    error === "account_not_linked"
      ? "Ese correo ya tiene cuenta en Plantea. Entra con tu correo y tu contraseña."
      : typeof error === "string"
        ? "No se pudo crear tu cuenta con Google. Revisa tu código o crea la cuenta con tu correo."
        : undefined;
  const code = typeof codigo === "string" ? normalizeReferralCode(codigo) : null;
  const limited = code ? !lookups(clientIp(await headers())) : false;
  const ref = code && !limited ? await getReferralInvite(String(codigo)) : null;
  if (limited) {
    return <AuthForm mode="registro" google={google} notice="Probaste muchos códigos seguidos. Espera una hora o pídele el enlace a tu salón." />;
  }
  if (!ref) {
    return (
      <AuthForm
        mode="registro"
       
        google={google}
        notice={googleError ?? (code ? "Ese código ya se usó o ya no es válido. Pídele otro a quien te lo dio." : undefined)}
      />
    );
  }
  const slug = ref.venue.slug ?? ref.venue.id;
  return (
    <AuthForm
      mode="registro"
      inviteValue={ref.code}
      google={google}
      notice={`${googleError ? `${googleError} ` : ""}Código de ${ref.issuer.name} para ${ref.guestName}: tu evento en ${ref.venue.name}${ref.eventDate ? ` el ${formatDay(ref.eventDate, "dayMonth")}` : ""} en 3D, sin costo. Crea tu cuenta y arma tu plano.`}
      next={`/eventos?lugar=${encodeURIComponent(slug)}`}
    />
  );
}
