import type { ReactNode } from "react";

// Esqueletos de carga: mientras llega el contenido de un <Suspense>, bloques con la forma de lo que va a aparecer y un
// brillo que los recorre (clase .hueso en globals.css), en lugar de un «Cargando…» suelto en la esquina. Ocupan la
// pantalla para que el pie no salte cuando llega el contenido. Los lectores de pantalla oyen solo el aviso.

const Hueso = ({ className = "" }: { className?: string }) => <div aria-hidden="true" className={`hueso rounded-lg ${className}`} />;

function Cargando({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" className={`min-h-svh ${className}`}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Catálogo de salones o de casas (con su título si se conoce; en una ciudad, el título también es un bloque). */
export function EsqueletoCatalogo({ title, intro }: { title?: string; intro?: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <Cargando label="Cargando el catálogo…">
        <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">Plantea</p>
        {title ? <h1 className="mt-1 text-2xl font-semibold">{title}</h1> : <Hueso className="mt-2 h-8 w-2/3" />}
        {intro ? (
          <p className="mt-2 text-stone-600">{intro}</p>
        ) : (
          <div className="mt-3 space-y-2">
            <Hueso className="h-4 w-full" />
            <Hueso className="h-4 w-3/4" />
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {["w-16", "w-24", "w-20"].map((w) => (
            <Hueso key={w} className={`h-8 rounded-full ${w}`} />
          ))}
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((n) => (
            <li key={n} className="overflow-hidden rounded-[25px] border border-stone-200 bg-white">
              <Hueso className="aspect-[4/3] w-full rounded-none" />
              <div className="p-4">
                <Hueso className="h-5 w-1/2" />
                <Hueso className="mt-2 h-4 w-1/3" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Hueso className="h-10 rounded-xl" />
                  <Hueso className="h-10 rounded-xl" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Cargando>
    </main>
  );
}

/** Ficha de un lugar: migas, nombre, foto grande, miniaturas, botones y el recuadro de «¿Cuántos caben?». */
export function EsqueletoFicha() {
  return (
    <Cargando label="Cargando el lugar…">
      <Hueso className="h-4 w-40" />
      <Hueso className="mt-3 h-8 w-2/3" />
      <Hueso className="mt-2 h-5 w-1/2" />
      <Hueso className="mt-4 aspect-[4/3] w-full rounded-[25px] sm:aspect-[16/10]" />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((n) => (
          <Hueso key={n} className="aspect-square rounded-xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((n) => (
          <Hueso key={n} className="h-12 rounded-xl" />
        ))}
      </div>
      <Hueso className="mt-8 h-40 rounded-2xl" />
    </Cargando>
  );
}

/** Páginas con lista (Proyectos, Mis lugares, panel, administración): título y renglones. */
export function EsqueletoLista({ titulo = true, filas = 4, label = "Cargando…" }: { titulo?: boolean; filas?: number; label?: string }) {
  return (
    <Cargando label={label}>
      {titulo && (
        <>
          <Hueso className="h-8 w-1/3" />
          <Hueso className="mt-2 h-4 w-1/2" />
        </>
      )}
      <div className={`space-y-3 ${titulo ? "mt-6" : ""}`}>
        {Array.from({ length: filas }, (_, n) => (
          <div key={n} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <Hueso className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Hueso className="h-4 w-2/5" />
              <Hueso className="h-3 w-3/5" />
            </div>
            <Hueso className="hidden h-9 w-24 rounded-xl sm:block" />
          </div>
        ))}
      </div>
    </Cargando>
  );
}

/** Formularios (alta de un lugar): etiquetas, campos y el botón. */
export function EsqueletoFormulario({ campos = 4 }: { campos?: number }) {
  return (
    <Cargando label="Cargando el formulario…">
      <div className="space-y-5">
        {Array.from({ length: campos }, (_, n) => (
          <div key={n}>
            <Hueso className="h-4 w-28" />
            <Hueso className="mt-2 h-12 rounded-xl" />
          </div>
        ))}
        <Hueso className="h-12 w-full rounded-xl sm:w-48" />
      </div>
    </Cargando>
  );
}
