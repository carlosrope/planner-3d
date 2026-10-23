"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PAY_PLAN, PERSONAL_PROFILE, PROFILES, type Profile } from "@/lib/plans";

const PROFILE_LIST: Profile[] = [...PROFILES.filter((p) => p.id === "salon"), ...PROFILES.filter((p) => p.id !== "salon"), PERSONAL_PROFILE];

/**
 * Cuenta sin plan: el botón para crear un proyecto abre la ventana de planes, dividida por perfil (salón, planner,
 * casas o fiesta propia), con el precio y el paso que le toca a cada uno. `openAtStart`: se abre sola (por ejemplo,
 * al llegar desde "Planear mi evento aquí" del catálogo).
 */
export function PlanChooser({ openAtStart = false, label = "Crear proyecto" }: { openAtStart?: boolean; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState(PROFILE_LIST[0].id);
  useEffect(() => {
    const dialog = ref.current;
    if (openAtStart) dialog?.showModal();
    // Next guarda la página anterior oculta al navegar: si la ventana se quedara abierta, dejaría toda la página sin
    // poder tocarse. Se cierra al salir de la página.
    return () => dialog?.close();
  }, [openAtStart]);
  const profile = PROFILE_LIST.find((p) => p.id === tab) ?? PROFILE_LIST[0];
  const pay = `/negocio?plan=${PAY_PLAN[profile.id] ?? "eventos"}#pagar`;

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="h-12 w-full rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700"
      >
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="planesTitulo"
        className="m-auto w-[min(560px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-3xl bg-[#f7f4ef] p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/50"
        onClick={(e) => {
          // Clic fuera de la ventana, o en cualquier enlace de adentro (la ventana se cierra antes de cambiar de página).
          if (e.target === ref.current || (e.target as HTMLElement).closest("a")) ref.current?.close();
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="planesTitulo" className="text-xl font-semibold">
                Elige tu plan
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Con tu cuenta ya puedes ver el catálogo y las demos. Para crear tus propios proyectos, elige el plan de tu perfil. Precios al mes,
                con IVA incluido.
              </p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg text-stone-600 active:bg-stone-100"
            >
              ×
            </button>
          </div>

          <div role="tablist" aria-label="Tu perfil" className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {PROFILE_LIST.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === tab}
                onClick={() => setTab(p.id)}
                className={`rounded-xl px-2 py-2.5 text-[13px] font-medium leading-tight ${
                  p.id === tab ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-800 active:bg-stone-100"
                }`}
              >
                {p.tab}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="mt-4 space-y-3">
            {profile.plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border bg-white p-4 ${plan.featured ? "border-[#b5653a]" : "border-stone-200"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{plan.name}</p>
                  <p>
                    <span className="text-2xl font-semibold">{plan.price}</span> <span className="text-sm text-stone-500">al mes</span>
                  </p>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {plan.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span aria-hidden="true" className="text-[#a4552d]">
                        ✓
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {profile.details[0] && <p className="text-sm text-stone-600">{profile.details[0]}</p>}
          </div>

          <div className="mt-5 grid gap-2">
            {profile.id === "salon" ? (
              <>
                <Link href="/alta" className="flex h-12 items-center justify-center rounded-xl bg-[#a4552d] font-medium text-white active:bg-[#9c5430]">
                  Registrar mi salón
                </Link>
                <p className="text-center text-xs text-stone-500">Mandas tu plano, en 7 días lo tienes en 3D y lo revisas antes de pagar.</p>
              </>
            ) : (
              <Link href={pay} className="flex h-12 items-center justify-center rounded-xl bg-[#a4552d] font-medium text-white active:bg-[#9c5430]">
                Activar mi plan
              </Link>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/disenador/salon-demo" className="underline">
              Probar la demo
            </Link>
            <Link href="/salones" className="underline">
              Ver el catálogo
            </Link>
            <Link href="/planes" className="underline">
              Todos los planes
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
