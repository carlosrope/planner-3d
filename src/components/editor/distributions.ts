"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { layoutDocSchema } from "@/lib/layout/schema";
import { nextDistributionName, uid } from "@/lib/layout/tools";
import type { DistributionSeed, LayoutDoc } from "@/lib/layout/types";
import { createEditorStore, type EditorStore } from "./store";

// Distribuciones A/B/C: cada una tiene su propio estado (y su deshacer) y se
// guarda por separado. En el prototipo todo vive en el navegador; con cuenta,
// cada distribución es un montaje en la base de datos con control de revisión.

export type Distribution = DistributionSeed & { revision: number };
export type DistMeta = Omit<DistributionSeed, "doc">;
export type MetaPatch = Partial<Pick<DistMeta, "name" | "note" | "recommended">>;

export type Backend = { mode: "local"; key: string } | { mode: "server"; eventId: string };

export type SaveStatus = "guardado" | "pendiente" | "guardando" | "error" | "conflicto" | "sin-conexion";

type Entry = { meta: DistMeta; store: EditorStore };
type LocalBundle = { v: 2; active: string; items: DistributionSeed[] };

/** Fetch con keepalive solo si el cuerpo cabe en el límite del navegador (~64 KB). */
const KEEPALIVE_LIMIT = 60_000;
const DELAY = { local: 400, server: 1000 } as const;
/** Clave para guardar en el prototipo cambios que no son del plano (orden, nombres, activa). */
const META = "__meta__";

const metaOf = ({ id, name, note, recommended }: DistributionSeed): DistMeta => ({ id, name, note, recommended });

function readLocal(key: string): LocalBundle | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as LocalBundle;
    if (data?.v !== 2 || !Array.isArray(data.items) || !data.items.length) return null;
    const items = data.items.filter(
      (i) => typeof i.id === "string" && typeof i.name === "string" && layoutDocSchema.safeParse(i.doc).success,
    );
    return items.length ? { ...data, items } : null;
  } catch {
    // Almacenamiento bloqueado (modo privado) o datos viejos: se usa la demostración.
    return null;
  }
}

