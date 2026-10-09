"use client";

import { memo } from "react";
import type { IssueLevel, Neighbor } from "@/lib/layout/analysis";
import { findItem } from "@/lib/layout/catalog";
import { bounds, CHAIR_SIZE, chairsLocal, dims, footprintLocal } from "@/lib/layout/geometry";
import type { FixedElement, PlacedObject, Pt, VenueSpec } from "@/lib/layout/types";

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
}: {
  venue: VenueSpec;
  showOutlets: boolean;
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
      <polygon points={points(venue.floor)} fill="#fbf8f3" />
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
  const label = item.numbered ? obj.label : obj.label || (Math.min(w, d) >= 0.8 || w >= 2 ? item.name : undefined);
  const fontSize = item.numbered
    ? Math.max(0.3, Math.min(0.6, Math.min(w, d) * 0.36))
    : Math.max(0.24, Math.min(0.55, Math.min(w, d) * 0.22));

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
          rx={0.06}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
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
