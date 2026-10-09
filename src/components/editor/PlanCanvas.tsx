"use client";

import { useGesture } from "@use-gesture/react";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { analyzeLayout, issueLevels, levelOf, nearestNeighbors, onLevel, type IssueLevel } from "@/lib/layout/analysis";
import { findItem } from "@/lib/layout/catalog";
import { bounds, footprint, normalizeAngle, pointInPolygon, snap } from "@/lib/layout/geometry";
import type { PlacedObject, Pt, VenueSpec } from "@/lib/layout/types";
import { LevelLayer, MeasureOverlay, ObjectNode, VenueLayer } from "./shapes";
import { useEditor, useEditorApi } from "./store";

export type CanvasApi = {
  /** Centro de la vista actual, en metros. */
  center: () => Pt;
  fit: () => void;
  focus: (id: string) => void;
};

const MIN_SCALE = 2; // px por metro
const MAX_SCALE = 220;
const GRID = 0.25;
const ROTATE_STEP = 15;
const LONG_PRESS_MS = 550;
const MOVE_TOLERANCE = 8;
/** Distancia (px) a la que una mesa "se pega" a la línea de otra. */
const ALIGN_PX = 10;

type View = { s: number; tx: number; ty: number };

type DragMemo = {
  mode: "pan" | "move" | "none";
  id: string | null;
  startWorld: Pt;
  origin: { x: number; z: number; rotation: number } | null;
};

type PinchMemo = {
  s0: number;
  world: Pt;
  rotate: { id: string; start: number; x: number; z: number } | null;
};

