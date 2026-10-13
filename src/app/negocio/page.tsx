import type { Metadata } from "next";
import { Suspense } from "react";
import { getOrgBrand, listVenues, requireOrg, requireUser } from "@/lib/dal";
import { isLitePlan } from "@/lib/domain";
import { BrandForm } from "./BrandForm";
import { PlanSection } from "./PlanSection";
import { ReferralSection } from "./ReferralSection";

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
  const user = await requireUser("/negocio");
  const org = await requireOrg(user);
  const brand = await getOrgBrand(org.id);
  if (!brand) return null;
  // Personal y Con código no llevan logo (el enlace va sin marca o con la del salón) ni reparten códigos.
  const lite = isLitePlan(org.plan);
  // Los códigos son para quienes rentan un salón: solo salones.
  const venues = lite ? [] : (await listVenues(org.id)).filter((v) => v.kind === "salon");
  return (
    <>
      {!lite && <BrandForm brand={brand} />}
      <PlanSection org={org} />
      {!lite && <ReferralSection org={org} venues={venues} />}
    </>
  );
}
