import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return <AuthForm mode="registro" />;
}
