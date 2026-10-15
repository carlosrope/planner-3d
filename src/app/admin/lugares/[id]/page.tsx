import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLink } from "@/components/PageLink";
import { PortadaAuto } from "@/components/PortadaAuto";
import { adminGetVenue, adminListOrgs, requireAdmin } from "@/lib/dal";
import { ORG_KIND_LABELS, VENUE_KIND_LABELS, VENUE_STATUSES, VENUE_STATUS_LABELS } from "@/lib/domain";
import { siteOrigin } from "@/lib/brand";
import { formatWhatsapp, waLink } from "@/lib/whatsapp";
import { AdminNav } from "../../AdminNav";
import { addFiles, deleteFile, trashVenue, updateVenueData, updateVenueState, uploadVenuePlan } from "../../actions";
import { CopyField } from "@/app/lugares/[slug]/panel/CopyField";

export const metadata: Metadata = { title: "Administración · Lugar" };

export default function AdminLugarPage({ params }: PageProps<"/admin/lugares/[id]">) {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
        <Lugar params={params} />
      </Suspense>
    </main>
  );
}

const field = "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-800";
const area = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-800";
const btn = "h-11 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white active:bg-stone-700";

async function Lugar({ params }: { params: PageProps<"/admin/lugares/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const [v, orgs] = await Promise.all([adminGetVenue(id), adminListOrgs()]);
  if (!v) notFound();
  const slug = v.slug ?? v.id;
  const origin = siteOrigin();
  const reviewUrl = v.reviewToken ? `${origin}/revisar/${v.reviewToken}` : null;
  const planos = v.files.filter((f) => f.kind === "plano");
  const fotos = v.files.filter((f) => f.kind === "foto");
  const renders = v.files.filter((f) => f.kind === "render");
  const aviso = reviewUrl
    ? `Hola${v.contactName ? ` ${v.contactName}` : ""}, ya está ${v.name} en 3D. Revísalo y confírmalo aquí: ${reviewUrl}`
    : "";

  return (
    <>
      <AdminNav current="/admin" />
      <p className="text-sm text-stone-500">
        <Link href="/admin" className="underline">
          Lugares
        </Link>
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{v.name}</h1>
      {v.deletedAt && (
        <form action={trashVenue} className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <input type="hidden" name="venueId" value={v.id} />
          <input type="hidden" name="restore" value="1" />
          En la papelera: no aparece en ninguna parte y se borra a los 30 días.
          <button className="h-9 rounded-lg bg-red-700 px-3 font-medium text-white">Restaurar</button>
        </form>
      )}
      <p className="text-stone-500">
        {VENUE_KIND_LABELS[v.kind]} · {v.city} · {VENUE_STATUS_LABELS[v.status]} · {v.viewCount} aperturas
        {v.status === "publicado" && (
          <>
            {" · "}
            <PageLink href={`/lugares/${slug}`} className="underline">
              ficha pública
            </PageLink>
          </>
        )}
      </p>
      {v.reviewNotes && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Correcciones pedidas por el dueño: {v.reviewNotes}</p>}
      {v.notes && <p className="mt-2 rounded-xl bg-stone-100 p-3 text-sm">Notas del dueño: {v.notes}</p>}

      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">1. Archivos del dueño</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {planos.map((f) => (
            <li key={f.id} className="flex items-center gap-3">
              <a href={`/admin/archivos/${f.id}`} className="underline">
                {f.name}
              </a>
              <span className="text-stone-400">{(f.size / 1024 / 1024).toFixed(1)} MB · {f.mimeType}</span>
              <form action={deleteFile}>
                <input type="hidden" name="venueId" value={v.id} />
                <input type="hidden" name="fileId" value={f.id} />
                <button className="text-xs text-red-600">borrar</button>
              </form>
            </li>
          ))}
          {planos.length === 0 && <li className="text-stone-500">Sin plano del dueño.</li>}
        </ul>
        {fotos.length > 0 && (
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {fotos.map((f) => (
              <li key={f.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- fotos guardadas en la base */}
                <img src={`/admin/archivos/${f.id}`} alt="" className="aspect-square w-full rounded-lg object-cover" />
                <form action={deleteFile} className="absolute right-1 top-1">
                  <input type="hidden" name="venueId" value={v.id} />
                  <input type="hidden" name="fileId" value={f.id} />
                  <button aria-label="Borrar foto" className="h-6 w-6 rounded-full bg-black/60 text-xs text-white">
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <form action={addFiles} className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-2">
            <input type="hidden" name="venueId" value={v.id} />
            <input type="hidden" name="kind" value="foto" />
            <input name="files" type="file" accept="image/*" multiple required className="min-w-0 flex-1 text-sm" />
            <button className="h-9 rounded-xl bg-stone-900 px-3 text-sm font-medium text-white">Agregar fotos</button>
          </form>
          <form action={addFiles} className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-2">
            <input type="hidden" name="venueId" value={v.id} />
            <input type="hidden" name="kind" value="plano" />
            <input name="files" type="file" accept=".dwg,.dxf,.pdf,image/*" multiple required className="min-w-0 flex-1 text-sm" />
            <button className="h-9 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium">Agregar plano</button>
          </form>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Contacto: {v.contactName ?? "—"}
          {v.contactPhone && (
            <>
              {" · "}
              <a href={waLink(v.contactPhone, `Hola ${v.contactName ?? ""}, te escribimos de Plantea por ${v.name}.`)} target="_blank" rel="noopener" className="underline">
                {formatWhatsapp(v.contactPhone)}
              </a>
            </>
          )}
          {v.contactEmail ? ` · ${v.contactEmail}` : ""}
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">2. Plano del diseñador</h2>
        <p className="mt-1 text-sm text-stone-500">
          {v.hasPlan ? "Ya tiene plano. " : "Todavía no tiene plano. "}
          Sube el JSON que genera <code>tools/cad-import/to_designer.py</code>; el lugar pasa a &quot;por confirmar&quot; (si ya estaba publicado, se queda publicado con el plano nuevo).
        </p>
        {v.hasPlan && v.reviewToken && (
          <PageLink href={`/lugares/${slug}/3d?r=${v.reviewToken}`} className="mt-2 inline-flex h-10 items-center rounded-xl border border-stone-300 px-3 text-sm font-medium">
            Abrir el 3D
          </PageLink>
        )}
        <form action={uploadVenuePlan} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="venueId" value={v.id} />
          <input name="plan" type="file" accept="application/json,.json" required className="text-sm" />
          <button className={btn}>Cargar plano</button>
        </form>
        {v.hasPlan && v.reviewToken && (
          <div className="mt-4 border-t border-stone-200 pt-3">
            <h3 className="text-sm font-semibold">Portada automática</h3>
            <p className="mt-1 text-sm text-stone-500">
              Vista 3D y plano 2D para la tarjeta del catálogo y la ficha mientras el lugar no tenga fotos (si sube fotos, las fotos ganan). Se genera sola al cargar el plano.
            </p>
            <PortadaAuto
              captureSrc={`/lugares/${slug}/3d?r=${v.reviewToken}`}
              postUrl={`/api/lugares/${v.id}/portada`}
              auto={renders.length === 0}
              previews={renders.map((f) => ({ src: `/lugares/${slug}/foto/${f.id}`, label: f.name.startsWith("vista-3d") ? "Vista 3D" : "Plano 2D" }))}
            />
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">3. Estado, dueño y enlace de revisión</h2>
        <form action={updateVenueState} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="venueId" value={v.id} />
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Estado</span>
            <select name="status" defaultValue={v.status} className={field}>
              {VENUE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VENUE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Dueño (cuenta)</span>
            <select name="ownerOrgId" defaultValue={v.ownerOrgId ?? ""} className={field}>
              <option value="">Sin cuenta</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {ORG_KIND_LABELS[o.kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-3 text-sm">
            <input type="checkbox" name="isPublic" defaultChecked={v.isPublic} className="h-5 w-5" />
            Abierto a todas las planners (catálogo)
          </label>
          <button className={`${btn} sm:col-span-3`}>Guardar estado</button>
        </form>
        {reviewUrl && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-stone-600">Enlace de revisión del dueño (mándaselo por WhatsApp cuando el plano esté listo):</p>
            <CopyField value={reviewUrl} />
            {v.contactPhone && (
              <a href={waLink(v.contactPhone, aviso)} target="_blank" rel="noopener" className="inline-flex h-10 items-center rounded-xl bg-[#25d366] px-3 text-sm font-medium text-white">
                Mandar aviso por WhatsApp
              </a>
            )}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">4. Ficha</h2>
        <form action={updateVenueData} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="venueId" value={v.id} />
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Nombre</span>
            <input name="name" defaultValue={v.name} required minLength={2} maxLength={80} className={field} />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Ciudad</span>
            <input name="city" defaultValue={v.city} required maxLength={60} className={field} />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Aforo</span>
            <input name="capacity" type="number" defaultValue={v.capacity ?? ""} min={0} max={5000} className={field} />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">m² construidos</span>
            <input name="areaM2" type="number" step="0.1" defaultValue={v.areaM2 ?? ""} min={0} max={5000} className={field} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-stone-600">Dirección</span>
            <input name="address" defaultValue={v.address ?? ""} maxLength={160} className={field} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-stone-600">Descripción</span>
            <textarea name="description" defaultValue={v.description ?? ""} rows={3} maxLength={600} className={area} />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">Contacto</span>
            <input name="contactName" defaultValue={v.contactName ?? ""} maxLength={80} className={field} />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-stone-600">WhatsApp</span>
            <input name="contactPhone" defaultValue={v.contactPhone ? formatWhatsapp(v.contactPhone) : ""} maxLength={30} className={field} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-stone-600">Correo</span>
            <input name="contactEmail" type="email" defaultValue={v.contactEmail ?? ""} maxLength={120} className={field} />
          </label>
          <button className={`${btn} sm:col-span-2`}>Guardar ficha</button>
        </form>
      </section>
      {!v.deletedAt && (
        <section className="mt-8 rounded-2xl border border-red-200 p-4">
          <h2 className="text-lg font-semibold text-red-800">Mandar a la papelera</h2>
          <p className="mt-1 text-sm text-stone-600">
            Desaparece del catálogo, de las planners y de sus eventos. Se puede restaurar desde Papelera durante 30 días; después se borra de verdad
            (solo si ya no tiene eventos).
          </p>
          <form action={trashVenue} className="mt-3">
            <input type="hidden" name="venueId" value={v.id} />
            <button className="h-10 rounded-xl border border-red-300 bg-white px-4 text-sm font-medium text-red-700">Mandar a la papelera</button>
          </form>
        </section>
      )}
    </>
  );
}
