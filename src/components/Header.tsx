import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, isAdmin, requireOrg } from "@/lib/dal";
import { isOwnerKind } from "@/lib/domain";
import { SignOutButton } from "@/app/eventos/SignOutButton";

// Encabezado de toda la app: el logo (La mesa + Plantea) y el menú. Sin sesión: Salones · Casas ·
// Registra tu lugar · Entrar. Con sesión: Proyectos · Mis lugares (salones y desarrolladoras) ·
// Mi negocio · Salir; la administración: Panel · Proyectos · Salir. La sesión se lee dentro de <Suspense> (Cache Components).

/** La sesión del encabezado nunca tumba la página: si la base no responde, se muestra "Entrar". */
async function sessionUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

const link = "rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900";
const cta = "rounded-xl bg-[#b5653a] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#a4552d]";
const panel = "rounded-xl bg-stone-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-stone-700";

export function Logo({ className = "h-7" }: { className?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Plantea, inicio">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo en SVG, sin optimizar */}
      <img src="/marca/plantea-horizontal-color.svg" alt="Plantea" className={`${className} w-auto`} />
    </Link>
  );
}

function PublicLinks({ className = "" }: { className?: string }) {
  return (
    <>
      <Link href="/salones" className={`${link} ${className}`}>
        Salones
      </Link>
      <Link href="/casas" className={`${link} ${className}`}>
        Casas
      </Link>
      <Link href="/planes" className={`${link} ${className}`}>
        Planes
      </Link>
      <Link href="/alta" className={`${link} ${className}`}>
        Registra tu lugar
      </Link>
    </>
  );
}

async function SessionLinks() {
  const user = await sessionUser();
  if (!user) {
    return (
      <Link href="/entrar" className={cta}>
        Entrar
      </Link>
    );
  }
  if (isAdmin(user)) {
    return (
      <>
        <Link href="/admin" className={panel}>
          Panel
        </Link>
        <Link href="/eventos" className={link}>
          Proyectos
        </Link>
        <SignOutButton />
      </>
    );
  }
  const org = await requireOrg(user);
  return (
    <>
      <Link href="/eventos" className={link}>
        Proyectos
      </Link>
      {isOwnerKind(org.kind) && (
        <Link href="/lugares" className={link}>
          Mis lugares
        </Link>
      )}
      <Link href="/negocio" className={link}>
        Mi negocio
      </Link>
      <SignOutButton />
    </>
  );
}

async function MobileSessionLinks() {
  const user = await sessionUser();
  if (!user) {
    return (
      <Link href="/entrar" className={`${cta} block text-center`}>
        Entrar
      </Link>
    );
  }
  if (isAdmin(user)) {
    return (
      <>
        <Link href="/admin" className={`${panel} block text-center`}>
          Panel
        </Link>
        <Link href="/eventos" className={`${link} block`}>
          Proyectos
        </Link>
        <div className="px-3 pt-1">
          <SignOutButton />
        </div>
      </>
    );
  }
  const org = await requireOrg(user);
  return (
    <>
      <Link href="/eventos" className={`${link} block`}>
        Proyectos
      </Link>
      {isOwnerKind(org.kind) && (
        <Link href="/lugares" className={`${link} block`}>
          Mis lugares
        </Link>
      )}
      <Link href="/negocio" className={`${link} block`}>
        Mi negocio
      </Link>
      <div className="px-3 pt-1">
        <SignOutButton />
      </div>
    </>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f4ef]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          <PublicLinks />
          <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden="true" />
          <Suspense fallback={<span className={`${link} opacity-0`}>Entrar</span>}>
            <SessionLinks />
          </Suspense>
        </nav>
        {/* Celular: menú desplegable sin JavaScript */}
        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-stone-300 bg-white [&::-webkit-details-marker]:hidden" aria-label="Abrir menú">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" className="group-open:hidden" />
              <path d="M6 6l12 12M18 6L6 18" className="hidden group-open:block" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-64 space-y-1 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
            <PublicLinks className="block" />
            <div className="my-1 h-px bg-stone-100" aria-hidden="true" />
            <Suspense fallback={null}>
              <MobileSessionLinks />
            </Suspense>
          </div>
        </details>
      </div>
    </header>
  );
}
