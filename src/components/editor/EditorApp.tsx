"use client";

import { Box } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { analyzeLayout, issueLevels, layoutStats } from "@/lib/layout/analysis";
import { stressLayout } from "@/lib/layout/demo";
import { normalizeAngle } from "@/lib/layout/geometry";
import { autoNumber, createObject, duplicateObject, fillArea, floorCenter } from "@/lib/layout/tools";
import type { DistributionSeed, LayoutDoc, Pt, VenueInfo } from "@/lib/layout/types";
import { DistributionBar, DistributionSheet } from "./DistributionBar";
import { useDistributions, type Backend, type Distribution, type DistributionsApi } from "./distributions";
import { FpsMeter } from "./FpsMeter";
import { PlanCanvas, type CanvasApi } from "./PlanCanvas";
import {
  BottomBar,
  CatalogSheet,
  ContextBar,
  InventorySheet,
  IssuesSheet,
  LayersSheet,
  MenuButton,
  TopBar,
} from "./panels";
import { Sheet } from "./Sheet";
import { EditorStoreProvider, useEditor, useEditorApi, useHistory } from "./store";

// El 3D (Three.js) se descarga solo cuando se abre: el editor 2D carga rápido con datos móviles.
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-30 grid place-items-center bg-[#ece7df] text-sm text-stone-500">
      Cargando el 3D…
    </div>
  ),
});

type SheetName = "catalogo" | "capas" | "mas" | "avisos" | "inventario" | "distribucion";

export type EditorAppProps = {
  venue: VenueInfo;
  /** Distribuciones A/B/C; se muestra la recomendada (o la primera). */
  distributions: Distribution[];
  title: string;
  subtitle?: string;
  backHref?: string;
  backend: Backend;
  /** Distribuciones de demostración para "Restaurar" (prototipos). */
  demo?: DemoId;
};

export type DemoId = "salon" | "casa-chardonnay";

// Se cargan solo al pedir "Restaurar", para no sumar peso al editor.
const DEMOS: Record<DemoId, () => Promise<DistributionSeed[]>> = {
  salon: async () => (await import("@/lib/layout/demo")).demoDistributions(),
  "casa-chardonnay": async () => (await import("@/lib/layout/houses")).chardonnayDistributions(),
};

const subscribeNothing = () => () => {};

export function EditorApp(props: EditorAppProps) {
  // El prototipo guarda en este dispositivo: se monta solo en el navegador para leerlo desde el inicio.
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (props.backend.mode === "local" && !isClient) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#ece7df] text-sm text-stone-500">Abriendo el plano…</div>
    );
  }
  return <EditorHost {...props} />;
}

function EditorHost(props: EditorAppProps) {
  const dist = useDistributions(props.distributions, props.backend, props.venue.spec.levels?.[0]?.id ?? null);
  return (
    <EditorStoreProvider store={dist.store}>
      <EditorShell {...props} dist={dist} />
    </EditorStoreProvider>
  );
}

const FILL_OPTIONS = [
  { catalogId: "mesa-redonda-180", label: "Redondas de 1.80 m (10 lugares)" },
  { catalogId: "mesa-redonda-150", label: "Redondas de 1.50 m (8 lugares)" },
  { catalogId: "mesa-imperial", label: "Imperiales de 2.40 m (8 lugares)" },
];

