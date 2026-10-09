"use client";

import { useEffect, useRef, useState } from "react";
import { layoutDocSchema } from "@/lib/layout/schema";
import type { LayoutDoc } from "@/lib/layout/types";
import type { EditorStore } from "./store";

export type Persistence =
  | { mode: "local"; key: string }
  | { mode: "server"; layoutId: string; revision: number };

export type SaveStatus = "guardado" | "pendiente" | "guardando" | "error" | "conflicto" | "sin-conexion";

/** Fetch con keepalive solo si el cuerpo cabe en el límite del navegador (~64 KB). */
const KEEPALIVE_LIMIT = 60_000;

/**
 * Guarda el documento automáticamente: en el navegador (prototipo) o en el servidor
 * con control de revisión, para no pisar cambios de otra persona.
 */
export function usePersistence(store: EditorStore, persistence: Persistence): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("guardado");
  const revision = useRef(persistence.mode === "server" ? persistence.revision : 0);
  const mode = persistence.mode;
  const target = persistence.mode === "local" ? persistence.key : persistence.layoutId;

  // Prototipo: recupera lo guardado en este dispositivo.
  useEffect(() => {
    if (mode !== "local") return;
    try {
      const raw = localStorage.getItem(target);
      if (!raw) return;
      const parsed = layoutDocSchema.safeParse(JSON.parse(raw));
      if (parsed.success) store.getState().replaceLayout(parsed.data as LayoutDoc);
    } catch {
      // Almacenamiento bloqueado (modo privado): se trabaja sin guardar.
    }
  }, [mode, target, store]);

  useEffect(() => {
    let timer = 0;
    let pending = false;
    let inflight = false;
    let queued = false;

    const save = async (keepalive = false) => {
      window.clearTimeout(timer);
      const doc = store.getState().layout;
      if (mode === "local") {
        try {
          localStorage.setItem(target, JSON.stringify(doc));
          pending = false;
          setStatus("guardado");
        } catch {
          setStatus("error");
        }
        return;
      }
      if (inflight) {
        queued = true;
        return;
      }
      if (!navigator.onLine) {
        setStatus("sin-conexion");
        return;
      }
      inflight = true;
      setStatus("guardando");
      const body = JSON.stringify({ doc, revision: revision.current });
      try {
        const res = await fetch(`/api/layouts/${target}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body,
          keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
        });
        if (res.status === 409) {
          setStatus("conflicto");
        } else if (!res.ok) {
          setStatus("error");
        } else {
          const data = (await res.json()) as { revision: number };
          revision.current = data.revision;
          pending = queued;
          setStatus(queued ? "pendiente" : "guardado");
        }
      } catch {
        setStatus(navigator.onLine ? "error" : "sin-conexion");
      } finally {
        inflight = false;
        if (queued) {
          queued = false;
          void save();
        }
      }
    };

    const unsubscribe = store.subscribe((state, prev) => {
      if (state.layout === prev.layout) return;
      pending = true;
      setStatus("pendiente");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void save(), mode === "local" ? 400 : 1000);
    });
    const onOnline = () => pending && void save();
    const onHide = () => pending && void save(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onHide);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onHide);
    };
  }, [mode, target, store]);

  return status;
}
