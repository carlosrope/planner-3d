"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { onLevel } from "@/lib/layout/analysis";
import { findItem, type CatalogItem } from "@/lib/layout/catalog";
import { bounds, chairsLocal, dims } from "@/lib/layout/geometry";
import type { FixedElement, Level, Opening, PlacedObject, Pt, VenueInfo, VenueSpec } from "@/lib/layout/types";
import { useEditor } from "./store";

// Vista 3D del mismo documento que el plano 2D. Todo es geometría generada por
// código (sin modelos externos), para que cargue rápido en el teléfono.

type ViewName = "frente" | "arriba" | "lado" | "fondo" | "dentro";
type Inside = { x: number; z: number; base: number; name: string; view?: [number, number, number, number] } | null;

const WALL = "#f2eee7";
const WOOD = "#b8946b";
const GLASS = "#a9cbe6";
const SLAB_COLOR = { interior: "#e9dfcf", terraza: "#cdbba3", cochera: "#cfcdc8", pasillo: "#d8d4cc" } as const;
const SILL = 0.9;
const LINTEL = 2.2;
const CUT = 1.2;

const v2 = (p: Pt | [number, number]) =>
  Array.isArray(p) ? new THREE.Vector2(p[0], -p[1]) : new THREE.Vector2(p.x, -p.z);

