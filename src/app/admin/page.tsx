import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminListVenues, requireAdmin } from "@/lib/dal";
import { VENUE_KIND_LABELS, VENUE_STATUS_LABELS } from "@/lib/domain";
import { AdminNav } from "./AdminNav";
import { formatInstant } from "@/lib/dates";

export const metadata: Metadata = { title: "Administración · Lugares" };

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Lugares />
      </Suspense>
    </main>
  );
}

const STATUS_STYLE: Record<string, string> = {
  conversion: "bg-amber-100 text-amber-900",
  revision: "bg-sky-100 text-sky-900",
  publicado: "bg-emerald-100 text-emerald-900",
  retirado: "bg-stone-200 text-stone-700",
};

async function Lugares() {
  await requireAdmin();
  const venues = await adminListVenues();
  return (
    <>
      <AdminNav current="/admin" />
      <h1 className="text-2xl font-semibold">Lugares</h1>
      <p className="mt-1 text-sm text-stone-500">Primero los que están en conversión; después los que esperan confirmación del dueño.</p>
      <table className="mt-4 w-full text-sm">
        <thead className="text-left text-stone-500">
          <tr>
            <th className="py-1 font-medium">Lugar</th>
            <th className="py-1 font-medium">Estado</th>
            <th className="py-1 font-medium">Dueño</th>
            <th className="py-1 font-medium">Plano</th>
            <th className="py-1 font-medium">Eventos</th>
            <th className="py-1 font-medium">Alta</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => (
            <tr key={v.id} className="border-t border-stone-200">
              <td className="py-2">
                <Link href={`/admin/lugares/${v.id}`} className="font-medium underline">
                  {v.name}
                </Link>
                <p className="text-stone-500">
                  {VENUE_KIND_LABELS[v.kind]} · {v.city}
                  {v.contactName ? ` · ${v.contactName}` : ""}
                </p>
              </td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[v.status]}`}>{VENUE_STATUS_LABELS[v.status]}</span>
                {!v.isPublic && <span className="ml-1 text-xs text-stone-500">privado</span>}
                {v.reviewNotes && <p className="mt-1 max-w-xs truncate text-xs text-amber-800">Correcciones: {v.reviewNotes}</p>}
              </td>
              <td className="py-2">{v.ownerName ?? <span className="text-stone-400">sin cuenta</span>}</td>
              <td className="py-2">{v.hasPlan ? "Sí" : <span className="text-amber-700">Falta</span>}</td>
              <td className="py-2">{v.events}</td>
              <td className="py-2 text-stone-500">{formatInstant(v.createdAt, "dayMonthShort")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
