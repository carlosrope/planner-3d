import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  // En el dominio de prueba (SIGNUP_CODE definido) solo se registra quien tenga el código.
  return <AuthForm mode="registro" inviteRequired={Boolean(process.env.SIGNUP_CODE)} />;
}
