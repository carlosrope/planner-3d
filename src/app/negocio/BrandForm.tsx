"use client";

import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import { updateBrand } from "./actions";

const field = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

/** Reduce la imagen a 400 px como máximo (PNG si tiene transparencia probable, JPG si es foto). */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = fail;
      i.src = url;
    });
    const k = Math.min(1, 400 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k);
    cv.height = Math.round(img.height * k);
    cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
    return file.type === "image/png" ? cv.toDataURL("image/png") : cv.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BrandForm({
  brand,
}: {
  brand: { name: string; logoUrl: string | null; brandColor: string | null; whatsapp: string | null; language?: string | null };
}) {
  const [state, action, pending] = useActionState(updateBrand, null);
  const [logo, setLogo] = useState(brand.logoUrl ?? "");
  const [changed, setChanged] = useState(false);
  const [color, setColor] = useState(brand.brandColor ?? "#b5653a");
  const [name, setName] = useState(brand.name);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogo(await shrink(file));
    setChanged(true);
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="logo" value={changed ? logo : ""} />
      <input type="hidden" name="removeLogo" value={changed && !logo ? "1" : ""} />

      <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL local, no pasa por el optimizador de Next
            <img src={logo} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-2xl font-semibold text-white" style={{ background: color, width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
              {name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-stone-300 px-4 text-sm font-medium active:bg-stone-100">
            {logo ? "Cambiar logo" : "Subir logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
          </label>
          {logo && (
            <button
              type="button"
              onClick={() => {
                setLogo("");
                setChanged(true);
              }}
              className="text-sm text-red-600"
            >
              Quitar logo
            </button>
          )}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-stone-600">Nombre del negocio</span>
        <input name="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <div className="grid grid-cols-[auto_1fr] items-end gap-3">
        <label className="space-y-1">
          <span className="text-sm text-stone-600">Color</span>
          <input
            name="brandColor"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="block h-12 w-16 rounded-xl border border-stone-300 bg-white p-1"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-stone-600">WhatsApp para tus clientes</span>
          <input
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={brand.whatsapp ? brand.whatsapp.replace(/^52/, "") : ""}
            placeholder="668 123 4567"
            className={field}
          />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-stone-600">Idioma del diseñador</span>
        <select name="language" defaultValue={brand.language === "en" ? "en" : "es"} className={field}>
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
        <span className="block text-xs text-stone-500">Así se ven el diseñador y los enlaces que compartes con tus clientes.</span>
      </label>
      <p className="text-sm text-stone-500">
        Tu nombre, logo y WhatsApp aparecen en los enlaces que compartes con tus clientes.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Guardado.</p>}
      <div className="flex gap-3">
        <button
          disabled={pending}
          className="h-12 flex-1 rounded-xl bg-stone-900 font-medium text-white active:bg-stone-700 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <Link href="/eventos" className="flex h-12 items-center rounded-xl border border-stone-300 px-4 font-medium active:bg-stone-100">
          Volver
        </Link>
      </div>
    </form>
  );
}
