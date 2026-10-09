"use client";

import { Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { DistMeta, MetaPatch } from "./distributions";
import { Sheet } from "./Sheet";

/** Pestañas A/B/C: tocar una la muestra; tocar la activa abre sus datos. */
export function DistributionBar({
  metas,
  activeId,
  onSelect,
  onCreate,
  onEdit,
}: {
  metas: DistMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar z-20 flex items-center gap-1.5 overflow-x-auto border-b border-stone-200 bg-white px-2 py-1.5">
      {metas.map((m) => {
        const active = m.id === activeId;
        return (
          <button
            key={m.id}
            onClick={() => (active ? onEdit(m.id) : onSelect(m.id))}
            aria-pressed={active}
            className={`flex h-9 max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ${
              active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 active:bg-stone-200"
            }`}
          >
            <span className="font-bold">{m.name}</span>
            {m.note && <span className="truncate">{m.note}</span>}
            {m.recommended && (
              <Star size={13} fill="currentColor" className={`shrink-0 ${active ? "text-amber-300" : "text-amber-500"}`} />
            )}
            {active && <Pencil size={13} className="shrink-0 opacity-60" />}
          </button>
        );
      })}
      <button
        onClick={onCreate}
        className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-dashed border-stone-300 px-3 text-sm text-stone-600 active:bg-stone-100"
      >
        <Plus size={15} /> Nueva
      </button>
    </div>
  );
}

const field =
  "h-11 w-full select-text rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

/** Datos de una distribución. Se monta con key={meta.id} para reiniciar los campos. */
export function DistributionSheet({
  open,
  meta,
  canDelete,
  onClose,
  onChange,
  onDuplicate,
  onDelete,
}: {
  open: boolean;
  meta: DistMeta;
  canDelete: boolean;
  onClose: () => void;
  onChange: (patch: MetaPatch) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(meta.name);
  const [note, setNote] = useState(meta.note);

  // Los textos se guardan al salir del campo o al cerrar, no en cada tecla.
  const commit = () => {
    const patch: MetaPatch = {};
    const cleanName = name.trim().slice(0, 12);
    const cleanNote = note.trim().slice(0, 60);
    if (cleanName && cleanName !== meta.name) patch.name = cleanName;
    if (cleanNote !== meta.note) patch.note = cleanNote;
    if (Object.keys(patch).length) onChange(patch);
  };

  return (
    <Sheet
      title={`Distribución ${meta.name}`}
      open={open}
      onClose={() => {
        commit();
        onClose();
      }}
    >
      <div className="space-y-3" style={{ WebkitUserSelect: "text" }}>
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Nombre corto</span>
          <input value={name} maxLength={12} onChange={(e) => setName(e.target.value)} onBlur={commit} className={field} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Descripción</span>
          <input
            value={note}
            maxLength={60}
            placeholder="Ej. Cama junto a la ventana"
            onChange={(e) => setNote(e.target.value)}
            onBlur={commit}
            className={field}
          />
        </label>
        <button
          onClick={() => onChange({ recommended: !meta.recommended })}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium ${
            meta.recommended ? "border-amber-300 bg-amber-50 text-amber-800" : "border-stone-300 text-stone-700"
          }`}
        >
          <Star size={16} fill={meta.recommended ? "currentColor" : "none"} />
          {meta.recommended ? "Es la recomendada" : "Marcar como recomendada"}
        </button>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              commit();
              onDuplicate();
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-medium text-white active:bg-stone-700"
          >
            <Copy size={16} /> Duplicar
          </button>
          <button
            disabled={!canDelete}
            onClick={() => {
              if (window.confirm(`¿Eliminar la distribución ${meta.name}? No se puede deshacer.`)) onDelete();
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 active:bg-red-50 disabled:opacity-40"
          >
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
        {!canDelete && <p className="text-xs text-stone-500">Siempre debe quedar al menos una distribución.</p>}
      </div>
    </Sheet>
  );
}
