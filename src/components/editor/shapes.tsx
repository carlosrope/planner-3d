"use client";

import { memo, useMemo } from "react";
import type { IssueLevel, Neighbor } from "@/lib/layout/analysis";
import { findItem } from "@/lib/layout/catalog";
import { bounds, CHAIR_SIZE, chairsLocal, dims, footprintLocal } from "@/lib/layout/geometry";
import type {
  CadLineLayer,
  FixedElement,
  Level,
  PlacedObject,
  Pt,
  SlabKind,
  VenueSpec,
  WallKind,
} from "@/lib/layout/types";

const INK = "#6b5f50";
const SELECT = "#2563eb";
const LEVEL_COLOR: Record<IssueLevel, string> = { error: "#dc2626", warning: "#d97706" };

const points = (poly: Pt[]) => poly.map((p) => `${p.x},${p.z}`).join(" ");

const FIXED_STYLE: Record<FixedElement["kind"], { fill: string; text?: string }> = {
  column: { fill: "#57534e" },
  stage: { fill: "#d6d0c4", text: "#57534e" },
  bar: { fill: "#cbd8cf", text: "#3f5247" },
  wall: { fill: "#78716c" },
  door: { fill: "#f59e0b", text: "#92400e" },
  exit: { fill: "#16a34a", text: "#166534" },
  kitchen: { fill: "#f59e0b", text: "#92400e" },
  restroom: { fill: "#60a5fa", text: "#1e40af" },
  window: { fill: "#bae6fd" },
};

