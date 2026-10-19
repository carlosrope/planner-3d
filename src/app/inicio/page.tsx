import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdmin, requireUser } from "@/lib/dal";

// A dónde llega cada quien al entrar: la administración a su panel, los demás a sus proyectos.
export default function InicioPage() {
  return (
    <Suspense fallback={null}>
      <Destino />
    </Suspense>
  );
}

async function Destino(): Promise<null> {
  const user = await requireUser("/inicio");
  redirect(isAdmin(user) ? "/admin" : "/eventos");
}