export function PlanCanvas({
  venue,
  levels,
  apiRef,
  onLongPress,
}: {
  venue: VenueSpec;
  levels: Map<string, IssueLevel>;
  apiRef: Ref<CanvasApi>;
  onLongPress: (at: Pt) => void;
}) {
  const store = useEditorApi();
  const layout = useEditor((s) => s.layout);
  const selectedId = useEditor((s) => s.selectedId);
  const drag = useEditor((s) => s.drag);
  const visible = useEditor((s) => s.visible);
  const activeLevel = useEditor((s) => s.activeLevel);
  const level = levelOf(venue, activeLevel);

  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const view = useRef<View>({ s: 10, tx: 0, ty: 0 });
  const [scale, setScale] = useState(10);
  const downTarget = useRef<string | null>(null);
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  // La vista se mueve tocando el DOM directamente: así el plano va a 60 fps sin re-renderizar React.
  const apply = useCallback(() => {
    const { s, tx, ty } = view.current;
    worldRef.current?.setAttribute("transform", `translate(${tx} ${ty}) scale(${s})`);
  }, []);

  const toWorld = useCallback((clientX: number, clientY: number): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    const { s, tx, ty } = view.current;
    return { x: (clientX - r.left - tx) / s, z: (clientY - r.top - ty) / s };
  }, []);

  const fit = useCallback(() => {
    const el = svgRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const b = bounds(venue.floor);
    const pad = 20;
    const s = Math.min((width - pad * 2) / (b.maxX - b.minX), (height - pad * 2) / (b.maxZ - b.minZ));
    view.current = {
      s,
      tx: (width - (b.maxX - b.minX) * s) / 2 - b.minX * s,
      ty: (height - (b.maxZ - b.minZ) * s) / 2 - b.minZ * s,
    };
    apply();
    setScale(s);
  }, [venue, apply]);

  useImperativeHandle(
    apiRef,
    () => ({
      center: () => {
        const r = svgRef.current!.getBoundingClientRect();
        return toWorld(r.left + r.width / 2, r.top + r.height / 2);
      },
      fit,
      focus: (id) => {
        const o = store.getState().layout.objects.find((x) => x.id === id);
        const el = svgRef.current;
        if (!o || !el) return;
        const { width, height } = el.getBoundingClientRect();
        const s = Math.max(view.current.s, 28);
        view.current = { s, tx: width / 2 - o.x * s, ty: height / 2 - o.z * s };
        apply();
        setScale(s);
      },
    }),
    [fit, toWorld, apply, store],
  );

  useLayoutEffect(() => {
    fit();
  }, [fit]);

  // Al cambiar el tamaño (girar el iPad, abrir paneles) se conserva el punto del centro.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    let last = el.getBoundingClientRect();
    const ro = new ResizeObserver(() => {
      const now = el.getBoundingClientRect();
      view.current.tx += (now.width - last.width) / 2;
      view.current.ty += (now.height - last.height) / 2;
      last = now;
      apply();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [apply]);

  // Safari en iPhone/iPad: evita que el pellizco haga zoom a toda la página.
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
    };
  }, []);

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const handleTap = (id: string | null, clientX: number, clientY: number) => {
    const st = store.getState();
    if (id) {
      st.select(id);
      lastTap.current = null;
      return;
    }
    const now = performance.now();
    const prev = lastTap.current;
    if (prev && now - prev.t < 320 && Math.hypot(clientX - prev.x, clientY - prev.y) < 30) {
      lastTap.current = null;
      fit();
      return;
    }
    lastTap.current = { t: now, x: clientX, y: clientY };
    st.select(null);
  };

  /** Imán: primero a la línea de otra mesa (guía), si no a la rejilla. */
  const snapMove = (id: string, x: number, z: number) => {
    const st = store.getState();
    const tol = ALIGN_PX / view.current.s;
    let guideX: number | undefined;
    let guideZ: number | undefined;
    let bestX = tol;
    let bestZ = tol;
    for (const o of st.layout.objects) {
      if (o.id === id || !onLevel(o, venue, st.activeLevel)) continue;
      const dx = Math.abs(o.x - x);
      const dz = Math.abs(o.z - z);
      if (dx < bestX) {
        bestX = dx;
        guideX = o.x;
      }
      if (dz < bestZ) {
        bestZ = dz;
        guideZ = o.z;
      }
    }
    const grid = st.snapToGrid;
    return {
      x: guideX ?? (grid ? snap(x, GRID) : Math.round(x * 100) / 100),
      z: guideZ ?? (grid ? snap(z, GRID) : Math.round(z * 100) / 100),
      guideX,
      guideZ,
    };
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    const target = (event.target as Element | null)?.closest?.("[data-obj]");
    downTarget.current = target?.getAttribute("data-obj") ?? null;
    if (event.isPrimary && !downTarget.current) {
      const { clientX, clientY } = event;
      cancelPress();
      press.current = {
        x: clientX,
        y: clientY,
        fired: false,
        timer: window.setTimeout(() => {
          if (!press.current) return;
          press.current.fired = true;
          onLongPress(toWorld(clientX, clientY));
        }, LONG_PRESS_MS),
      };
    } else if (press.current && !press.current.fired) {
      // Segundo dedo: es un pellizco, no una pulsación larga.
      cancelPress();
    }
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const p = press.current;
    if (p && !p.fired && Math.hypot(event.clientX - p.x, event.clientY - p.y) > MOVE_TOLERANCE) {
      cancelPress();
    }
  };

  const onPointerEnd = () => {
    if (press.current && !press.current.fired) cancelPress();
  };

  useGesture(
    {
      onDrag: ({ first, last, tap, xy: [cx, cy], initial: [ix, iy], delta: [dx, dy], pinching, memo, touches }) => {
        if (pinching || touches > 1) return memo;
        const st = store.getState();
        let m = memo as DragMemo | undefined;
        if (first || !m) {
          const id = downTarget.current;
          const sel = id && id === st.selectedId ? st.layout.objects.find((o) => o.id === id) : undefined;
          m = {
            mode: sel && !sel.locked ? "move" : "pan",
            id,
            startWorld: toWorld(ix, iy),
            origin: sel ? { x: sel.x, z: sel.z, rotation: sel.rotation } : null,
          };
        }
        if (press.current?.fired) {
          // Ya se abrió el menú de "agregar aquí": se ignora el resto del gesto.
          if (last) press.current = null;
          return { ...m, mode: "none" };
        }
        if (tap) {
          cancelPress();
          handleTap(m.id, cx, cy);
          return m;
        }
        if (m.mode === "pan") {
          view.current.tx += dx;
          view.current.ty += dy;
          apply();
          if (last) setScale(view.current.s);
        } else if (m.mode === "move" && m.id && m.origin) {
          const w = toWorld(cx, cy);
          const pos = snapMove(m.id, m.origin.x + w.x - m.startWorld.x, m.origin.z + w.z - m.startWorld.z);
          st.setDrag({ id: m.id, rotation: m.origin.rotation, ...pos });
          if (last) {
            st.commitTransform(m.id, { x: pos.x, z: pos.z, rotation: m.origin.rotation });
            st.setDrag(null);
          }
        }
        return m;
      },
      onPinch: ({ first, last, origin: [ox, oy], offset: [s], movement: [, angle], memo, event }) => {
        if (event.cancelable) event.preventDefault();
        cancelPress();
        const st = store.getState();
        let m = memo as PinchMemo | undefined;
        if (first || !m) {
          const world = toWorld(ox, oy);
          const sel = st.selectedId ? st.layout.objects.find((o) => o.id === st.selectedId) : undefined;
          // Solo con los dedos; el pellizco del trackpad siempre es zoom.
          const touchLike = event.type.startsWith("pointer") || event.type.startsWith("touch");
          const onSelected = sel && !sel.locked && touchLike && pointInPolygon(world, footprint(sel));
          m = {
            s0: view.current.s,
            world,
            rotate: onSelected && sel ? { id: sel.id, start: sel.rotation, x: sel.x, z: sel.z } : null,
          };
        }
        if (m.rotate) {
          // Dos dedos sobre el objeto seleccionado: lo giran con imán cada 15°.
          const rotation = normalizeAngle(snap(m.rotate.start + angle, ROTATE_STEP));
          st.setDrag({ id: m.rotate.id, x: m.rotate.x, z: m.rotate.z, rotation });
          if (last) {
            st.commitTransform(m.rotate.id, { x: m.rotate.x, z: m.rotate.z, rotation });
            st.setDrag(null);
          }
          return m;
        }
        const r = svgRef.current!.getBoundingClientRect();
        view.current = { s, tx: ox - r.left - m.world.x * s, ty: oy - r.top - m.world.z * s };
        apply();
        if (last) setScale(s);
        return m;
      },
      onWheel: ({ event, delta: [dx, dy], ctrlKey, pinching }) => {
        // Trackpad: dos dedos mueven el plano; pellizcar (ctrl) lo maneja onPinch.
        if (ctrlKey || pinching) return;
        event.preventDefault();
        view.current.tx -= dx;
        view.current.ty -= dy;
        apply();
      },
    },
    {
      target: svgRef,
      eventOptions: { passive: false },
      drag: { filterTaps: true, tapsThreshold: 6 },
      pinch: {
        from: () => [view.current.s, 0],
        scaleBounds: { min: MIN_SCALE, max: MAX_SCALE },
        rubberband: false,
      },
    },
  );

  // Durante el arrastre, el objeto se dibuja en su posición provisional.
  const dragged: PlacedObject | null = useMemo(() => {
    if (!drag) return null;
    const o = layout.objects.find((x) => x.id === drag.id);
    return o ? { ...o, x: drag.x, z: drag.z, rotation: drag.rotation } : null;
  }, [drag, layout.objects]);

  const live = useMemo(() => {
    if (!dragged) return null;
    const doc = { ...layout, objects: layout.objects.map((o) => (o.id === dragged.id ? dragged : o)) };
    const level = issueLevels(analyzeLayout(doc, venue, { onlyId: dragged.id })).get(dragged.id) ?? null;
    return { level, neighbors: nearestNeighbors(doc, venue, dragged) };
  }, [dragged, layout, venue]);

  // Los tapetes van debajo de todo lo demás.
  const shown = layout.objects
    .filter((o) => visible[o.layer] && onLevel(o, venue, activeLevel))
    .sort((a, b) => Number(findItem(b.catalogId)?.model === "rug") - Number(findItem(a.catalogId)?.model === "rug"));
  const top = shown.find((o) => o.id === (dragged?.id ?? selectedId));

  return (
    <svg
      ref={svgRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className="absolute inset-0 h-full w-full touch-none select-none bg-[#ece7df]"
      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      <g ref={worldRef}>
        <VenueLayer venue={venue} showOutlets={visible.tecnica} garden={Boolean(level)} />
        {level && <LevelLayer level={level} />}
        {shown.map((o) =>
          o === top ? null : (
            <ObjectNode key={o.id} obj={o} selected={false} level={levels.get(o.id) ?? null} />
          ),
        )}
        {top && (
          <ObjectNode
            key={top.id}
            obj={dragged && dragged.id === top.id ? dragged : top}
            selected={top.id === selectedId}
            level={dragged && dragged.id === top.id ? (live?.level ?? null) : (levels.get(top.id) ?? null)}
          />
        )}
        {drag && live && (
          <MeasureOverlay
            neighbors={live.neighbors}
            minAisle={layout.settings.minAisle}
            scale={scale}
            guideX={drag.guideX}
            guideZ={drag.guideZ}
            venue={venue}
          />
        )}
      </g>
    </svg>
  );
}
