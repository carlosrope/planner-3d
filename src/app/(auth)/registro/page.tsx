import type { Metadata } from "next";
import { Suspense } from "react";
import { getReferralInvite } from "@/lib/dal";
import { normalizeReferralCode } from "@/lib/referrals";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Crear cuenta" };

// En el dominio de prueba (SIGNUP_CODE definido) solo se registra quien tenga el código.
const inviteRequired = Boolean(process.env.SIGNUP_CODE || process.env.SIGNUP_CODES);

export default function RegistroPage({ searchParams }: PageProps<"/registro">) {
  return (
    <Suspense fallback={<AuthForm mode="registro" inviteRequired={inviteRequired} />}>
      <Registro searchParams={searchParams} />
    </Suspense>
  );
}

const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });

/** ?codigo=: código de referido de un salón o una planner; se valida y se llena solo. */
async function Registro({ searchParams }: { searchParams: PageProps<"/registro">["searchParams"] }) {
  const { codigo } = await searchParams;
  const code = typeof codigo === "string" ? normalizeReferralCode(codigo) : null;
  const ref = code ? await getReferralInvite(code) : null;
  if (!ref) {
    return (
      <AuthForm
        mode="registro"
        inviteRequired={inviteRequired}
        notice={code ? "Ese código ya se usó o ya no es válido. Pídele otro a quien te lo dio." : undefined}
      />
    );
  }
  const slug = ref.venue.slug ?? ref.venue.id;
  return (
    <AuthForm
      mode="registro"
      inviteRequired
      inviteValue={ref.code}
      notice={`Código de ${ref.issuer.name} para ${ref.guestName}: tu evento en ${ref.venue.name}${ref.eventDate ? ` el ${fecha.format(new Date(ref.eventDate))}` : ""} en 3D, sin costo. Crea tu cuenta y arma tu plano.`}
      next={`/eventos?lugar=${encodeURIComponent(slug)}`}
    />
  );
}