export const VenueLayer = memo(function VenueLayer({
  venue,
  showOutlets,
  garden = false,
}: {
  venue: VenueSpec;
  showOutlets: boolean;
  /** Casas: el lote se pinta como jardín y la casa encima. */
  garden?: boolean;
}) {
  const b = bounds(venue.floor);
  const lines: { x1: number; z1: number; x2: number; z2: number; major: boolean }[] = [];
  for (let x = Math.ceil(b.minX); x <= b.maxX; x++) {
    lines.push({ x1: x, z1: b.minZ, x2: x, z2: b.maxZ, major: x % 5 === 0 });
  }
  for (let z = Math.ceil(b.minZ); z <= b.maxZ; z++) {
    lines.push({ x1: b.minX, z1: z, x2: b.maxX, z2: z, major: z % 5 === 0 });
  }
  return (
    <g>
      <defs>
        <clipPath id="floor-clip">
          <polygon points={points(venue.floor)} />
        </clipPath>
      </defs>
      <polygon points={points(venue.floor)} fill={garden ? "#e4ead9" : "#fbf8f3"} />
      <g clipPath="url(#floor-clip)">
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.z1}
            x2={l.x2}
            y2={l.z2}
            stroke={l.major ? "#ddd3c4" : "#eee7dc"}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <polygon
        points={points(venue.floor)}
        fill="none"
        stroke="#3f3a34"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />
      {venue.fixed.map((f) => {
        const style = FIXED_STYLE[f.kind];
        const label = f.kind === "exit" ? "SALIDA" : f.label;
        const big = f.w * f.d > 4;
        return (
          <g key={f.id} transform={`translate(${f.x} ${f.z}) rotate(${f.rotation})`}>
            <rect x={-f.w / 2} y={-f.d / 2} width={f.w} height={f.d} fill={style.fill} rx={0.05} />
            {label && style.text && (
              <text
                y={big ? 0 : f.kind === "door" || f.kind === "exit" ? -0.55 : 0}
                transform={`rotate(${-f.rotation})`}
                fontSize={big ? 0.7 : 0.42}
                fill={style.text}
                textAnchor="middle"
                dominantBaseline="central"
                fontWeight={600}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
      {showOutlets &&
        venue.outlets.map((o) => (
          <g key={o.id} transform={`translate(${o.x} ${o.z})`}>
            <circle r={0.22} fill="#facc15" stroke="#a16207" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text fontSize={0.26} textAnchor="middle" dominantBaseline="central" fill="#713f12" fontWeight={700}>
              ⚡
            </text>
          </g>
        ))}
    </g>
  );
});

export const ObjectNode = memo(function ObjectNode({
  obj,
  selected,
  level,
}: {
  obj: PlacedObject;
  selected: boolean;
  level: IssueLevel | null;
}) {
  const item = findItem(obj.catalogId);
  if (!item) return null;
  const { w, d } = dims(obj, item);
  const stroke = level ? LEVEL_COLOR[level] : selected ? SELECT : INK;
  const strokeWidth = level || selected ? 2.5 : 1.2;
  const fill = obj.colors?.mantel ?? item.fill;

  if (item.marker) {
    return (
      <g data-obj={obj.id} transform={`translate(${obj.x} ${obj.z})`}>
        {selected && <circle r={w / 2 + 0.18} fill="none" stroke={SELECT} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />}
        <circle r={w / 2} fill={item.marker.color} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <text fontSize={item.marker.glyph.length > 1 ? 0.24 : 0.3} fill="#fff" fontWeight={700} textAnchor="middle" dominantBaseline="central">
          {item.marker.glyph}
        </text>
      </g>
    );
  }

  const chairs = chairsLocal(obj, item);
  const rug = item.model === "rug";
  const homeItem = Boolean(item.short);
  const label = rug
    ? undefined
    : item.numbered
      ? obj.label
      : obj.label || item.short || (Math.min(w, d) >= 0.8 || w >= 2 ? item.name : undefined);
  const fontSize = item.numbered
    ? Math.max(0.3, Math.min(0.6, Math.min(w, d) * 0.36))
    : homeItem
      ? Math.max(0.13, Math.min(0.24, Math.min(w, d) * 0.2))
      : Math.max(0.24, Math.min(0.55, Math.min(w, d) * 0.22));
  // Medidas en cm debajo del nombre (muebles de casa), como en una ficha de catálogo.
  const size = homeItem && Math.min(w, d) >= 0.7 ? `${Math.round(w * 100)}×${Math.round(d * 100)}` : null;

  return (
    <g data-obj={obj.id} transform={`translate(${obj.x} ${obj.z}) rotate(${obj.rotation})`}>
      {selected && (
        <polygon
          points={points(footprintLocal(obj, item))}
          fill="rgba(37,99,235,0.06)"
          stroke={SELECT}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {chairs.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.z}
          r={CHAIR_SIZE / 2}
          fill={obj.colors?.silla ?? "#e9dfcf"}
          stroke="#9a8d7a"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {item.shape === "round" ? (
        <circle r={w / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      ) : (
        <rect
          x={-w / 2}
          y={-d / 2}
          width={w}
          height={d}
          rx={rug ? 0.02 : 0.06}
          fill={fill}
          fillOpacity={rug ? 0.55 : 1}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={rug && !selected ? "4 3" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {label && (
        <text
          transform={`rotate(${-obj.rotation})`}
          fontSize={fontSize}
          fill="#3f3a34"
          fontWeight={item.numbered ? 700 : 500}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {label}
          {size && (
            <tspan x={0} dy={fontSize * 1.15} fontSize={fontSize * 0.75} fontWeight={400} fill="#78716c">
              {size}
            </tspan>
          )}
        </text>
      )}
      {obj.locked && (
        <text x={w / 2 - 0.2} y={-d / 2 + 0.25} fontSize={0.3} textAnchor="middle" dominantBaseline="central">
          🔒
        </text>
      )}
    </g>
  );
});

const SLAB_FILL: Record<SlabKind, string> = {
  interior: "#fbf8f3",
  terraza: "#efe6d6",
  cochera: "#e7e5e4",
  pasillo: "#eceae5",
};
const WALL_FILL: Record<WallKind, string> = {
  muro: "#2b2724",
  tablaroca: "#6b6560",
  antepecho: "#8d867e",
  barda: "#a8a29e",
};
const LINE_STYLE: Record<CadLineLayer, { stroke: string; width: number }> = {
  exterior: { stroke: "#c4a676", width: 0.7 },
  "mueble-fijo": { stroke: "#7c9a5a", width: 0.8 },
  escalon: { stroke: "#7c3aed", width: 0.8 },
  puerta: { stroke: "#b45309", width: 0.8 },
  ventana: { stroke: "#0369a1", width: 1 },
};
const LINE_ORDER: CadLineLayer[] = ["exterior", "mueble-fijo", "escalon", "puerta", "ventana"];

function linePath(pts: number[], closed?: boolean) {
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
  return closed ? d + "Z" : d;
}

const polyPath = (poly: [number, number][] | Pt[]) =>
  poly
    .map((p, i) => {
      const [x, z] = Array.isArray(p) ? p : [p.x, p.z];
      return `${i ? "L" : "M"}${x} ${z}`;
    })
    .join("") + "Z";

/** Planta de una casa importada de CAD: pisos, trazos, muros y nombres de cuartos. */
export const LevelLayer = memo(function LevelLayer({ level }: { level: Level }) {
  const paths = useMemo(() => {
    const lines = new Map<CadLineLayer, string>();
    for (const l of level.lines) lines.set(l.layer, (lines.get(l.layer) ?? "") + linePath(l.pts, l.closed));
    const walls = new Map<WallKind, string>();
    for (const w of level.walls) walls.set(w.kind, (walls.get(w.kind) ?? "") + polyPath(w.points));
    return { lines, walls };
  }, [level]);

  return (
    <g pointerEvents="none">
      {level.slabs.map((s, i) => (
        <path
          key={i}
          d={polyPath(s.points) + (s.holes ?? []).map((h) => polyPath(h)).join("")}
          fill={SLAB_FILL[s.kind]}
          fillRule="evenodd"
        />
      ))}
      {LINE_ORDER.map((layer) =>
        paths.lines.has(layer) ? (
          <path
            key={layer}
            d={paths.lines.get(layer)}
            fill="none"
            stroke={LINE_STYLE[layer].stroke}
            strokeWidth={LINE_STYLE[layer].width}
            vectorEffect="non-scaling-stroke"
          />
        ) : null,
      )}
      {[...paths.walls].map(([kind, d]) => (
        <path key={kind} d={d} fill={WALL_FILL[kind]} />
      ))}
      {level.rooms.map((r) => (
        <text
          key={r.name}
          x={r.x}
          y={r.z}
          fontSize={0.3}
          fill="#78716c"
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="central"
          letterSpacing={0.02}
        >
          {r.name.toUpperCase()}
        </text>
      ))}
    </g>
  );
});

/** Medidas a los vecinos y guías de alineación mientras se arrastra. */
export function MeasureOverlay({
  neighbors,
  minAisle,
  scale,
  guideX,
  guideZ,
  venue,
}: {
  neighbors: Neighbor[];
  minAisle: number;
  scale: number;
  guideX?: number;
  guideZ?: number;
  venue: VenueSpec;
}) {
  const b = bounds(venue.floor);
  const px = (n: number) => n / scale;
  return (
    <g pointerEvents="none">
      {guideX !== undefined && (
        <line x1={guideX} y1={b.minZ} x2={guideX} y2={b.maxZ} stroke="#db2777" strokeWidth={1} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      )}
      {guideZ !== undefined && (
        <line x1={b.minX} y1={guideZ} x2={b.maxX} y2={guideZ} stroke="#db2777" strokeWidth={1} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      )}
      {neighbors.map((n) => {
        const color = n.overlap ? LEVEL_COLOR.error : n.dist < minAisle ? LEVEL_COLOR.warning : "#15803d";
        const mx = (n.a.x + n.b.x) / 2;
        const mz = (n.a.z + n.b.z) / 2;
        return (
          <g key={n.id}>
            {!n.overlap && (
              <line x1={n.a.x} y1={n.a.z} x2={n.b.x} y2={n.b.z} stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            )}
            <text
              x={mx}
              y={mz - px(10)}
              fontSize={px(13)}
              fontWeight={700}
              fill={color}
              stroke="#fff"
              strokeWidth={px(4)}
              paintOrder="stroke"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {n.overlap ? "encima" : `${n.dist.toFixed(2)} m`}
            </text>
          </g>
        );
      })}
    </g>
  );
}
