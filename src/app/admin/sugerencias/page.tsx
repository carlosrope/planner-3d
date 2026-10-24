import type { Metadata } from "next";
import { Suspense } from "react";
import { adminListSuggestions, requireAdmin } from "@/lib/dal";
import { formatInstant } from "@/lib/dates";
import { AdminNav } from "../AdminNav";
import { markSuggestion } from "../actions";
import { EsqueletoLista } from "@/components/Esqueleto";

export const metadata: Metadata = { title: "Administración · Sugerencias" };

export default function AdminSugerenciasPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<EsqueletoLista />}>
        <Sugerencias />
      </Suspense>
    </main>
  );
}

async function Sugerencias() {
  await requireAdmin();
  const rows = await adminListSuggestions();
  const pending = rows.filter((r) => !r.doneAt).length;
  return (
    <>
      <AdminNav current="/admin/sugerencias" />
      <h1 className="text-2xl font-semibold">Sugerencias del catálogo</h1>
      <p className="mt-1 text-sm text-stone-500">
        Lo que alguien buscó en el catálogo del diseñador y no encontró. No se piden datos de la persona. {pending} por revisar. Horas de Los Mochis.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 text-stone-500">Todavía no hay sugerencias.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className={`rounded-2xl border p-4 ${r.doneAt ? "border-stone-200 bg-stone-50" : "border-amber-200 bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.term}</p>
                  <p className="text-sm text-stone-600">
                    {r.category}
                    {r.use ? ` · para ${r.use.toLowerCase()}` : ""}
                    {r.eventKind ? ` · evento: ${r.eventKind}` : ""}
                    {r.venue ? ` · ${r.venue}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatInstant(r.createdAt, "dateTime")} ·{" "}
                    {r.emailed ? <span className="text-emerald-700">correo enviado</span> : <span className="text-red-700">correo no enviado{r.emailError ? ` (${r.emailError})` : ""}</span>}
                    {r.doneAt ? ` · agregada el ${formatInstant(r.doneAt)}` : ""}
                  </p>
                </div>
                <form action={markSuggestion}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="done" value={r.doneAt ? "0" : "1"} />
                  <button className={`h-9 rounded-lg px-3 text-sm font-medium ${r.doneAt ? "border border-stone-300 bg-white" : "bg-emerald-700 text-white"}`}>
                    {r.doneAt ? "Regresar a pendiente" : "Ya la agregué"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
