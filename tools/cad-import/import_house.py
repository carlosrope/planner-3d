"""Importa las plantas de una casa desde un DXF arquitectónico a JSON para Planner 3D.

Flujo completo:
    dwg2dxf -o plano.dxf plano.dwg            # LibreDWG (herramienta local, no se distribuye)
    python import_house.py config.json salida.json

La configuración dice qué zona del dibujo es cada planta, dónde está la esquina
del lote y los datos que el CAD no trae limpios (nombres de cuartos, escaleras,
dobles alturas). Unidades: metros. Ejes de salida: x a la derecha, z hacia abajo
(fondo del lote arriba, calle abajo), igual que el editor.
"""

import json
import sys
from pathlib import Path

import ezdxf

# "muro-bajo" se reclasifica después en "antepecho" (bajo ventanas) o "barda" (límite del lote).
WALL_LAYERS = {
    "A-MUROS": "muro",
    "A-MUR-CALIDAD": "muro",
    "A-TABLAROCA": "tablaroca",
    "A-MUROS BAJOS": "muro-bajo",
}
LINE_LAYERS = {
    "A-PUERTAS": "puerta",
    "A-VENTANAS": "ventana",
    "A-CANCELERIA": "ventana",
    "A-ESCALON": "escalon",
    "A-MUEBLES FIJOS": "mueble-fijo",
    "A-MUEBLES-FIJOS": "mueble-fijo",
    "A-EXTERIOR": "exterior",
}
OPENING_LAYERS = {"A-PUERTAS": "puerta", "A-VENTANAS": "ventana", "A-CANCELERIA": "cancel"}
FLATTEN = 0.03  # tolerancia para convertir arcos en segmentos (m)
MIN_LINE = 0.03  # se descartan trazos más cortos (herrajes, sombras) para aligerar el archivo


def short(layer: str) -> str:
    """Quita el prefijo de referencias externas ("AR-01-REC$0$A-MUROS" → "A-MUROS")."""
    return layer.split("$0$")[-1].upper()


def geometry(e):
    """Puntos (x, y) y si la figura es cerrada; None si no es geometría de línea."""
    t = e.dxftype()
    if t == "LINE":
        return [(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)], False
    if t == "LWPOLYLINE":
        pts = [(p[0], p[1]) for p in e.get_points("xy")]
        return pts, bool(e.closed)
    if t == "POLYLINE":
        pts = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]
        return pts, bool(e.is_closed)
    if t in ("ARC", "CIRCLE", "ELLIPSE", "SPLINE"):
        pts = [(p.x, p.y) for p in e.flattening(FLATTEN)]
        return pts, t == "CIRCLE"
    return None


def walk(entities, inherited, out, opening=None, depth=0):
    """Recorre entidades explotando bloques; `out` recibe (capa, puntos, cerrada)."""
    for e in entities:
        layer = e.dxf.get("layer", "0")
        effective = inherited if layer == "0" and inherited else layer
        name = short(effective)
        if e.dxftype() == "INSERT":
            if depth > 8:
                continue
            try:
                children = list(e.virtual_entities())
            except Exception:  # noqa: BLE001 - bloques dañados en la conversión
                continue
            if opening is None and name in OPENING_LAYERS:
                found = {"kind": OPENING_LAYERS[name], "points": []}
                walk(children, effective, out, found, depth + 1)
                if found["points"]:
                    out.append(("__opening__", found, False))
            else:
                walk(children, effective if layer != "0" else inherited, out, opening, depth + 1)
            continue
        try:
            geo = geometry(e)
        except Exception:  # noqa: BLE001
            continue
        if not geo or len(geo[0]) < 2:
            continue
        pts, closed = geo
        if opening is not None:
            opening["points"].extend(pts)
        out.append((name, pts, closed))


def inside(pts, window):
    x0, y0, x1, y1 = window
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    return x0 <= cx <= x1 and y0 <= cy <= y1


def length(pts, closed):
    pairs = list(zip(pts, pts[1:] + (pts[:1] if closed else [])))
    return sum(((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5 for a, b in pairs)


def area(pts):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))) / 2


