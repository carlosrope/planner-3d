import type { Metadata } from "next";
import { Suspense } from "react";
import { getOrgBrand, requireOrg, requireUser } from "@/lib/dal";
import { BrandForm } from "./BrandForm";

export const metadata: Metadata = { title: "Mi negocio" };

export default function NegocioPage() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <h1 className="mb-5 text-2xl font-semibold">Mi negocio</h1>
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <NegocioContent />
      </Suspense>
    </main>
  );
}

async function NegocioContent() {
  const user = await requireUser();
  const org = await requireOrg(user);
  const brand = await getOrgBrand(org.id);
  if (!brand) return null;
  return <BrandForm brand={brand} />;
}
