import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/lugares", label: "Lugares" },
  { href: "/admin/piloto", label: "Piloto" },
  { href: "/admin/cuentas", label: "Cuentas" },
  { href: "/admin/codigos", label: "Códigos" },
  { href: "/admin/actividad", label: "Actividad" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/sugerencias", label: "Sugerencias" },
  { href: "/admin/rastro", label: "Rastro" },
  { href: "/admin/papelera", label: "Papelera" },
] as const;

export function AdminNav({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <header className="mb-5">
      <p className="text-sm text-stone-500">Administración de Plantea</p>
      <nav className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" aria-label="Secciones">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === current ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-medium ${t.href === current ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/eventos" className="ml-auto flex h-10 shrink-0 items-center text-sm underline">
          Mis proyectos
        </Link>
      </nav>
    </header>
  );
}