def is_fence(points, lot, tol=0.25):
    """Un muro bajo pegado al límite del lote y largo es una barda, no un antepecho."""
    xs = [p["x"] for p in points]
    zs = [p["z"] for p in points]
    on_edge = min(xs) <= tol or max(xs) >= lot["width"] - tol or min(zs) <= tol or max(zs) >= lot["depth"] - tol
    return on_edge and max(max(xs) - min(xs), max(zs) - min(zs)) > 2.0


def build_level(raw, level, lot):
    ox, oy = level["origin"]
    exclude_walls = set(level.get("excludeWalls", []))
    exclude_lines = set(level.get("excludeLines", []))

    def tr(pts):
        return [{"x": round(x - ox, 3), "z": round(oy - y, 3)} for x, y in pts]

    walls, lines, openings, seen = [], [], [], set()
    for name, pts, closed in raw:
        if name == "__opening__":
            ptsw = pts["points"]
            if not inside(ptsw, level["window"]):
                continue
            xs = [p[0] for p in ptsw]
            ys = [p[1] for p in ptsw]
            (x0, z0), (x1, z1) = [(p["x"], p["z"]) for p in tr([(min(xs), max(ys)), (max(xs), min(ys))])]
            openings.append({
                "kind": pts["kind"],
                "x": round((x0 + x1) / 2, 3),
                "z": round((z0 + z1) / 2, 3),
                "w": round(x1 - x0, 3),
                "d": round(z1 - z0, 3),
            })
            continue
        if not inside(pts, level["window"]):
            continue
        if name in WALL_LAYERS and closed and len(pts) >= 3 and area(pts) > 0.005:
            key = tuple(sorted((round(x, 2), round(y, 2)) for x, y in pts))
            if key in seen:
                continue
            seen.add(key)
            points = tr(pts)
            kind = WALL_LAYERS[name]
            if kind == "muro-bajo":
                kind = "barda" if is_fence(points, lot) else "antepecho"
            if kind not in exclude_walls:
                walls.append({"kind": kind, "points": points})
        elif name in LINE_LAYERS and LINE_LAYERS[name] not in exclude_lines:
            if length(pts, closed) < MIN_LINE:
                continue
            # Formato compacto para el navegador: [x0, z0, x1, z1, ...].
            flat = [v for p in tr(pts) for v in (p["x"], p["z"])]
            line = {"layer": LINE_LAYERS[name], "pts": flat}
            if closed:
                line["closed"] = True
            lines.append(line)

    for i, w in enumerate(walls):
        w["id"] = f"{level['id']}-m{i + 1}"
    for i, o in enumerate(openings):
        o["id"] = f"{level['id']}-v{i + 1}"
    return {
        "id": level["id"],
        "name": level["name"],
        "elevation": level["elevation"],
        "height": level["height"],
        "walls": walls,
        "openings": openings,
        "lines": lines,
        "slabs": level.get("slabs", []),
        "rooms": level.get("rooms", []),
        "stairs": level.get("stairs", []),
    }


def main(config_path: str, output_path: str):
    config = json.loads(Path(config_path).read_text(encoding="utf-8"))
    source = Path(config_path).parent / config["source"]
    doc = ezdxf.readfile(source)
    raw = []
    walk(doc.modelspace(), None, raw)
    lot = config["lot"]
    result = {
        "id": config["id"],
        "name": config["name"],
        "source": Path(config["source"]).name,
        "width": lot["width"],
        "depth": lot["depth"],
        "floor": [
            {"x": 0, "z": 0},
            {"x": lot["width"], "z": 0},
            {"x": lot["width"], "z": lot["depth"]},
            {"x": 0, "z": lot["depth"]},
        ],
        "levels": [build_level(raw, level, lot) for level in config["levels"]],
    }
    Path(output_path).write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for lv in result["levels"]:
        print(f"{lv['name']}: {len(lv['walls'])} muros, {len(lv['openings'])} vanos, {len(lv['lines'])} líneas")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