export function useDistributions(initial: Distribution[], backend: Backend, initialLevel: string | null) {
  const mode = backend.mode;
  const target = backend.mode === "local" ? backend.key : backend.eventId;

  // En el prototipo se arranca con lo guardado en este dispositivo (el editor solo se monta en el navegador).
  const [boot] = useState(() => {
    const bundle = backend.mode === "local" ? readLocal(backend.key) : null;
    const seeds: Distribution[] = bundle ? bundle.items.map((i) => ({ ...i, revision: 1 })) : initial;
    const fallback = (seeds.find((d) => d.recommended) ?? seeds[0]).id;
    const active = bundle && seeds.some((d) => d.id === bundle.active) ? bundle.active : fallback;
    return { seeds, active };
  });
  const [entries, setEntries] = useState<Entry[]>(() =>
    boot.seeds.map((d) => ({ meta: metaOf(d), store: createEditorStore(d.doc, initialLevel) })),
  );
  const [activeId, setActiveId] = useState(boot.active);
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});

  const entriesRef = useRef(entries);
  const activeRef = useRef(activeId);
  const revisions = useRef(new Map(boot.seeds.map((d) => [d.id, d.revision])));
  const timers = useRef(new Map<string, number>());
  const pending = useRef(new Set<string>());
  const inflight = useRef(new Set<string>());
  const queued = useRef(new Set<string>());

  useEffect(() => {
    entriesRef.current = entries;
    activeRef.current = activeId;
  }, [entries, activeId]);

  const setStatus = useCallback((id: string, status: SaveStatus) => {
    setStatuses((s) => (s[id] === status ? s : { ...s, [id]: status }));
  }, []);

  const writeLocal = useCallback(() => {
    if (mode !== "local") return;
    const bundle: LocalBundle = {
      v: 2,
      active: activeRef.current,
      items: entriesRef.current.map((e) => ({ ...e.meta, doc: e.store.getState().layout })),
    };
    try {
      localStorage.setItem(target, JSON.stringify(bundle));
      for (const id of pending.current) setStatus(id, "guardado");
      pending.current.clear();
    } catch {
      for (const id of pending.current) setStatus(id, "error");
    }
  }, [mode, target, setStatus]);

  const scheduleLocal = useCallback(
    (id = META) => {
      pending.current.add(id);
      window.clearTimeout(timers.current.get(META));
      timers.current.set(META, window.setTimeout(writeLocal, DELAY.local));
    },
    [writeLocal],
  );

  const saveServer = useCallback(
    async (id: string, keepalive = false) => {
      window.clearTimeout(timers.current.get(id));
      if (inflight.current.has(id)) {
        queued.current.add(id);
        return;
      }
      inflight.current.add(id);
      try {
        // Si llegan cambios mientras se guarda, se vuelve a guardar al terminar.
        do {
          const entry = entriesRef.current.find((e) => e.meta.id === id);
          if (!entry) return;
          if (!navigator.onLine) {
            setStatus(id, "sin-conexion");
            return;
          }
          setStatus(id, "guardando");
          const body = JSON.stringify({ doc: entry.store.getState().layout, revision: revisions.current.get(id) ?? 1 });
          try {
            const res = await fetch(`/api/layouts/${id}`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body,
              keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
            });
            if (res.status === 409) {
              setStatus(id, "conflicto");
              return;
            }
            if (!res.ok) {
              setStatus(id, "error");
              return;
            }
            const data = (await res.json()) as { revision: number };
            revisions.current.set(id, data.revision);
            pending.current.delete(id);
            setStatus(id, "guardado");
          } catch {
            setStatus(id, navigator.onLine ? "error" : "sin-conexion");
            return;
          }
        } while (queued.current.delete(id));
      } finally {
        inflight.current.delete(id);
      }
    },
    [setStatus],
  );

  // Cada cambio en el plano de cualquier distribución se guarda solo.
  useEffect(() => {
    const unsubscribe = entries.map(({ meta, store }) =>
      store.subscribe((state, prev) => {
        if (state.layout === prev.layout) return;
        setStatus(meta.id, "pendiente");
        if (mode === "local") {
          scheduleLocal(meta.id);
          return;
        }
        pending.current.add(meta.id);
        window.clearTimeout(timers.current.get(meta.id));
        timers.current.set(meta.id, window.setTimeout(() => void saveServer(meta.id), DELAY.server));
      }),
    );
    return () => unsubscribe.forEach((u) => u());
  }, [entries, mode, scheduleLocal, saveServer, setStatus]);

  // Al salir de la página o recuperar la señal, se guarda lo pendiente.
  useEffect(() => {
    const flush = (keepalive: boolean) => {
      if (mode === "local") {
        if (pending.current.size) writeLocal();
        return;
      }
      for (const id of [...pending.current]) void saveServer(id, keepalive);
    };
    const onHide = () => flush(true);
    const onOnline = () => flush(false);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      flush(true);
    };
  }, [mode, writeLocal, saveServer]);

  const select = useCallback(
    (id: string) => {
      const all = entriesRef.current;
      const current = all.find((e) => e.meta.id === activeRef.current);
      const next = all.find((e) => e.meta.id === id);
      if (!next || next === current) return;
      // Se conserva la planta que se estaba viendo, para comparar lo mismo.
      const level = current?.store.getState().activeLevel;
      if (level) next.store.getState().setActiveLevel(level);
      setActiveId(id);
      if (mode === "local") scheduleLocal();
    },
    [mode, scheduleLocal],
  );

  /** Duplica la distribución activa como una nueva (B, C…). Devuelve su id. */
  const create = useCallback(async (): Promise<string | null> => {
    const all = entriesRef.current;
    const source = all.find((e) => e.meta.id === activeRef.current) ?? all[0];
    const name = nextDistributionName(all.map((e) => e.meta.name));
    const doc = structuredClone(source.store.getState().layout) as LayoutDoc;
    let meta: DistMeta = { id: uid("dist"), name, note: "", recommended: false };
    let revision = 1;
    if (mode === "server") {
      try {
        const res = await fetch(`/api/events/${target}/layouts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, note: "", doc }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { id: string; revision: number };
        meta = { ...meta, id: data.id };
        revision = data.revision;
      } catch {
        return null;
      }
    }
    revisions.current.set(meta.id, revision);
    const store = createEditorStore(doc, source.store.getState().activeLevel);
    setEntries((list) => [...list, { meta, store }]);
    setActiveId(meta.id);
    if (mode === "local") scheduleLocal();
    return meta.id;
  }, [mode, target, scheduleLocal]);

  const update = useCallback(
    async (id: string, patch: MetaPatch) => {
      setEntries((list) =>
        list.map((e) =>
          e.meta.id === id
            ? { ...e, meta: { ...e.meta, ...patch } }
            : patch.recommended
              ? { ...e, meta: { ...e.meta, recommended: false } }
              : e,
        ),
      );
      if (mode === "local") {
        scheduleLocal();
        return;
      }
      try {
        const res = await fetch(`/api/layouts/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) setStatus(id, "error");
      } catch {
        setStatus(id, "error");
      }
    },
    [mode, scheduleLocal, setStatus],
  );

  const remove = useCallback(
    async (id: string) => {
      const all = entriesRef.current;
      if (all.length <= 1) return;
      if (mode === "server") {
        try {
          const res = await fetch(`/api/layouts/${id}`, { method: "DELETE" });
          if (!res.ok) return;
        } catch {
          return;
        }
      }
      window.clearTimeout(timers.current.get(id));
      pending.current.delete(id);
      setStatuses((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== id)));
      setEntries((list) => list.filter((e) => e.meta.id !== id));
      if (activeRef.current === id) setActiveId(all.find((e) => e.meta.id !== id)!.meta.id);
      if (mode === "local") scheduleLocal();
    },
    [mode, scheduleLocal],
  );

  /** Prototipo: vuelve a las distribuciones de demostración. */
  const reset = useCallback(
    (seeds: DistributionSeed[]) => {
      setEntries(seeds.map((d) => ({ meta: metaOf(d), store: createEditorStore(d.doc, initialLevel) })));
      setActiveId((seeds.find((d) => d.recommended) ?? seeds[0]).id);
      if (mode === "local") scheduleLocal();
    },
    [mode, initialLevel, scheduleLocal],
  );

  const active = entries.find((e) => e.meta.id === activeId) ?? entries[0];
  const all = Object.values(statuses);
  const status: SaveStatus = all.includes("conflicto")
    ? "conflicto"
    : all.includes("error")
      ? "error"
      : all.includes("sin-conexion")
        ? "sin-conexion"
        : all.some((s) => s === "pendiente" || s === "guardando")
          ? "guardando"
          : "guardado";

  return {
    metas: entries.map((e) => e.meta),
    activeId: active.meta.id,
    store: active.store,
    status,
    select,
    create,
    update,
    remove,
    reset,
  };
}

export type DistributionsApi = ReturnType<typeof useDistributions>;
