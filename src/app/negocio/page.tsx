import type { Metadata } from "next";
import { Suspense } from "react";
import { getOrgBrand, listVenues, requireOrg, requireUser } from "@/lib/dal";
import { isLitePlan, isPlan, type Plan } from "@/lib/domain";
import { BrandForm } from "./BrandForm";
import { PlanSection } from "./PlanSection";
import { ReferralSection } from "./ReferralSection";

export const metadata: Metadata = { title: "Mi negocio" };

export default function NegocioPage({ searchParams }: PageProps<"/negocio">) {
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <h1 className="mb-5 text-2xl font-semibold">Mi negocio</h1>
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <NegocioContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NegocioContent({ searchParams }: { searchParams: PageProps<"/negocio">["searchParams"] }) {
  const user = await requireUser("/negocio");
  // ?plan=: el plan que eligió en la ventana de planes; el formulario de pago lo trae seleccionado.
  const { plan, pago } = await searchParams;
  const wanted: Plan | undefined = isPlan(plan) ? plan : undefined;
  const org = await requireOrg(user);
  const brand = await getOrgBrand(org.id);
  if (!brand) return null;
  // Personal y Con código no llevan logo (el enlace va sin marca o con la del salón) ni reparten códigos.
  const lite = isLitePlan(org.plan) || org.plan === "libre";
  // Los códigos son para quienes rentan un salón: solo salones.
  const venues = lite ? [] : (await listVenues(org.id)).filter((v) => v.kind === "salon");
  return (
    <>
      {/* Primero los códigos: es lo que el dueño usa cada vez que le rentan el salón. */}
      {!lite && <ReferralSection org={org} venues={venues} />}
      <PlanSection org={org} wanted={wanted} result={typeof pago === "string" ? pago : undefined} />
      {!lite && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Tu marca</h2>
          <BrandForm brand={brand} />
        </section>
      )}
    </>
  );
}
