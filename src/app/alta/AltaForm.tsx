"use client";

import { startTransition, useActionState, useState, type ChangeEvent, type FormEvent } from "react";
import { VENUE_KIND_LABELS, type VenueKind } from "@/lib/domain";
import { submitVenue } from "./actions";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";
const area = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-800";

export const MAX_PHOTOS = 8;
export const MAX_PLAN_FILES = 3;
const MAX_PLAN_BYTES = 12 * 1024 * 1024;
/** Igual que el servidor: planos y fotos juntos en un solo envío. */
const MAX_TOTAL_BYTES = 36 * 1024 * 1024;

/** Reduce una foto a 1600 px (JPEG) para que pese unos 300 KB. */
async function shrinkPhoto(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = fail;
      i.src = url;
    });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k);
    cv.height = Math.round(img.height * k);
    cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AltaForm({ owner }: { owner: { name: string; contact: string } | null }) {
  const [state, action, pending] = useActionState(submitVenue, null);
  const [kind, setKind] = useState<VenueKind>("salon");
  const [photos, setPhotos] = useState<File[]>([]);
  const [plans, setPlans] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const salon = kind === "salon";

  const pickPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setLocalError(null);
    try {
      // Cada foto por separado: si una no se puede abrir (por ejemplo HEIC en Android o Windows), las demás sí entran.
      // La que no abre no se manda: tampoco se vería en el catálogo.
      const results = await Promise.all(files.map((f) => shrinkPhoto(f).catch(() => null)));
      const ok = results.filter((f): f is File => f !== null);
      const failed = files.filter((_, i) => results[i] === null).map((f) => f.name);
      if (failed.length) {
        setLocalError(`No pudimos abrir ${failed.join(", ")}. Mándala en JPG o PNG (una captura de pantalla sirve) o por WhatsApp después.`);
      }
      setPhotos((p) => [...p, ...ok].slice(0, MAX_PHOTOS));
    } finally {
      setBusy(false);
    }
  };
  const pickPlans = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const big = files.find((f) => f.size > MAX_PLAN_BYTES);
    if (big) return setLocalError(`${big.name} pesa más de 12 MB. Mándalo por WhatsApp después de registrar el lugar.`);
    setLocalError(null);
    setPlans((p) => [...p, ...files].slice(0, MAX_PLAN_FILES));
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!plans.length) return setLocalError("Falta el plano: CAD, PDF o una foto del croquis con medidas.");
    const total = [...plans, ...photos].reduce((n, f) => n + f.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      return setLocalError("Los archivos juntos pesan más de 36 MB. Quita algunas fotos o manda el plano por WhatsApp después de registrar el lugar.");
    }
    setLocalError(null);
    const fd = new FormData(e.currentTarget);
    fd.delete("planos");
    fd.delete("fotos");
    plans.forEach((f) => fd.append("planos", f, f.name));
    photos.forEach((f) => fd.append("fotos", f, f.name));
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm text-stone-600">¿Qué vas a registrar?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(VENUE_KIND_LABELS) as VenueKind[]).map((k) => (
            <label
              key={k}
              className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium ${
                kind === k ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"
              }`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {VENUE_KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm text-stone-600">{salon ? "Nombre del salón" : "Nombre del modelo (y del desarrollo)"}</span>
          <input name="name" required minLength={2} maxLength={80} placeholder={salon ? "Salón Las Palmas" : "Casa Olivo · Residencial Alameda"} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-stone-600">Ciudad</span>
          <input name="city" required defaultValue="Los Mochis" maxLength={60} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-stone-600">{salon ? "Aforo (personas)" : "Metros construidos"}</span>
          {salon ? (
            <input name="capacity" type="number" inputMode="numeric" min={10} max={5000} placeholder="300" className={field} />
          ) : (
            <input name="areaM2" type="number" inputMode="decimal" step="0.1" min={20} max={5000} placeholder="172" className={field} />
          )}
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm text-stone-600">Dirección (opcional)</span>
          <input name="address" maxLength={160} placeholder="Blvd. Rosales 1234, Centro" className={field} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm text-stone-600">Descripción para la ficha (opcional)</span>
          <textarea
            name="description"
            rows={3}
            maxLength={600}
            placeholder={salon ? "Jardín, estacionamiento, aire acondicionado, horario, lo que el cliente debe saber." : "Recámaras, baños, cochera, acabados, lo que el comprador debe saber."}
            className={area}
          />
        </label>
      </div>

      <div className="space-y-3 rounded-xl bg-stone-50 p-3">
        <p className="text-sm font-medium">Plano</p>
        <p className="text-sm text-stone-500">
          CAD (DWG o DXF), PDF o una foto del croquis con medidas. Hasta {MAX_PLAN_FILES} archivos de 12 MB.
        </p>
        <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium active:bg-stone-100">
          Elegir archivo del plano
          <input type="file" name="planos" multiple accept=".dwg,.dxf,.pdf,image/*" className="hidden" onChange={pickPlans} />
        </label>
        {plans.length > 0 && (
          <ul className="space-y-1 text-sm">
            {plans.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                <span className="truncate">{f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button type="button" onClick={() => setPlans((p) => p.filter((_, j) => j !== i))} className="text-red-600">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Lo que no se ve en el plano (opcional)</span>
          <textarea name="notes" rows={2} maxLength={600} placeholder="Columnas, escenario fijo, cocina, baños, contactos de luz, altura del techo…" className={area} />
        </label>
      </div>

      <div className="space-y-3 rounded-xl bg-stone-50 p-3">
        <p className="text-sm font-medium">Fotos (hasta {MAX_PHOTOS})</p>
        <p className="text-sm text-stone-500">Entrada, el espacio vacío, montado, baños, jardín o estacionamiento. Se reducen solas antes de subirse.</p>
        <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium active:bg-stone-100">
          {busy ? "Preparando fotos…" : "Elegir fotos"}
          <input type="file" name="fotos" multiple accept="image/*" className="hidden" onChange={pickPhotos} disabled={busy || photos.length >= MAX_PHOTOS} />
        </label>
        {photos.length > 0 && (
          <ul className="grid grid-cols-4 gap-2">
            {photos.map((f, i) => (
              <li key={`${f.name}-${i}`} className="relative">
                <Thumb file={f} />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  aria-label="Quitar foto"
                  className="absolute right-1 top-1 h-7 w-7 rounded-full bg-black/60 text-white"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm text-stone-600">Tu nombre</span>
          <input name="contactName" required minLength={2} maxLength={80} defaultValue={owner?.contact ?? ""} autoComplete="name" className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-stone-600">Tu WhatsApp</span>
          <input name="contactPhone" type="tel" inputMode="tel" required placeholder="668 123 4567" autoComplete="tel" className={field} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm text-stone-600">Correo (opcional)</span>
          <input name="contactEmail" type="email" maxLength={120} autoComplete="email" className={field} />
        </label>
      </div>
      {owner && (
        <p className="text-sm text-stone-500">
          El lugar quedará ligado a tu negocio <b>{owner.name}</b> y lo verás en Mis lugares.
        </p>
      )}

      <label className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm">
        <input type="checkbox" name="agreement" required className="mt-1 h-5 w-5" />
        <span>
          Autorizo a Plantea a convertir y publicar el plano, las fotos y el 3D de este lugar en Plantea. Puedo pedir
          que se retire con 30 días de aviso. No hay exclusividad. El plano solo se usa para Plantea (
          <a href="/privacidad#s4" className="underline" target="_blank">
            aviso de privacidad
          </a>
          ) y acepto los{" "}
          <a href="/terminos" className="underline" target="_blank">
            términos
          </a>
          .
        </span>
      </label>

      {(localError || state?.error) && <p className="text-sm text-red-600">{localError ?? state?.error}</p>}
      <button
        disabled={pending || busy}
        className="h-12 w-full rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60"
      >
        {pending ? "Subiendo…" : "Registrar mi lugar"}
      </button>
    </form>
  );
}

function Thumb({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  // eslint-disable-next-line @next/next/no-img-element -- vista previa local de un archivo, no pasa por el optimizador
  return <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />;
}