/** Prismas (muros, losas) unidos en una sola geometría: pocas llamadas de dibujo. */
function prisms(items: { points: (Pt | [number, number])[]; holes?: [number, number][][] }[], height: number) {
  if (!items.length || height <= 0) return null;
  const geos = items.map((it) => {
    const shape = new THREE.Shape(it.points.map(v2));
    for (const h of it.holes ?? []) shape.holes.push(new THREE.Path(h.map(v2)));
    return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

function Prisms({
  items,
  bottom,
  height,
  color,
  opacity = 1,
}: {
  items: { points: (Pt | [number, number])[]; holes?: [number, number][][] }[];
  bottom: number;
  height: number;
  color: string;
  opacity?: number;
}) {
  const geometry = useMemo(() => prisms(items, height), [items, height]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} position-y={bottom}>
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity === 1}
        side={opacity < 1 ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

function Box({
  size,
  position,
  color,
  opacity = 1,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  opacity?: number;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

const rectOf = (o: { x: number; z: number; w: number; d: number }): Pt[] => [
  { x: o.x - o.w / 2, z: o.z - o.d / 2 },
  { x: o.x + o.w / 2, z: o.z - o.d / 2 },
  { x: o.x + o.w / 2, z: o.z + o.d / 2 },
  { x: o.x - o.w / 2, z: o.z + o.d / 2 },
];

function overlaps(a: Pt[], o: Opening) {
  const b = bounds(a);
  return b.minX < o.x + o.w / 2 && b.maxX > o.x - o.w / 2 && b.minZ < o.z + o.d / 2 && b.maxZ > o.z - o.d / 2;
}

/** Etiqueta de texto como sprite (textura de canvas): tamaño fijo en pantalla y sin raíces de React extra. */
function Label({ text, position }: { text: string; position: [number, number, number] }) {
  const { texture, aspect } = useMemo(() => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = `600 ${22 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 28 * scale;
    const h = 36 * scale;
    canvas.width = w;
    canvas.height = h;
    ctx.font = font;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = "#44403c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + scale);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return { texture: t, aspect: w / h };
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  const height = 0.024;
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} transparent />
    </sprite>
  );
}

/** Una planta de la casa: losas, muros, ventanas, escalera y trazos del CAD. */
function LevelMeshes({
  level,
  next,
  slabThickness,
  cut,
  labels,
}: {
  level: Level;
  next?: Level;
  slabThickness: number;
  cut: boolean;
  labels: boolean;
}) {
  const base = level.elevation;
  const wallH = cut ? Math.min(CUT, level.height) : level.height;
  const by = useMemo(() => {
    const walls = level.walls.filter((w) => w.kind === "muro" || w.kind === "tablaroca");
    const sills = level.walls.filter((w) => w.kind === "antepecho");
    const fences = level.walls.filter((w) => w.kind === "barda");
    // Ventanales sin antepecho: vidrio desde el piso.
    const panes = level.openings.filter(
      (o) => o.kind !== "puerta" && Math.min(o.w, o.d) < 0.35 && !sills.some((s) => overlaps(s.points, o)),
    );
    const slabs = Object.entries(SLAB_COLOR).map(([kind, color]) => ({
      color,
      items: level.slabs.filter((s) => s.kind === kind),
    }));
    return { walls, sills, fences, panes: panes.map((o) => ({ points: rectOf(o) })), slabs };
  }, [level]);

  const floorLines = useMemo(() => {
    const pos: number[] = [];
    for (const l of level.lines) {
      if (l.layer !== "mueble-fijo" && l.layer !== "exterior") continue;
      const p = l.pts;
      const n = p.length / 2;
      for (let i = 0; i < n - 1 + (l.closed ? 1 : 0); i++) {
        const j = (i + 1) % n;
        pos.push(p[i * 2], 0, p[i * 2 + 1], p[j * 2], 0, p[j * 2 + 1]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [level]);
  useEffect(() => () => floorLines.dispose(), [floorLines]);

  const rise = next ? (next.elevation - level.elevation) / ((level.stairs[0]?.steps.length ?? 0) + 1) : 0;

  return (
    <group>
      {by.slabs.map((s) => (
        <Prisms key={s.color} items={s.items} bottom={base - slabThickness} height={slabThickness} color={s.color} />
      ))}
      <lineSegments geometry={floorLines} position-y={base + 0.006}>
        <lineBasicMaterial color="#8a7e6d" />
      </lineSegments>
      <Prisms items={by.walls} bottom={base} height={wallH} color={WALL} />
      <Prisms items={by.sills} bottom={base} height={Math.min(SILL, wallH)} color={WALL} />
      {wallH > SILL && (
        <Prisms items={by.sills} bottom={base + SILL} height={Math.min(LINTEL, wallH) - SILL} color={GLASS} opacity={0.3} />
      )}
      <Prisms items={by.panes} bottom={base} height={Math.min(LINTEL, wallH)} color={GLASS} opacity={0.3} />
      {!cut && (
        <>
          <Prisms items={by.sills} bottom={base + LINTEL} height={level.height - LINTEL} color={WALL} />
          <Prisms items={by.panes} bottom={base + LINTEL} height={level.height - LINTEL} color={WALL} />
        </>
      )}
      <Prisms items={by.fences} bottom={base} height={cut ? CUT : 2.4} color="#d9d2c6" />
      {next &&
        level.stairs.flatMap((st) =>
          st.steps.map(([x0, z0, x1, z1], i) => {
            const h = rise * (i + 1);
            return (
              <Box
                key={`${x0}-${z0}`}
                size={[x1 - x0, h, z1 - z0]}
                position={[(x0 + x1) / 2, base + h / 2, (z0 + z1) / 2]}
                color="#d8cfc0"
              />
            );
          }),
        )}
      {labels && level.rooms.map((r) => <Label key={r.name} text={r.name} position={[r.x, base + 0.5, r.z]} />)}
    </group>
  );
}

/** Salón (sin plantas de CAD): piso, muro perimetral y elementos fijos. */
function SalonMeshes({ spec, cut }: { spec: VenueSpec; cut: boolean }) {
  const perimeter = useMemo(() => {
    const t = 0.2;
    const poly = spec.floor;
    const c = poly.reduce((a, p) => ({ x: a.x + p.x / poly.length, z: a.z + p.z / poly.length }), { x: 0, z: 0 });
    return poly.map((a, i) => {
      const b = poly[(i + 1) % poly.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      let nx = -(b.z - a.z) / len;
      let nz = (b.x - a.x) / len;
      const mx = (a.x + b.x) / 2 - c.x;
      const mz = (a.z + b.z) / 2 - c.z;
      if (nx * mx + nz * mz < 0) {
        nx = -nx;
        nz = -nz;
      }
      return { points: [a, b, { x: b.x + nx * t, z: b.z + nz * t }, { x: a.x + nx * t, z: a.z + nz * t }] };
    });
  }, [spec.floor]);
  const fixedH = (f: FixedElement) =>
    f.kind === "column" ? (cut ? CUT : 3.6) : f.kind === "stage" ? 0.8 : f.kind === "bar" ? 1.1 : 0.02;
  const fixedColor: Record<FixedElement["kind"], string> = {
    column: "#d6d0c6",
    stage: "#cfc6b8",
    bar: "#9fb3a6",
    wall: "#d6d0c6",
    door: "#f59e0b",
    exit: "#16a34a",
    kitchen: "#f59e0b",
    restroom: "#60a5fa",
    window: GLASS,
  };
  return (
    <group>
      <Prisms items={[{ points: spec.floor }]} bottom={-0.1} height={0.1} color="#e9e2d6" />
      <Prisms items={perimeter} bottom={0} height={cut ? CUT : 3.6} color={WALL} />
      {spec.fixed.map((f) => {
        const h = fixedH(f);
        return (
          <mesh key={f.id} position={[f.x, h / 2, f.z]} rotation-y={(-f.rotation * Math.PI) / 180}>
            <boxGeometry args={[f.w, h, f.d]} />
            <meshStandardMaterial color={fixedColor[f.kind]} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Mueble procedural según su tipo de modelo. Coordenadas locales: x ancho, z fondo. */
function Furniture({ obj, item, base }: { obj: PlacedObject; item: CatalogItem; base: number }) {
  const { w, d } = dims(obj, item);
  const h = item.h ?? 0.8;
  const color = obj.colors?.mantel ?? item.fill;
  const model = item.model ?? "box";
  let body: ReactNode;

  if (model === "table") {
    const event = item.category === "mesas";
    if (event) {
      body =
        item.shape === "round" ? (
          <>
            <mesh position-y={h / 2}>
              <cylinderGeometry args={[w / 2 + 0.03, w / 2 + 0.1, h, 32]} />
              <meshStandardMaterial color={color} roughness={0.95} />
            </mesh>
            <mesh position-y={h + 0.18}>
              <sphereGeometry args={[Math.min(0.22, w * 0.12), 16, 12]} />
              <meshStandardMaterial color={obj.colors?.flor ?? "#f1d9de"} roughness={0.9} />
            </mesh>
          </>
        ) : (
          <Box size={[w + 0.06, h, d + 0.06]} position={[0, h / 2, 0]} color={color} />
        );
    } else {
      const legs: [number, number][] =
        item.shape === "round"
          ? [[0, 0]]
          : [
              [-w / 2 + 0.06, -d / 2 + 0.06],
              [w / 2 - 0.06, -d / 2 + 0.06],
              [w / 2 - 0.06, d / 2 - 0.06],
              [-w / 2 + 0.06, d / 2 - 0.06],
            ];
      body = (
        <>
          {item.shape === "round" ? (
            <mesh position-y={h - 0.02}>
              <cylinderGeometry args={[w / 2, w / 2, 0.04, 32]} />
              <meshStandardMaterial color={WOOD} roughness={0.7} />
            </mesh>
          ) : (
            <Box size={[w, 0.04, d]} position={[0, h - 0.02, 0]} color={WOOD} />
          )}
          {legs.map(([x, z], i) => (
            <Box key={i} size={[0.05, h - 0.04, 0.05]} position={[x, (h - 0.04) / 2, z]} color="#7c6650" />
          ))}
        </>
      );
    }
  } else if (model === "bed") {
    const duvet = obj.colors?.mantel ?? "#d8cbbb";
    body = (
      <>
        <Box size={[w, 0.3, d]} position={[0, 0.15, 0]} color={WOOD} />
        <Box size={[w - 0.04, 0.22, d - 0.08]} position={[0, 0.41, 0.02]} color="#f7f4ee" />
        <Box size={[w - 0.02, 0.06, d * 0.62]} position={[0, 0.54, d * 0.18]} color={duvet} />
        <Box size={[w * 0.4, 0.1, 0.32]} position={[-w * 0.23, 0.57, -d / 2 + 0.28]} color="#ffffff" />
        <Box size={[w * 0.4, 0.1, 0.32]} position={[w * 0.23, 0.57, -d / 2 + 0.28]} color="#ffffff" />
        <Box size={[w + 0.04, 1.05, 0.08]} position={[0, 0.525, -d / 2 - 0.02]} color="#9c7b5a" />
      </>
    );
  } else if (model === "sofa") {
    const arms = Math.min(0.18, w * 0.15);
    body = (
      <>
        <Box size={[w, 0.42, d - 0.18]} position={[0, 0.21, 0.09]} color={color} />
        <Box size={[w, h, 0.2]} position={[0, h / 2, -d / 2 + 0.1]} color={color} />
        <Box size={[arms, 0.62, d]} position={[-w / 2 + arms / 2, 0.31, 0]} color={color} />
        <Box size={[arms, 0.62, d]} position={[w / 2 - arms / 2, 0.31, 0]} color={color} />
      </>
    );
  } else if (model === "rug") {
    body =
      item.shape === "round" ? (
        <mesh position-y={0.006}>
          <cylinderGeometry args={[w / 2, w / 2, 0.012, 32]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ) : (
        <Box size={[w, 0.012, d]} position={[0, 0.006, 0]} color={color} />
      );
  } else if (model === "plant") {
    const flower = item.id !== "planta";
    body = flower ? (
      <>
        <mesh position-y={(h - 0.3) / 2}>
          <cylinderGeometry args={[0.03, 0.08, h - 0.3, 12]} />
          <meshStandardMaterial color="#c8a252" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position-y={h - 0.15}>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshStandardMaterial color={obj.colors?.flor ?? "#f1d9de"} roughness={0.9} />
        </mesh>
      </>
    ) : (
      <>
        <mesh position-y={0.18}>
          <cylinderGeometry args={[0.2, 0.15, 0.36, 16]} />
          <meshStandardMaterial color="#b4693a" roughness={0.9} />
        </mesh>
        <mesh position-y={h - 0.35}>
          <sphereGeometry args={[0.36, 16, 12]} />
          <meshStandardMaterial color="#5f8d4e" roughness={0.95} />
        </mesh>
      </>
    );
  } else if (model === "person") {
    body = (
      <>
        <mesh position-y={0.68}>
          <cylinderGeometry args={[0.17, 0.21, 1.3, 16]} />
          <meshStandardMaterial color={item.marker?.color ?? color} roughness={0.8} />
        </mesh>
        <mesh position-y={1.48}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial color="#e3bf9c" roughness={0.8} />
        </mesh>
      </>
    );
  } else {
    body =
      item.shape === "round" ? (
        <mesh position-y={h / 2}>
          <cylinderGeometry args={[w / 2, w / 2, h, 32]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ) : (
        <Box size={[w, h, d]} position={[0, h / 2, 0]} color={color} />
      );
  }

  return (
    <group position={[obj.x, base, obj.z]} rotation-y={(-obj.rotation * Math.PI) / 180}>
      {body}
    </group>
  );
}

/** Todas las sillas en dos mallas instanciadas (asiento y respaldo): cientos de sillas sin perder fluidez. */
function Chairs({ objects, baseOf }: { objects: PlacedObject[]; baseOf: (o: PlacedObject) => number }) {
  const data = useMemo(() => {
    const parent = new THREE.Object3D();
    const chair = new THREE.Object3D();
    parent.add(chair);
    const seats: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    for (const o of objects) {
      const item = findItem(o.catalogId);
      if (!item?.seats) continue;
      parent.position.set(o.x, baseOf(o), o.z);
      parent.rotation.set(0, (-o.rotation * Math.PI) / 180, 0);
      for (const c of chairsLocal(o, item)) {
        chair.position.set(c.x, 0, c.z);
        chair.rotation.set(0, Math.PI / 2 - (c.angle * Math.PI) / 180, 0);
        parent.updateMatrixWorld(true);
        seats.push(chair.matrixWorld.clone());
        colors.push(new THREE.Color(o.colors?.silla ?? (item.category === "mesas" ? "#d9c7a7" : "#8b6d4f")));
      }
    }
    return { seats, colors };
  }, [objects, baseOf]);

  const seatGeo = useMemo(() => new THREE.BoxGeometry(0.42, 0.05, 0.42).translate(0, 0.45, 0), []);
  const backGeo = useMemo(() => new THREE.BoxGeometry(0.42, 0.45, 0.04).translate(0, 0.7, -0.19), []);

  const bind = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    data.seats.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, data.colors[i]);
    });
    mesh.count = data.seats.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  };

  if (!data.seats.length) return null;
  return (
    <>
      <instancedMesh key={`s${data.seats.length}`} ref={bind} args={[seatGeo, undefined, data.seats.length]}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh key={`b${data.seats.length}`} ref={bind} args={[backGeo, undefined, data.seats.length]}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </>
  );
}

function CameraRig({ view, inside, spec }: { view: ViewName; inside: Inside; spec: VenueSpec }) {
  // Cámara y controles son objetos de Three.js que se modifican a propósito: se leen dentro del efecto.
  const get = useThree((s) => s.get);
  const ready = useThree((s) => Boolean(s.controls));
  useEffect(() => {
    const { camera, invalidate } = get();
    const controls = get().controls as OrbitControlsImpl | null;
    if (!controls) return;
    if (camera instanceof THREE.PerspectiveCamera) {
      // Dentro de un cuarto se ve mejor con gran angular, como una foto inmobiliaria.
      camera.fov = view === "dentro" ? 72 : 45;
      camera.updateProjectionMatrix();
    }
    const b = bounds(spec.floor);
    const w = b.maxX - b.minX;
    const d = b.maxZ - b.minZ;
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const big = Math.max(w, d);
    if (view === "dentro" && inside) {
      // Mirar desde un punto del cuarto: la cámara gira sobre sí misma (radio muy corto).
      controls.minDistance = 0.05;
      const [cx0, cz0, lx, lz] = inside.view ?? [inside.x, inside.z + 0.1, inside.x, inside.z - 1];
      const len = Math.hypot(lx - cx0, lz - cz0) || 1;
      const eye = inside.base + 1.55;
      camera.position.set(cx0, eye, cz0);
      controls.target.set(cx0 + ((lx - cx0) / len) * 0.1, eye - 0.02, cz0 + ((lz - cz0) / len) * 0.1);
    } else {
      controls.minDistance = 2;
      const presets: Record<Exclude<ViewName, "dentro">, [number, number, number]> = {
        frente: [cx + w * 0.8, big * 0.85, b.maxZ + d * 0.55],
        arriba: [cx, big * 1.45, cz + 0.01],
        lado: [b.maxX + big * 0.9, big * 0.55, cz],
        fondo: [cx - w * 0.4, big * 0.7, b.minZ - d * 0.6],
      };
      controls.target.set(cx, 0.8, cz);
      camera.position.set(...presets[view === "dentro" ? "frente" : view]);
    }
    controls.update();
    invalidate();
  }, [view, inside, ready, get, spec.floor]);
  return null;
}

export default function Scene3D({ venue, onClose }: { venue: VenueInfo; onClose: () => void }) {
  const layout = useEditor((s) => s.layout);
  const activeLevel = useEditor((s) => s.activeLevel);
  const spec = venue.spec;
  const floors = useMemo(() => spec.levels ?? [], [spec.levels]);
  const [upTo, setUpTo] = useState(() => Math.max(0, floors.findIndex((f) => f.id === activeLevel)));
  const [cut, setCut] = useState(false);
  const [labels, setLabels] = useState(true);
  const [view, setView] = useState<ViewName>("frente");
  const [inside, setInside] = useState<Inside>(null);

  const shownFloors = floors.slice(0, upTo + 1);
  const baseOf = useMemo(() => {
    const byId = new Map(floors.map((f) => [f.id, f.elevation]));
    return (o: PlacedObject) => (o.level ? (byId.get(o.level) ?? 0) : 0);
  }, [floors]);
  const objects = useMemo(
    () =>
      layout.objects.filter((o) =>
        floors.length ? shownFloors.some((f) => onLevel(o, spec, f.id)) : true,
      ),
    [layout.objects, floors.length, shownFloors, spec],
  );
  const rooms = floors[upTo]?.rooms ?? [];
  const b = bounds(spec.floor);

  return (
    <div className="absolute inset-0 z-30 bg-[#dfe7ee]">
      <Canvas
        dpr={[1, 1.75]}
        frameloop="demand"
        camera={{ fov: 45, near: 0.05, far: 600, position: [20, 20, 30] }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#dfe7ee"]} />
        <hemisphereLight args={["#ffffff", "#b9ab92", 1.1]} />
        <directionalLight position={[18, 30, 12]} intensity={1.7} />
        <directionalLight position={[-12, 18, -20]} intensity={0.45} />
        <mesh rotation-x={-Math.PI / 2} position={[(b.minX + b.maxX) / 2, -0.15, (b.minZ + b.maxZ) / 2]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#c9d2bf" roughness={1} />
        </mesh>
        {floors.length ? (
          <>
            <Prisms items={[{ points: spec.floor }]} bottom={-0.12} height={0.04} color="#9fbb84" />
            {shownFloors.map((f, i) => {
              const prev = floors[i - 1];
              const thickness = prev ? Math.max(0.12, f.elevation - (prev.elevation + prev.height)) : 0.08;
              return (
                <LevelMeshes
                  key={f.id}
                  level={f}
                  next={floors[i + 1]}
                  slabThickness={thickness}
                  cut={cut && i === upTo}
                  labels={labels && i === upTo}
                />
              );
            })}
          </>
        ) : (
          <SalonMeshes spec={spec} cut={cut} />
        )}
        {objects.map((o) => {
          const item = findItem(o.catalogId);
          return item ? <Furniture key={o.id} obj={o} item={item} base={baseOf(o)} /> : null;
        })}
        <Chairs objects={objects} baseOf={baseOf} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2 - 0.04} maxDistance={160} />
        <CameraRig view={view} inside={inside} spec={spec} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2">
        <button
          onClick={onClose}
          className="pointer-events-auto flex h-11 items-center gap-1 rounded-full bg-white/95 pl-2 pr-4 text-sm font-semibold shadow-md active:bg-stone-100"
        >
          <ChevronLeft size={20} /> Plano 2D
        </button>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1 rounded-2xl bg-white/90 p-1 shadow-md">
          {(
            [
              ["frente", "Exterior"],
              ["arriba", "Arriba"],
              ["lado", "Lado"],
              ["fondo", "Fondo"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setInside(null);
                setView(id);
              }}
              className={`h-9 rounded-xl px-3 text-sm font-medium ${view === id ? "bg-stone-900 text-white" : "text-stone-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-2 flex flex-col gap-2"
        style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {rooms.length > 0 && (
          <div className="pointer-events-auto flex gap-1 overflow-x-auto rounded-2xl bg-white/90 p-1 shadow-md">
            <span className="shrink-0 self-center px-2 text-xs font-semibold text-stone-500">Ver desde:</span>
            {rooms.map((r) => (
              <button
                key={r.name}
                onClick={() => {
                  setCut(false);
                  setInside({ x: r.x, z: r.z, base: floors[upTo].elevation, name: r.name, view: r.view });
                  setView("dentro");
                }}
                className={`h-9 shrink-0 rounded-xl px-3 text-sm font-medium ${
                  inside?.name === r.name && view === "dentro" ? "bg-stone-900 text-white" : "text-stone-700"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
        <div className="pointer-events-auto flex flex-wrap gap-1 self-start rounded-2xl bg-white/90 p-1 shadow-md">
          {floors.length > 1 &&
            floors.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setUpTo(i)}
                className={`h-9 rounded-xl px-3 text-sm font-medium ${upTo === i ? "bg-stone-900 text-white" : "text-stone-700"}`}
              >
                {i === 0 ? f.name : `Hasta ${f.name.toLowerCase()}`}
              </button>
            ))}
          <button
            onClick={() => setCut(!cut)}
            className={`h-9 rounded-xl px-3 text-sm font-medium ${cut ? "bg-stone-900 text-white" : "text-stone-700"}`}
          >
            Muros cortados
          </button>
          {floors.length > 0 && (
            <button
              onClick={() => setLabels(!labels)}
              className={`h-9 rounded-xl px-3 text-sm font-medium ${labels ? "bg-stone-900 text-white" : "text-stone-700"}`}
            >
              Nombres
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
