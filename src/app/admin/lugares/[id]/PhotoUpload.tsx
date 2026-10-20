"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkPhoto } from "@/lib/shrink-photo";
import { addFiles } from "../../actions";

/**
 * Fotos que agrega la administración. El botón abre la ventana para elegirlas y se suben solas en cuanto se eligen,
 * achicadas en el navegador a 1600 px (~300 KB), como en «Registra tu lugar»: la ficha carga rápido y WhatsApp sí
 * enseña la foto en la vista previa del enlace.
 */
export function PhotoUpload({ venueId }: { venueId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload(files: File[]) {
    const photos = files.filter((f) => f.type.startsWith("image/"));
    if (!photos.length) return setMsg("Elige una imagen (JPG, PNG o WEBP).");
    setBusy(true);
    setMsg("");
    const form = new FormData();
    form.set("venueId", venueId);
    form.set("kind", "foto");
    for (const f of await Promise.all(photos.map((f) => shrinkPhoto(f).catch(() => f)))) form.append("files", f);
    try {
      await addFiles(form);
      setMsg(`Listo: ${photos.length === 1 ? "1 foto agregada" : `${photos.length} fotos agregadas`}. Márcalas abajo como «Por fuera» o «Por dentro».`);
      router.refresh();
    } catch {
      setMsg("No se pudieron subir. Intenta de nuevo.");
    }
    if (input.current) input.current.value = "";
    setBusy(false);
  }

  return (
    <div className="rounded-xl bg-stone-50 p-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => upload(Array.from(e.target.files ?? []))}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="h-9 w-full rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "Subiendo…" : "Agregar fotos"}
      </button>
      {msg && (
        <p role="status" className="mt-1.5 text-sm text-stone-600">
          {msg}
        </p>
      )}
    </div>
  );
}
