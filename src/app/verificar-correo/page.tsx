import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdmin, isAdminEmail, requireUser } from "@/lib/dal";
import { googleEnabled } from "@/lib/google";
import { VerifyEmailForm } from "./VerifyEmailForm";

export const metadata: Metadata = { title: "Confirma tu correo" };

/** La administración solo abre con el correo verificado: aquí se pide el enlace (o se entra con Google). */
export default function VerificarCorreoPage() {
  return (
    <Suspense fallback={null}>
      <Verificar />
    </Suspense>
  );
}

async function Verificar() {
  const user = await requireUser("/verificar-correo");
  if (isAdmin(user)) redirect("/admin");
  if (!isAdminEmail(user)) redirect("/eventos");
  return <VerifyEmailForm email={user.email} google={googleEnabled()} />;
}
