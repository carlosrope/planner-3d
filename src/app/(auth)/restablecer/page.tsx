import type { Metadata } from "next";
import { Suspense } from "react";
import { RestablecerForm } from "./RestablecerForm";

type Search = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function RestablecerPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<RestablecerForm token={null} />}>
      <Restablecer searchParams={searchParams} />
    </Suspense>
  );
}

/** Llega desde el enlace del correo: ?token=… válido, o ?error=INVALID_TOKEN si ya venció o se usó. */
async function Restablecer({ searchParams }: { searchParams: Search }) {
  const { token } = await searchParams;
  return <RestablecerForm token={typeof token === "string" && token ? token : null} />;
}
