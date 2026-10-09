"use client";

import {
  ChevronLeft,
  CloudOff,
  Copy,
  Ellipsis,
  Hash,
  Layers,
  Lock,
  LockOpen,
  Minus,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Scan,
  Trash2,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { objectLabel, type Issue, type LayoutStats } from "@/lib/layout/analysis";
import { CATALOG, categoriesFor, findItem, type CatalogItem } from "@/lib/layout/catalog";
import { dims, normalizeAngle, seatCount } from "@/lib/layout/geometry";
import { LAYER_LABELS, LAYERS, type PlacedObject, type VenueKind } from "@/lib/layout/types";
import type { SaveStatus } from "./distributions";
import { Sheet } from "./Sheet";
import { useEditor, useEditorApi, useHistory } from "./store";

// ---------------------------------------------------------------------------
// Barras

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
  active,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 min-w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium transition-colors disabled:opacity-35 ${
        tone === "danger" ? "text-red-600 active:bg-red-50" : "text-stone-700 active:bg-stone-100"
      } ${active ? "bg-stone-100" : ""}`}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  guardado: "Guardado",
  pendiente: "Guardando…",
  guardando: "Guardando…",
  error: "Error al guardar",
  conflicto: "Otra persona editó: recarga",
  "sin-conexion": "Sin conexión",
};

export function TopBar({
  title,
  subtitle,
  backHref,
  stats,
  issues,
  status,
  local,
  onIssues,
  summary,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  stats: LayoutStats;
  /** Resumen a la derecha del subtítulo; por defecto mesas y lugares. */
  summary?: string;
  issues: Issue[];
  status: SaveStatus;
  local: boolean;
  onIssues: () => void;
}) {
  const errors = issues.filter((i) => i.level === "error").length;
  const bad = status === "error" || status === "conflicto" || status === "sin-conexion";
  return (
    <header
      className="z-20 flex items-center gap-2 border-b border-stone-200 bg-white px-2 py-1.5"
      style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      {backHref && (
        <Link href={backHref} aria-label="Volver" className="grid size-10 shrink-0 place-items-center rounded-full active:bg-stone-100">
          <ChevronLeft size={22} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold leading-tight">{title}</h1>
        <p className="truncate text-xs text-stone-500">
          {subtitle ? `${subtitle} · ` : ""}
          {summary ?? `${stats.tables} mesas · ${stats.seats} lugares`}
        </p>
      </div>
      {issues.length > 0 && (
        <button
          onClick={onIssues}
          className={`flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold ${
            errors ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <TriangleAlert size={15} />
          {issues.length}
        </button>
      )}
      <span className={`flex shrink-0 items-center gap-1 text-[11px] ${bad ? "text-red-600" : "text-stone-400"}`}>
        {status === "sin-conexion" && <CloudOff size={13} />}
        {local && status === "guardado" ? "Guardado aquí" : STATUS_TEXT[status]}
      </span>
    </header>
  );
}

export function BottomBar({
  onAdd,
  onLayers,
  onFit,
  onMore,
}: {
  onAdd: () => void;
  onLayers: () => void;
  onFit: () => void;
  onMore: () => void;
}) {
  const { canUndo, canRedo, undo, redo } = useHistory();
  return (
    <nav
      className="z-20 grid grid-cols-6 border-t border-stone-200 bg-white px-1 pt-1"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <IconButton icon={Plus} label="Agregar" onClick={onAdd} />
      <IconButton icon={Layers} label="Capas" onClick={onLayers} />
      <IconButton icon={Undo2} label="Deshacer" onClick={undo} disabled={!canUndo} />
      <IconButton icon={Redo2} label="Rehacer" onClick={redo} disabled={!canRedo} />
      <IconButton icon={Scan} label="Encuadrar" onClick={onFit} />
      <IconButton icon={Ellipsis} label="Más" onClick={onMore} />
    </nav>
  );
}

const MANTELES = [
  { name: "Marfil", color: "#f4efe6" },
  { name: "Blanco", color: "#ffffff" },
  { name: "Champaña", color: "#e8d9c5" },
  { name: "Rosa palo", color: "#e6cfd3" },
  { name: "Azul cielo", color: "#cfdbe6" },
  { name: "Salvia", color: "#d3dccb" },
  { name: "Vino", color: "#7f1d2d" },
  { name: "Negro", color: "#27272a" },
];

