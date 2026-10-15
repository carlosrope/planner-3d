import type { Metadata } from "next";
import { OlvideForm } from "./OlvideForm";

export const metadata: Metadata = { title: "Olvidé mi contraseña" };

export default function OlvidePage() {
  return <OlvideForm />;
}