function EditorShell({ venue, title, subtitle, backHref, backend, demo, dist }: EditorAppProps & { dist: DistributionsApi }) {
  const store = useEditorApi();
  const layout = useEditor((s) => s.layout);
  const selectedId = useEditor((s) => s.selectedId);
  const activeLevel = useEditor((s) => s.activeLevel);
  const [show3d, setShow3d] = useState(false);
  const kind = venue.kind ?? (venue.spec.levels?.length ? "casa" : "salon");
  const house = kind === "casa";
  const floors = venue.spec.levels ?? [];
  const { undo, redo } = useHistory();
  const canvas = useRef<CanvasApi>(null);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [addAt, setAddAt] = useState<Pt | null>(null);
  const [showFps, setShowFps] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const status = dist.status;
  const local = backend.mode === "local";
  const activeMeta = dist.metas.find((m) => m.id === dist.activeId) ?? dist.metas[0];

  const issues = useMemo(() => analyzeLayout(layout, venue.spec), [layout, venue.spec]);
  const levels = useMemo(() => issueLevels(issues), [issues]);
  const stats = useMemo(() => layoutStats(layout), [layout]);
  const selected = layout.objects.find((o) => o.id === selectedId) ?? null;

  const close = () => {
    setSheet(null);
    setAddAt(null);
  };

  const addFromCatalog = (catalogId: string) => {
    const at = addAt ?? canvas.current?.center() ?? floorCenter(venue.spec);
    const st = store.getState();
    const obj = { ...createObject(catalogId, at, st.layout.objects), ...(st.activeLevel ? { level: st.activeLevel } : {}) };
    st.addObjects([obj], obj.id);
    close();
  };

  const duplicateSelected = () => {
    const st = store.getState();
    const o = st.layout.objects.find((x) => x.id === st.selectedId);
    if (!o) return;
    const copy = duplicateObject(o, st.layout.objects, st.layout.settings.minAisle);
    st.addObjects([copy], copy.id);
  };

  const fillWith = (catalogId: string) => {
    const st = store.getState();
    const added = fillArea(st.layout, venue.spec, catalogId, { aisle: st.layout.settings.minAisle });
    if (added.length) st.addObjects(added);
    setNotice(added.length ? `Se agregaron ${added.length} mesas.` : "Ya no caben más mesas con ese pasillo.");
    close();
  };

  const replaceAll = (doc: LayoutDoc, message: string) => {
    if (!window.confirm(message)) return;
    store.getState().replaceLayout(doc);
    close();
    requestAnimationFrame(() => canvas.current?.fit());
  };

  const newDistribution = async () => {
    const id = await dist.create();
    if (id) setSheet("distribucion");
    else setNotice("No se pudo crear la distribución. Revisa la conexión.");
  };

  // Atajos de teclado para trabajar desde la Mac.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      const st = store.getState();
      const sel = st.layout.objects.find((o) => o.id === st.selectedId);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "d" && sel) {
        e.preventDefault();
        duplicateSelected();
      } else if ((e.key === "Backspace" || e.key === "Delete") && sel && !sel.locked) {
        e.preventDefault();
        st.removeObject(sel.id);
      } else if (e.key === "Escape") {
        st.select(null);
      } else if (e.key.toLowerCase() === "r" && sel && !sel.locked && !mod) {
        st.updateObject(sel.id, { rotation: normalizeAngle(sel.rotation + (e.shiftKey ? -15 : 15)) });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // duplicateSelected solo lee del store, no depende del render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, undo, redo]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(t);
  }, [notice]);

  return (
    // Sin selección de texto ni menú de "mantener presionado" de iOS: aquí todo toque es una acción.
    <div
      className="fixed inset-0 flex select-none flex-col overscroll-none bg-[#ece7df] text-stone-800"
      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      <TopBar
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        stats={stats}
        issues={issues}
        status={status}
        local={local}
        onIssues={() => setSheet("avisos")}
        summary={house ? `${floors.length} plantas · ${layout.objects.length} muebles` : undefined}
      />
      <DistributionBar
        metas={dist.metas}
        activeId={dist.activeId}
        onSelect={dist.select}
        onCreate={newDistribution}
        onEdit={() => setSheet("distribucion")}
      />
      <main className="relative flex-1 overflow-hidden">
        <PlanCanvas
          venue={venue.spec}
          levels={levels}
          apiRef={canvas}
          onLongPress={(at) => {
            setAddAt(at);
            setSheet("catalogo");
          }}
        />
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          {floors.length > 1 ? (
            <div className="pointer-events-auto flex rounded-full bg-white/95 p-1 shadow-md">
              {floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => store.getState().setActiveLevel(f.id)}
                  className={`h-9 rounded-full px-3 text-sm font-medium ${
                    activeLevel === f.id ? "bg-stone-900 text-white" : "text-stone-600"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          <button
            onClick={() => setShow3d(true)}
            className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-full bg-stone-900 px-4 text-sm font-semibold text-white shadow-md active:bg-stone-700"
          >
            <Box size={17} /> Ver en 3D
          </button>
        </div>
        {showFps && <FpsMeter />}
        {notice && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
            <span className="rounded-full bg-stone-900/85 px-4 py-2 text-sm text-white shadow">{notice}</span>
          </div>
        )}
        {selected && <ContextBar key={selected.id} obj={selected} onDuplicate={duplicateSelected} />}

        <CatalogSheet
          open={sheet === "catalogo"}
          title={addAt ? "Agregar aquí" : "Agregar al plano"}
          kind={kind}
          onClose={close}
          onPick={addFromCatalog}
        />
        <LayersSheet open={sheet === "capas"} onClose={close} />
        <IssuesSheet
          open={sheet === "avisos"}
          issues={issues}
          onClose={close}
          onPick={(id) => {
            store.getState().select(id);
            canvas.current?.focus(id);
            close();
          }}
        />
        <InventorySheet open={sheet === "inventario"} stats={stats} onClose={close} />
        <Sheet title="Más opciones" open={sheet === "mas"} onClose={close}>
          {!house && (
            <>
              <MenuButton onClick={() => (store.getState().setObjects(autoNumber(store.getState().layout.objects)), close())}>
                Numerar mesas automáticamente
              </MenuButton>
              <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Llenar el salón con mesas
              </p>
              {FILL_OPTIONS.map((o) => (
                <MenuButton key={o.catalogId} onClick={() => fillWith(o.catalogId)}>
                  {o.label}
                </MenuButton>
              ))}
              <div className="my-2 border-t border-stone-100" />
            </>
          )}
          <MenuButton onClick={() => setSheet("inventario")}>
            {house ? "Lista de muebles" : "Inventario del montaje"}
          </MenuButton>
          <MenuButton onClick={() => (setShowFps(!showFps), close())}>
            {showFps ? "Ocultar" : "Mostrar"} medidor de fluidez (FPS)
          </MenuButton>
          {local && !house && (
            <MenuButton onClick={() => replaceAll(stressLayout(), "¿Reemplazar el plano por la prueba de 60 mesas?")}>
              Prueba de rendimiento: 60 mesas
            </MenuButton>
          )}
          {local && demo && (
            <MenuButton
              onClick={async () => {
                if (!window.confirm("¿Volver a las distribuciones de demostración? Se pierden los cambios.")) return;
                dist.reset(await DEMOS[demo]());
                close();
                requestAnimationFrame(() => canvas.current?.fit());
              }}
            >
              Restaurar demostración
            </MenuButton>
          )}
          <MenuButton
            tone="danger"
            onClick={() => {
              if (window.confirm("¿Quitar todos los objetos del plano? Puedes deshacerlo.")) {
                store.getState().setObjects([]);
                close();
              }
            }}
          >
            Vaciar plano
          </MenuButton>
        </Sheet>
        <DistributionSheet
          key={activeMeta.id}
          open={sheet === "distribucion"}
          meta={activeMeta}
          canDelete={dist.metas.length > 1}
          onClose={close}
          onChange={(patch) => void dist.update(activeMeta.id, patch)}
          onDuplicate={() => {
            close();
            void newDistribution();
          }}
          onDelete={() => {
            void dist.remove(activeMeta.id);
            close();
          }}
        />
        {show3d && <Scene3D venue={venue} onClose={() => setShow3d(false)} />}
      </main>
      <BottomBar
        onAdd={() => setSheet("catalogo")}
        onLayers={() => setSheet("capas")}
        onFit={() => canvas.current?.fit()}
        onMore={() => setSheet("mas")}
      />
    </div>
  );
}
