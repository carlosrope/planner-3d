"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkPhoto } from "@/lib/shrink-photo";
import { addFiles } from "../../actions";

/**
 * Fotos que agrega la administración: se achican en el navegador a 1600 px (~300 KB) antes de subirlas, como en
 * «Registra tu lugar». Así la ficha carga rápido y WhatsApp sí enseña la foto en la vista previa del enlace.
 */
export function PhotoUpload({ venueId }: { venueId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload() {
    const files = Array.from(input.current?.files ?? []);
    if (!files.length) return;
    setBusy(true);
    const form = new FormData();
    form.set("venueId", venueId);
    form.set("kind", "foto");
    for (const f of await Promise.all(files.map((f) => shrinkPhoto(f).catch(() => f)))) form.append("files", f);
    await addFiles(form);
    if (input.current) input.current.value = "";
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-2">
      <input ref={input} type="file" accept="image/*" multiple className="min-w-0 flex-1 text-sm" />
      <button type="button" onClick={upload} disabled={busy} className="h-9 rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:opacity-60">
        {busy ? "Subiendo…" : "Agregar fotos"}
      </button>
    </div>
  );
}
