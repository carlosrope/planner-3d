"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeLayout, issueLevels, layoutStats } from "@/lib/layout/analysis";
import { demoLayout, stressLayout } from "@/lib/layout/demo";
import { normalizeAngle } from "@/lib/layout/geometry";
import { autoNumber, createObject, duplicateObject, fillArea, floorCenter } from "@/lib/layout/tools";
import type { LayoutDoc, Pt, VenueInfo } from "@/lib/layout/types";
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
import { usePersistence, type Persistence } from "./persistence";
import { Sheet } from "./Sheet";
import { EditorProvider, useEditor, useEditorApi, useHistory } from "./store";

type SheetName = "catalogo" | "capas" | "mas" | "avisos" | "inventario";

export type EditorAppProps = {
  venue: VenueInfo;
  initial: LayoutDoc;
  title: string;
  subtitle?: string;
  backHref?: string;
  persistence: Persistence;
};

export function EditorApp(props: EditorAppProps) {
  return (
    <EditorProvider initial={props.initial}>
      <EditorShell {...props} />
    </EditorProvider>
  );
}

const FILL_OPTIONS = [
  { catalogId: "mesa-redonda-180", label: "Redondas de 1.80 m (10 lugares)" },
  { catalogId: "mesa-redonda-150", label: "Redondas de 1.50 m (8 lugares)" },
  { catalogId: "mesa-imperial", label: "Imperiales de 2.40 m (8 lugares)" },
];

function EditorShell({ venue, title, subtitle, backHref, persistence }: EditorAppProps) {
  const store = useEditorApi();
  const layout = useEditor((s) => s.layout);
  const selectedId = useEditor((s) => s.selectedId);
  const { undo, redo } = useHistory();
  const canvas = useRef<CanvasApi>(null);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [addAt, setAddAt] = useState<Pt | null>(null);
  const [showFps, setShowFps] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const status = usePersistence(store, persistence);
  const local = persistence.mode === "local";

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
    const obj = createObject(catalogId, at, store.getState().layout.objects);
    store.getState().addObjects([obj], obj.id);
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
    <div className="fixed inset-0 flex flex-col overscroll-none bg-[#ece7df] text-stone-800">
      <TopBar
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        stats={stats}
        issues={issues}
        status={status}
        local={local}
        onIssues={() => setSheet("avisos")}
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
          <MenuButton onClick={() => setSheet("inventario")}>Inventario del montaje</MenuButton>
          <MenuButton onClick={() => (setShowFps(!showFps), close())}>
            {showFps ? "Ocultar" : "Mostrar"} medidor de fluidez (FPS)
          </MenuButton>
          {local && (
            <>
              <MenuButton onClick={() => replaceAll(stressLayout(), "¿Reemplazar el plano por la prueba de 60 mesas?")}>
                Prueba de rendimiento: 60 mesas
              </MenuButton>
              <MenuButton onClick={() => replaceAll(demoLayout(), "¿Volver al montaje de demostración?")}>
                Restaurar demostración
              </MenuButton>
            </>
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