/** Acciones del objeto seleccionado. Se monta con key={obj.id} para reiniciar su estado. */
export function ContextBar({ obj, onDuplicate }: { obj: PlacedObject; onDuplicate: () => void }) {
  const store = useEditorApi();
  const [panel, setPanel] = useState<"color" | "medidas" | null>(null);
  const item = findItem(obj.catalogId);
  if (!item) return null;

  const update = (patch: Partial<PlacedObject>) => store.getState().updateObject(obj.id, patch);
  const rotate = (delta: number) => update({ rotation: normalizeAngle(obj.rotation + delta) });
  const seats = seatCount(obj, item);
  const { w, d } = dims(obj, item);
  const locked = Boolean(obj.locked);

  const rename = () => {
    const value = window.prompt("Número o nombre de la mesa", obj.label ?? "");
    if (value !== null) update({ label: value.trim().slice(0, 40) || undefined });
  };

  return (
    <div className="absolute inset-x-2 bottom-2 z-20 rounded-2xl border border-stone-200 bg-white/95 shadow-lg backdrop-blur md:left-auto md:right-3 md:w-[460px]">
      <div className="flex items-baseline justify-between px-3 pt-2">
        <span className="truncate text-sm font-semibold">{objectLabel(obj, item)}</span>
        <span className="shrink-0 pl-2 text-xs text-stone-500">
          {seats ? `${seats} lugares · ` : ""}
          {item.shape === "round" ? `Ø ${w.toFixed(2)} m` : `${w.toFixed(2)} × ${d.toFixed(2)} m`}
        </span>
      </div>
      <div className="flex gap-0.5 overflow-x-auto px-1.5 pb-1.5 pt-1">
        <IconButton icon={RotateCcw} label="−15°" onClick={() => rotate(-15)} disabled={locked} />
        <IconButton icon={RotateCw} label="+15°" onClick={() => rotate(15)} disabled={locked} />
        <IconButton icon={RotateCw} label="90°" onClick={() => rotate(90)} disabled={locked} />
        {item.seats && (
          <>
            <IconButton
              icon={Minus}
              label="Lugar"
              onClick={() => update({ seats: seats - 1 })}
              disabled={seats <= item.seats.min}
            />
            <IconButton
              icon={Plus}
              label="Lugar"
              onClick={() => update({ seats: seats + 1 })}
              disabled={seats >= item.seats.max}
            />
          </>
        )}
        {item.resizable && (
          <IconButton
            icon={Ruler}
            label="Medidas"
            onClick={() => setPanel(panel === "medidas" ? null : "medidas")}
            active={panel === "medidas"}
            disabled={locked}
          />
        )}
        {!item.marker && (
          <IconButton
            icon={Palette}
            label="Color"
            onClick={() => setPanel(panel === "color" ? null : "color")}
            active={panel === "color"}
          />
        )}
        <IconButton icon={Hash} label="Nombre" onClick={rename} />
        <IconButton icon={Copy} label="Duplicar" onClick={onDuplicate} />
        <IconButton
          icon={locked ? LockOpen : Lock}
          label={locked ? "Soltar" : "Fijar"}
          onClick={() => update({ locked: !locked })}
        />
        <IconButton
          icon={Trash2}
          label="Eliminar"
          tone="danger"
          onClick={() => store.getState().removeObject(obj.id)}
          disabled={locked}
        />
      </div>
      {panel === "color" && (
        <div className="flex gap-2 overflow-x-auto border-t border-stone-100 px-3 py-2">
          {MANTELES.map((m) => (
            <button
              key={m.color}
              onClick={() => update({ colors: { ...obj.colors, mantel: m.color } })}
              className="flex shrink-0 flex-col items-center gap-1 text-[10px] text-stone-600"
            >
              <span
                className={`size-9 rounded-full border ${
                  (obj.colors?.mantel ?? item.fill) === m.color ? "ring-2 ring-blue-600 ring-offset-1" : "border-stone-300"
                }`}
                style={{ background: m.color }}
              />
              {m.name}
            </button>
          ))}
        </div>
      )}
      {panel === "medidas" && (
        <div className="grid grid-cols-1 gap-2 border-t border-stone-100 px-3 py-2 text-sm sm:grid-cols-2">
          <Stepper label="Largo" value={w} onChange={(v) => update({ w: v })} />
          {item.shape === "rect" && <Stepper label="Ancho" value={d} onChange={(v) => update({ d: v })} />}
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step = 0.5,
  min = 0.5,
  max = 40,
  unit = "m",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-2 py-1">
      <span className="text-stone-600">{label}</span>
      <div className="flex items-center gap-1">
        <button className="grid size-9 place-items-center rounded-lg active:bg-stone-200" onClick={() => set(value - step)} aria-label={`Menos ${label}`}>
          <Minus size={16} />
        </button>
        <span className="w-16 text-center font-semibold tabular-nums">
          {value.toFixed(2)} {unit}
        </span>
        <button className="grid size-9 place-items-center rounded-lg active:bg-stone-200" onClick={() => set(value + step)} aria-label={`Más ${label}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hojas

function ItemPreview({ item }: { item: CatalogItem }) {
  const size = 40;
  const k = 30 / Math.max(item.w, item.d, 0.6);
  const w = Math.max(item.w * k, 8);
  const d = Math.max(item.d * k, 8);
  return (
    <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} aria-hidden>
      {item.marker ? (
        <>
          <circle r={12} fill={item.marker.color} />
          <text fontSize={item.marker.glyph.length > 1 ? 9 : 11} fill="#fff" fontWeight={700} textAnchor="middle" dominantBaseline="central">
            {item.marker.glyph}
          </text>
        </>
      ) : item.shape === "round" ? (
        <circle r={w / 2} fill={item.fill} stroke="#6b5f50" />
      ) : (
        <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={2} fill={item.fill} stroke="#6b5f50" />
      )}
    </svg>
  );
}

export function CatalogSheet({
  open,
  title,
  kind,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  kind: VenueKind;
  onClose: () => void;
  onPick: (catalogId: string) => void;
}) {
  const categories = categoriesFor(kind);
  const [picked, setCategory] = useState(categories[0].id);
  const category = categories.some((c) => c.id === picked) ? picked : categories[0].id;
  const items = CATALOG.filter((i) => i.category === category);
  return (
    <Sheet title={title} open={open} onClose={onClose}>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`h-9 shrink-0 rounded-full px-3 text-sm font-medium ${
              category === c.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onPick(item.id)}
            className="flex items-center gap-2 rounded-xl border border-stone-200 p-2 text-left active:bg-stone-50"
          >
            <ItemPreview item={item} />
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-tight">{item.name}</span>
              <span className="block text-[11px] text-stone-500">
                {item.marker
                  ? "Marcador"
                  : item.shape === "round"
                    ? `Ø ${item.w.toFixed(2)} m`
                    : `${item.w.toFixed(1)} × ${item.d.toFixed(1)} m`}
                {item.seats ? ` · ${item.seats.default} lugares` : ""}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="size-5 accent-stone-800" />
    </label>
  );
}

export function LayersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useEditorApi();
  const visible = useEditor((s) => s.visible);
  const snapToGrid = useEditor((s) => s.snapToGrid);
  const minAisle = useEditor((s) => s.layout.settings.minAisle);
  return (
    <Sheet title="Capas y ajustes" open={open} onClose={onClose}>
      <div className="divide-y divide-stone-100">
        {LAYERS.map((l) => (
          <Toggle key={l} label={LAYER_LABELS[l]} checked={visible[l]} onChange={() => store.getState().toggleLayer(l)} />
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-stone-200 pt-3">
        <Toggle
          label="Imán a rejilla de 25 cm"
          checked={snapToGrid}
          onChange={() => store.getState().setSnapToGrid(!snapToGrid)}
        />
        <Stepper
          label="Pasillo mínimo"
          value={minAisle}
          step={0.1}
          min={0.8}
          max={2.5}
          onChange={(v) => store.getState().setMinAisle(v)}
        />
      </div>
    </Sheet>
  );
}

export function IssuesSheet({
  open,
  issues,
  onClose,
  onPick,
}: {
  open: boolean;
  issues: Issue[];
  onClose: () => void;
  onPick: (objectId: string) => void;
}) {
  return (
    <Sheet title={`Avisos (${issues.length})`} open={open} onClose={onClose}>
      {issues.length === 0 ? (
        <p className="text-sm text-stone-500">Todo en orden: sin pasillos angostos ni encimados.</p>
      ) : (
        <ul className="space-y-1">
          {issues.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => onPick(i.objectIds[0])}
                className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left text-sm active:bg-stone-50"
              >
                <TriangleAlert size={16} className={`mt-0.5 shrink-0 ${i.level === "error" ? "text-red-600" : "text-amber-600"}`} />
                {i.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function InventorySheet({ open, stats, onClose }: { open: boolean; stats: LayoutStats; onClose: () => void }) {
  return (
    <Sheet title="Inventario del montaje" open={open} onClose={onClose}>
      <p className="mb-3 text-sm text-stone-600">
        {stats.tables} mesas · {stats.seats} sillas · {stats.guests} invitados
      </p>
      <ul className="divide-y divide-stone-100 text-sm">
        {stats.inventory.map((row) => (
          <li key={row.catalogId} className="flex justify-between py-2">
            <span>{row.name}</span>
            <span className="font-semibold tabular-nums">{row.count}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function MenuButton({ children, onClick, tone }: { children: ReactNode; onClick: () => void; tone?: "danger" }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-sm font-medium active:bg-stone-100 ${
        tone === "danger" ? "text-red-600" : "text-stone-800"
      }`}
    >
      {children}
    </button>
  );
}
