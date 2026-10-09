"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createStore, useStore } from "zustand";
import { temporal } from "zundo";
import { LAYERS, type Layer, type LayoutDoc, type PlacedObject } from "@/lib/layout/types";

export type Transform = { x: number; z: number; rotation: number };

/** Posición provisional mientras se arrastra o gira; se confirma al soltar (un solo paso de deshacer). */
export type DragState = (Transform & { id: string; guideX?: number; guideZ?: number }) | null;

export type EditorState = {
  layout: LayoutDoc;
  selectedId: string | null;
  drag: DragState;
  visible: Record<Layer, boolean>;
  snapToGrid: boolean;
  /** Planta que se está editando (casas); null en salones. */
  activeLevel: string | null;
  select: (id: string | null) => void;
  setActiveLevel: (level: string) => void;
  setDrag: (drag: DragState) => void;
  commitTransform: (id: string, t: Transform) => void;
  addObjects: (objects: PlacedObject[], selectId?: string) => void;
  updateObject: (id: string, patch: Partial<PlacedObject>) => void;
  removeObject: (id: string) => void;
  setObjects: (objects: PlacedObject[]) => void;
  /** Reemplaza el documento completo y borra el historial (al cargar). */
  replaceLayout: (layout: LayoutDoc) => void;
  setMinAisle: (meters: number) => void;
  toggleLayer: (layer: Layer) => void;
  setSnapToGrid: (on: boolean) => void;
};

const allVisible = () => Object.fromEntries(LAYERS.map((l) => [l, true])) as Record<Layer, boolean>;

export function createEditorStore(initial: LayoutDoc, initialLevel: string | null = null) {
  const store = createStore<EditorState>()(
    temporal(
      (set, get) => {
        const mapObjects = (fn: (objects: PlacedObject[]) => PlacedObject[]) =>
          set((s) => ({ layout: { ...s.layout, objects: fn(s.layout.objects) } }));
        return {
          layout: initial,
          selectedId: null,
          drag: null,
          visible: allVisible(),
          snapToGrid: true,
          activeLevel: initialLevel,
          select: (id) => set({ selectedId: id }),
          setActiveLevel: (activeLevel) => set({ activeLevel, selectedId: null, drag: null }),
          setDrag: (drag) => set({ drag }),
          commitTransform: (id, t) =>
            mapObjects((objects) => objects.map((o) => (o.id === id ? { ...o, ...t } : o))),
          addObjects: (objects, selectId) => {
            mapObjects((current) => [...current, ...objects]);
            if (selectId) set({ selectedId: selectId });
          },
          updateObject: (id, patch) =>
            mapObjects((objects) => objects.map((o) => (o.id === id ? { ...o, ...patch } : o))),
          removeObject: (id) => {
            mapObjects((objects) => objects.filter((o) => o.id !== id));
            if (get().selectedId === id) set({ selectedId: null });
          },
          setObjects: (objects) => mapObjects(() => objects),
          replaceLayout: (layout) => {
            set({ layout, selectedId: null, drag: null });
            store.temporal.getState().clear();
          },
          setMinAisle: (minAisle) =>
            set((s) => ({ layout: { ...s.layout, settings: { ...s.layout.settings, minAisle } } })),
          toggleLayer: (layer) => set((s) => ({ visible: { ...s.visible, [layer]: !s.visible[layer] } })),
          setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
        };
      },
      {
        // Solo el documento entra al historial; selección, capas y arrastre no.
        partialize: (s) => ({ layout: s.layout }),
        equality: (a, b) => a.layout === b.layout,
        limit: 100,
      },
    ),
  );
  return store;
}

export type EditorStore = ReturnType<typeof createEditorStore>;

const EditorContext = createContext<EditorStore | null>(null);

/** Da a todo el editor la distribución activa; al cambiarla, la vista sigue montada. */
export function EditorStoreProvider({ store, children }: { store: EditorStore; children: ReactNode }) {
  return <EditorContext value={store}>{children}</EditorContext>;
}

export function useEditorApi(): EditorStore {
  const store = useContext(EditorContext);
  if (!store) throw new Error("useEditorApi debe usarse dentro de <EditorProvider>");
  return store;
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useStore(useEditorApi(), selector);
}

export function useHistory() {
  const store = useEditorApi();
  const canUndo = useStore(store.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (s) => s.futureStates.length > 0);
  return {
    canUndo,
    canRedo,
    undo: () => store.temporal.getState().undo(),
    redo: () => store.temporal.getState().redo(),
  };
}
