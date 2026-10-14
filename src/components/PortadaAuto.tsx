"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Portada automática de un lugar: abre el 3D del lugar en un iframe invisible (con ?captura=1 carga
// src/designer/captura.js), recibe por postMessage la vista 3D y el plano 2D en JPEG y los guarda en
// /api/lugares/[id]/portada. Arranca sola cuando el lugar ya tiene plano y todavía no tiene portada;
// el botón la vuelve a generar. La usan /admin/lugares/[id] (ProLink) y /revisar/[token] (el dueño).

type Props = {
  /** URL del 3D del lugar con el enlace de revisión, por ejemplo /lugares/salon/3d?r=token */
  captureSrc: string;
  /** /api/lugares/[id]/portada */
  postUrl: string;
  /** Enlace de revisión del dueño (autoriza el guardado sin sesión); en /admin basta la sesión. */
  token?: string | null;
  auto: boolean;
  /** Portadas ya guardadas (URLs públicas), para mostrarlas. */
  previews: { src: string; label: string }[];
};

type State = "idle" | "capturando" | "guardando" | "listo" | "error";

const MESSAGE = "plantea:portada";
type CaptureMessage = { type: string; ok: boolean; images: { name: string; data: string }[]; error?: string | null };

export function PortadaAuto({ captureSrc, postUrl, token, auto, previews }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (auto && !started.current) {
      started.current = true;
      setState("capturando");
      setRun(1);
    }
  }, [auto]);

  useEffect(() => {
    if (run === 0) return;
    let done = false;
    const fail = (msg: string) => {
      done = true;
      setState("error");
      setError(msg);
    };
    const timeout = setTimeout(() => !done && fail("El 3D tardó demasiado en responder. Inténtalo de nuevo."), 60_000);
    const onMessage = async (e: MessageEvent<CaptureMessage>) => {
      if (done || e.origin !== window.location.origin || e.data?.type !== MESSAGE || e.source !== frame.current?.contentWindow) return;
      clearTimeout(timeout);
      if (!e.data.ok || !e.data.images?.length) return fail(e.data.error ?? "No se pudo capturar el 3D.");
      done = true;
      setState("guardando");
      try {
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ r: token ?? undefined, images: e.data.images }),
        });
        if (!res.ok) throw new Error();
        setState("listo");
        router.refresh();
      } catch {
        setState("error");
        setError("No se pudo guardar la portada.");
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
  }, [run, postUrl, token, router]);

  const generar = () => {
    setError(null);
    setState("capturando");
    setRun((n) => n + 1);
  };
  const busy = state === "capturando" || state === "guardando";
  const src = `${captureSrc}${captureSrc.includes("?") ? "&" : "?"}captura=1&n=${run}`;

  return (
    <div className="mt-3 space-y-2">
      {previews.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {previews.map((p) => (
            <li key={p.src} className="relative overflow-hidden rounded-xl border border-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element -- imágenes guardadas en la base, servidas por la app */}
              <img src={p.src} alt={p.label} className="aspect-[4/3] w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{p.label}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generar} disabled={busy} className="h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium active:bg-stone-100 disabled:opacity-60">
          {previews.length ? "Volver a generar la portada 3D" : "Generar portada 3D"}
        </button>
        <span className="text-sm text-stone-500" aria-live="polite">
          {state === "capturando" && "Abriendo el 3D y tomando la portada… (unos 10 segundos)"}
          {state === "guardando" && "Guardando…"}
          {state === "listo" && "Portada lista."}
          {state === "error" && <span className="text-red-600">{error}</span>}
        </span>
      </div>
      {busy && state === "capturando" && (
        // Invisible pero presente en pantalla: con display:none el 3D no pinta (WebGL necesita tamaño).
        <iframe
          key={run}
          ref={frame}
          src={src}
          title="Captura de la portada"
          aria-hidden="true"
          tabIndex={-1}
          style={{ position: "fixed", left: 0, top: 0, width: 1200, height: 900, opacity: 0, pointerEvents: "none", zIndex: -1, border: 0 }}
        />
      )}
    </div>
  );
}
