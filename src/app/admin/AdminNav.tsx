import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Lugares" },
  { href: "/admin/cuentas", label: "Cuentas" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/papelera", label: "Papelera" },
  { href: "/admin/rastro", label: "Rastro" },
] as const;

export function AdminNav({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <header className="mb-5">
      <p className="text-sm text-stone-500">Administración de Plantea</p>
      <nav className="mt-2 flex flex-wrap gap-2" aria-label="Secciones">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === current ? "page" : undefined}
            className={`flex h-10 items-center rounded-xl px-4 text-sm font-medium ${t.href === current ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/eventos" className="ml-auto flex h-10 items-center text-sm underline">
          Salir
        </Link>
      </nav>
    </header>
  );
}
