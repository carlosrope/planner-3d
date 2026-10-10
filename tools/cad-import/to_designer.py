"""Convierte una casa importada (tools/cad-import/houses/*.json, en metros) al formato
del diseñador de casas (src/designer), en milímetros.

Uso:
    python to_designer.py casa.json casa.designer.json salida.json

Qué hace, por planta:
- Muros: los pinta en una cuadrícula de 1 cm y los reconstruye como rectángulos.
  Así se eliminan los duplicados del CAD (contorno + relleno desfasados 2.5 cm).
  muro → "b" (de carga), tablaroca → "n" (se puede quitar), barda → "e".
- Ventanas: el antepecho del CAD es la ventana (repisa a 0.9 m). Las aberturas sin
  antepecho se "imantan" al hueco real del muro y se vuelven cancel corredizo.
- Puertas: hueco en el muro, bisagra y sentido de apertura a partir de las jambas
  y de la hoja abierta que dibuja el bloque de la puerta.
- Cuartos: se rellenan desde el punto de cada nombre hasta topar con muros, puertas,
  ventanas o divisiones virtuales (configuración); el área sale de la cuadrícula.
- Cotas: cadena de fachada (muros y vanos) y total del lote, por lado.
"""

import json
import sys
from pathlib import Path

import contourpy
import numpy as np
from matplotlib.path import Path as MPath

RES = 0.01  # metros por celda
MARGIN = 0.4  # margen alrededor del lote (bardas fuera del límite)
KIND_TO_TYPE = {"muro": "b", "tablaroca": "n", "barda": "e"}


class Grid:
    def __init__(self, width, depth):
        self.x0, self.z0 = -MARGIN, -MARGIN
        self.nx = int(round((width + 2 * MARGIN) / RES))
        self.nz = int(round((depth + 2 * MARGIN) / RES))
        xs = self.x0 + (np.arange(self.nx) + 0.5) * RES
        zs = self.z0 + (np.arange(self.nz) + 0.5) * RES
        self.cx, self.cz = np.meshgrid(xs, zs)

    def empty(self):
        return np.zeros((self.nz, self.nx), dtype=bool)

    def ix(self, x):
        return int(np.clip(round((x - self.x0) / RES), 0, self.nx))

    def iz(self, z):
        return int(np.clip(round((z - self.z0) / RES), 0, self.nz))

    def fill_poly(self, mask, pts):
        xs = [p[0] for p in pts]
        zs = [p[1] for p in pts]
        i0, i1 = self.iz(min(zs)) - 1, self.iz(max(zs)) + 1
        j0, j1 = self.ix(min(xs)) - 1, self.ix(max(xs)) + 1
        i0, j0 = max(i0, 0), max(j0, 0)
        sub = np.column_stack([self.cx[i0:i1, j0:j1].ravel(), self.cz[i0:i1, j0:j1].ravel()])
        inside = MPath(pts).contains_points(sub).reshape(i1 - i0, j1 - j0)
        mask[i0:i1, j0:j1] |= inside

    def fill_rect(self, mask, x0, z0, x1, z1):
        mask[self.iz(min(z0, z1)) : self.iz(max(z0, z1)), self.ix(min(x0, x1)) : self.ix(max(x0, x1))] = True

    def world(self, j, i):
        return self.x0 + j * RES, self.z0 + i * RES


def rects_of(mask, grid, min_cells=2):
    """Descompone una máscara en rectángulos (corridas por fila que se extienden hacia abajo)."""
    out, open_ = [], {}
    for i in range(grid.nz + 1):
        runs = set()
        if i < grid.nz:
            row = mask[i]
            j = 0
            while j < grid.nx:
                if row[j]:
                    k = j
                    while k < grid.nx and row[k]:
                        k += 1
                    runs.add((j, k))
                    j = k
                else:
                    j += 1
        for key in list(open_):
            if key not in runs:
                start = open_.pop(key)
                if key[1] - key[0] >= min_cells and i - start >= min_cells:
                    out.append((key[0], start, key[1], i))
        for key in runs:
            open_.setdefault(key, i)
    return [(*grid.world(j0, i0), *grid.world(j1, i1)) for j0, i0, j1, i1 in out]


def mm(v):
    return int(round(v * 1000 / 10) * 10)


def flood(barrier, seed_x, seed_z, grid):
    """Relleno desde la semilla sin cruzar barreras (búsqueda por pilas de filas)."""
    region = grid.empty()
    i, j = grid.iz(seed_z), grid.ix(seed_x)
    if barrier[i, j]:
        raise ValueError(f"La semilla ({seed_x}, {seed_z}) cae sobre un muro")
    stack = [(i, j)]
    while stack:
        i, j = stack.pop()
        if region[i, j] or barrier[i, j]:
            continue
        l = j
        while l > 0 and not barrier[i, l - 1] and not region[i, l - 1]:
            l -= 1
        r = j
        while r < grid.nx - 1 and not barrier[i, r + 1] and not region[i, r + 1]:
            r += 1
        region[i, l : r + 1] = True
        for ni in (i - 1, i + 1):
            if 0 <= ni < grid.nz:
                row_free = ~barrier[ni, l : r + 1] & ~region[ni, l : r + 1]
                for k in np.nonzero(row_free)[0]:
                    if k == 0 or not row_free[k - 1]:
                        stack.append((ni, l + k))
    return region


def polygon_of(region, grid):
    """Contorno exterior del cuarto, simplificado a vértices de esquina (mm)."""
    z = np.pad(region.astype(float), 1)
    lines = contourpy.contour_generator(z=z).lines(0.5)
    ring = max(lines, key=len)
    pts = [(grid.x0 + (c - 1 + 0.5) * RES, grid.z0 + (r - 1 + 0.5) * RES) for c, r in ring]
    pts = [(mm(x), mm(z)) for x, z in pts]
    clean = []
    for p in pts:
        if not clean or clean[-1] != p:
            clean.append(p)
    if clean[0] == clean[-1]:
        clean.pop()
    # Quita vértices colineales (también los escalones de medio centímetro del contorno).
    changed = True
    while changed and len(clean) > 4:
        changed = False
        for k in range(len(clean)):
            a, b, c = clean[k - 1], clean[k], clean[(k + 1) % len(clean)]
            cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
            if abs(cross) <= 20 * 20 or (a[0] == b[0] == c[0]) or (a[1] == b[1] == c[1]):
                clean.pop(k)
                changed = True
                break
    return [list(p) for p in clean]


def gap_along(mask, grid, horizontal, fixed, lo, hi):
    """Hueco (sin muro) sobre la línea `fixed`, entre lo y hi; devuelve (inicio, fin)."""
    if horizontal:
        i = grid.iz(fixed)
        line = mask[i, grid.ix(lo) : grid.ix(hi)]
        base = lo
    else:
        j = grid.ix(fixed)
        line = mask[grid.iz(lo) : grid.iz(hi), j]
        base = lo
    free = np.nonzero(~line)[0]
    if not len(free):
        return None
    return base + free[0] * RES, base + (free[-1] + 1) * RES


def band_at(mask, grid, horizontal, along, guess, span=0.5):
    """Grosor del muro: corrida de celdas con muro cruzando la línea en `along`."""
    if horizontal:
        j = grid.ix(along)
        col = mask[grid.iz(guess - span) : grid.iz(guess + span), j]
        base = guess - span
    else:
        i = grid.iz(along)
        col = mask[i, grid.ix(guess - span) : grid.ix(guess + span)]
        base = guess - span
    idx = np.nonzero(col)[0]
    if not len(idx):
        return None
    # La corrida más cercana a la conjetura.
    runs, start = [], idx[0]
    for a, b in zip(idx, idx[1:]):
        if b != a + 1:
            runs.append((start, a + 1))
            start = b
    runs.append((start, idx[-1] + 1))
    center = (guess - base) / RES
    s, e = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - center))
    return base + s * RES, base + e * RES


def wall_gap(mask, grid, bbox, min_len=0.5, max_len=1.6, reach=0.25):
    """Hueco en un muro junto a una caja: una línea paralela a un lado de la caja donde
    no hay muro a lo largo de la abertura pero sí justo antes y justo después."""
    x0, z0, x1, z1 = bbox
    best = None
    for vertical in (True, False):
        lo, hi = (z0, z1) if vertical else (x0, x1)
        sides = (x0, x1) if vertical else (z0, z1)
        for side in sides:
            for off in np.arange(-reach, reach + RES, RES):
                c = side + off
                if vertical:
                    j = grid.ix(c)
                    if not 0 <= j < grid.nx:
                        continue
                    line = mask[grid.iz(lo - 0.4) : grid.iz(hi + 0.4), j]
                else:
                    i = grid.iz(c)
                    if not 0 <= i < grid.nz:
                        continue
                    line = mask[i, grid.ix(lo - 0.4) : grid.ix(hi + 0.4)]
                base = lo - 0.4
                k, n = 0, len(line)
                while k < n:
                    if line[k]:
                        k += 1
                        continue
                    e = k
                    while e < n and not line[e]:
                        e += 1
                    if k > 0 and e < n:  # acotado por muro en ambos extremos
                        a, b = base + k * RES, base + e * RES
                        length = b - a
                        overlap = min(b, hi) - max(a, lo)
                        if min_len <= length <= max_len and overlap > 0.5 * length:
                            score = overlap - abs(off) * 0.5
                            if not best or score > best[0]:
                                best = (score, vertical, c, a, b)
                    k = e
    if not best:
        return None
    _, vertical, c, a, b = best
    # Grosor del muro: líneas vecinas con muro en ambos extremos del mismo hueco.
    band = []
    for off in np.arange(-0.4, 0.4 + RES, RES):
        cc = c + off
        if vertical:
            j = grid.ix(cc)
            ok = 0 <= j < grid.nx and mask[grid.iz(a - 0.02), j] and mask[grid.iz(b + 0.02) - 1, j] and not mask[grid.iz((a + b) / 2), j]
        else:
            i = grid.iz(cc)
            ok = 0 <= i < grid.nz and mask[i, grid.ix(a - 0.02)] and mask[i, grid.ix(b + 0.02) - 1] and not mask[i, grid.ix((a + b) / 2)]
        band.append((cc, ok))
    # Corrida contigua de líneas válidas que contiene la línea elegida.
    idx = min(range(len(band)), key=lambda t: abs(band[t][0] - c))
    lo_i = hi_i = idx
    while lo_i > 0 and band[lo_i - 1][1]:
        lo_i -= 1
    while hi_i < len(band) - 1 and band[hi_i + 1][1]:
        hi_i += 1
    t0, t1 = band[lo_i][0] - RES / 2, band[hi_i][0] + RES / 2
    return {"vertical": vertical, "band": (t0, t1), "gap": (a, b)}


def detect_door(op, lines, walls_mask, grid):
    x0, z0 = op["x"] - op["w"] / 2, op["z"] - op["d"] / 2
    x1, z1 = op["x"] + op["w"] / 2, op["z"] + op["d"] / 2
    found = wall_gap(walls_mask, grid, (x0, z0, x1, z1))
    if not found:
        return None
    (t0, t1), (a, b) = found["band"], found["gap"]
    # Puntos del bloque de la puerta lejos del muro: la hoja abierta indica la bisagra.
    pts = []
    for l in lines:
        if l["layer"] != "puerta":
            continue
        xs, zs = l["pts"][0::2], l["pts"][1::2]
        if min(xs) >= x0 - 0.05 and max(xs) <= x1 + 0.05 and min(zs) >= z0 - 0.05 and max(zs) <= z1 + 0.05:
            pts += list(zip(xs, zs))
    length = b - a
    if found["vertical"]:  # muro a lo largo de z
        swing = -1 if (x0 + x1) / 2 < (t0 + t1) / 2 else 1
        face = t0 if swing < 0 else t1
        far = [p[1] for p in pts if abs(p[0] - face) > 0.6 * length]
        mean = sum(far) / len(far) if far else b
        hinge, other = (a, b) if abs(mean - a) < abs(mean - b) else (b, a)
        rect, h, c, o = [t0, a, t1, b], [face, hinge], [0, 1 if other > hinge else -1], [swing, 0]
    else:
        swing = -1 if (z0 + z1) / 2 < (t0 + t1) / 2 else 1
        face = t0 if swing < 0 else t1
        far = [p[0] for p in pts if abs(p[1] - face) > 0.6 * length]
        mean = sum(far) / len(far) if far else b
        hinge, other = (a, b) if abs(mean - a) < abs(mean - b) else (b, a)
        rect, h, c, o = [a, t0, b, t1], [hinge, face], [1 if other > hinge else -1, 0], [0, swing]
    return {"rect": [mm(v) for v in rect], "h": [mm(v) for v in h], "c": c, "o": o, "len": mm(length)}


def snap_window(op, walls_mask, grid):
    """Aberturas sin antepecho: se buscan en el hueco real del muro más cercano."""
    box = (op["x"] - op["w"] / 2, op["z"] - op["d"] / 2, op["x"] + op["w"] / 2, op["z"] + op["d"] / 2)
    found = wall_gap(walls_mask, grid, box, min_len=0.4, max_len=4.0, reach=1.4)
    if not found:
        return None, None
    (t0, t1), (a, b) = found["band"], found["gap"]
    if found["vertical"]:
        return [t0, a, t1, b], True
    return [a, t0, b, t1], False


def chain(points, lo, hi):
    pts = sorted({p for p in points if lo - 5 <= p <= hi + 5} | {lo, hi})
    merged = []
    for p in pts:
        if not merged or p - merged[-1] > 30:
            merged.append(p)
    return [b - a for a, b in zip(merged, merged[1:])]


def dims_for(rects, lot_w, lot_d):
    """Cadenas de cotas: fachada de la casa (muros y vanos) y total del lote."""
    body = [r for r in rects if r[4] != "e"]
    bx0 = min(r[0] for r in body)
    by0 = min(r[1] for r in body)
    bx1 = max(r[2] for r in body)
    by1 = max(r[3] for r in body)
    tol = 60
    top = [v for r in rects if r[1] <= by0 + tol for v in (r[0], r[2])]
    bottom = [v for r in rects if r[3] >= by1 - tol for v in (r[0], r[2])]
    left = [v for r in rects if r[0] <= bx0 + tol for v in (r[1], r[3])]
    right = [v for r in rects if r[2] >= bx1 - tol for v in (r[1], r[3])]
    W, D = mm(lot_w), mm(lot_d)
    return [
        {"h": True, "at": -750, "start": bx0, "segs": chain(top, bx0, bx1)},
        {"h": True, "at": -1250, "start": 0, "segs": [W]},
        {"h": True, "at": D + 750, "start": bx0, "segs": chain(bottom, bx0, bx1)},
        {"h": True, "at": D + 1250, "start": 0, "segs": [W]},
        {"h": False, "at": -800, "start": by0, "segs": chain(left, by0, by1)},
        {"h": False, "at": -1300, "start": 0, "segs": [D]},
        {"h": False, "at": W + 800, "start": by0, "segs": chain(right, by0, by1)},
        {"h": False, "at": W + 1300, "start": 0, "segs": [D]},
    ]


def entry_arrow(door):
    """Flecha "Entrada" por fuera de la puerta principal, apuntando hacia adentro."""
    x0, y0, x1, y1 = door["rect"]
    ox, oy = door["o"]
    if ox:  # muro vertical: la flecha llega horizontal
        y = (y0 + y1) // 2
        face = x0 if ox > 0 else x1
        tip, tail = face - ox * 230, face - ox * 1250
        head = f"M{tip - ox * 250} {y - 155}L{tip} {y}L{tip - ox * 250} {y + 155}"
        return {"d": f"M{tail} {y}H{tip}{head}", "label": [min(tip, tail), y - 155]}
    x = (x0 + x1) // 2
    face = y0 if oy > 0 else y1
    tip, tail = face - oy * 230, face - oy * 1250
    head = f"M{x - 155} {tip - oy * 250}L{x} {tip}L{x + 155} {tip - oy * 250}"
    return {"d": f"M{x} {tail}V{tip}{head}", "label": [x + 220, (tip + tail) // 2]}


def walk_start(door, cfg):
    """Recorrido: empieza 1.6 m afuera de la puerta principal mirando hacia adentro (o donde diga la config)."""
    if "walk" in cfg:
        return {k: [mm(v) for v in cfg["walk"][k]] for k in ("from", "to")}
    if not door:
        return None
    x0, y0, x1, y1 = door["rect"]
    ox, oy = door["o"]
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    return {"from": [cx - ox * 1600, cy - oy * 1600], "to": [cx + ox * 3000, cy + oy * 3000]}


def build_level(level, cfg, lot_w, lot_d):
    grid = Grid(lot_w, lot_d)
    masks = {k: grid.empty() for k in ("muro", "tablaroca", "barda", "antepecho")}
    for w in level["walls"]:
        grid.fill_poly(masks[w["kind"]], [(p["x"], p["z"]) for p in w["points"]])
    # Prioridad: muro > barda > tablaroca; el antepecho es ventana.
    masks["barda"] &= ~masks["muro"]
    masks["tablaroca"] &= ~(masks["muro"] | masks["barda"])
    solid = masks["muro"] | masks["barda"] | masks["tablaroca"]

    walls = []
    for kind, t in KIND_TO_TYPE.items():
        for x0, z0, x1, z1 in rects_of(masks[kind], grid):
            walls.append([mm(x0), mm(z0), mm(x1), mm(z1), t])

    wins, slides, doors, notes = [], [], [], []
    sills = cfg.get("windows", {})
    for x0, z0, x1, z1 in rects_of(masks["antepecho"], grid):
        wins.append([mm(x0), mm(z0), mm(x1), mm(z1), 0.9, 2.2])
    ignore = set(cfg.get("ignoreOpenings", []))
    for op in level["openings"]:
        if op["id"] in ignore:
            continue
        if op["kind"] == "puerta":
            d = detect_door(op, level["lines"], solid | masks["antepecho"], grid)
            if not d:
                notes.append(f"puerta {op['id']} sin detectar")
                continue
            d["opening"] = op["id"]
            d["name"] = cfg.get("doorNames", {}).get(op["id"], "Puerta")
            if op["id"] == cfg.get("entry"):
                d["entry"] = True
            d.update(cfg.get("doors", {}).get(op["id"], {}))
            doors.append(d)
            continue
        r = (op["x"] - op["w"] / 2, op["z"] - op["d"] / 2, op["x"] + op["w"] / 2, op["z"] + op["d"] / 2)
        covered = any(
            w[0] < mm(r[2]) and w[2] > mm(r[0]) and w[1] < mm(r[3]) and w[3] > mm(r[1]) for w in wins
        )
        if covered:
            continue
        rect, vertical = snap_window(op, solid, grid)
        if rect is None:
            notes.append(f"abertura {op['id']} sin hueco en el muro")
            continue
        spec = sills.get(op["id"])
        if spec:  # ventana con repisa (p. ej. baño sin antepecho dibujado)
            wins.append([*(mm(v) for v in rect), spec.get("sill", 0.9), spec.get("head", 2.2)])
        else:
            slides.append({"rect": [mm(v) for v in rect], "v": bool(vertical)})

    # Vanos que el CAD no trae como bloque (se capturan a mano en la configuración).
    for x in cfg.get("extraSlides", []):
        slides.append({"rect": [mm(v) for v in x["rect"]], "v": bool(x.get("v", False))})
    for x in cfg.get("extraDoors", []):
        door = {
            "rect": [mm(v) for v in x["rect"]],
            "h": [mm(v) for v in x["h"]],
            "c": x["c"],
            "o": x["o"],
            "len": mm(x["len"]),
            "name": x["name"],
        }
        if x.get("entry"):
            door["entry"] = True
        doors.append(door)

    # Cuartos: relleno desde cada nombre.
    barrier = solid | masks["antepecho"]
    for d in doors:
        x0, y0, x1, y1 = d["rect"]
        grid.fill_rect(barrier, x0 / 1000, y0 / 1000, x1 / 1000, y1 / 1000)
    for s in slides:
        x0, y0, x1, y1 = s["rect"]
        grid.fill_rect(barrier, x0 / 1000, y0 / 1000, x1 / 1000, y1 / 1000)
    for w in wins:
        grid.fill_rect(barrier, w[0] / 1000, w[1] / 1000, w[2] / 1000, w[3] / 1000)
    for a, b, c, e in cfg.get("splits", []):
        grid.fill_rect(barrier, min(a, c) - 0.01, min(b, e) - 0.01, max(a, c) + 0.01, max(b, e) + 0.01)
    # Fuera del lote no hay cuarto.
    outside = (grid.cx < 0) | (grid.cx > lot_w) | (grid.cz < 0) | (grid.cz > lot_d)
    barrier |= outside

    rooms = []
    for k, room in enumerate(cfg["rooms"]):
        region = flood(barrier, room["at"][0], room["at"][1], grid)
        area = float(region.sum()) * RES * RES
        if area > cfg.get("maxRoom", 80):
            notes.append(f"cuarto {room['name']} se desborda ({area:.1f} m²)")
        entry = {
            "id": room.get("id", f"r{k + 1}"),
            "name": room["name"],
            "poly": polygon_of(region, grid),
            "mat": room["mat"],
            "at": [mm(room["at"][0]), mm(room["at"][1])],
        }
        for flag in ("counted", "outdoor", "void"):
            if flag in room:
                entry[flag] = room[flag]
        rooms.append(entry)

    entry_door = next((d for d in doors if d.get("entry")), None)

    rect_list = walls + [[*w[:4], "w"] for w in wins] + [[*d["rect"], "d"] for d in doors] + [[*s["rect"], "s"] for s in slides]
    stairs = [
        {"steps": [[mm(a), mm(b), mm(c), mm(e)] for a, b, c, e in st["steps"]], "rise": cfg.get("stairRise")}
        for st in level.get("stairs", [])
    ]
    return {
        "id": level["id"],
        "name": level["name"],
        "height": level["height"],
        "walls": walls,
        "wins": wins,
        "doors": doors,
        "slides": slides,
        "rooms": rooms,
        "dims": dims_for(rect_list, lot_w, lot_d),
        "entry": entry_arrow(entry_door) if entry_door else None,
        "walk": walk_start(entry_door, cfg),
        "stairs": stairs,
        "stairLines": [l["pts"] for l in level["lines"] if l["layer"] == "escalon"] if cfg.get("drawStairLines") else [],
        # Amueblado inicial: posiciones en metros → mm (el resto ya viene en mm y grados).
        "furniture": [[t, n, mm(x), mm(z), *rest] for t, n, x, z, *rest in cfg.get("furniture", [])],
        "notes": notes,
    }


def main(house_path, cfg_path, out_path):
    house = json.loads(Path(house_path).read_text(encoding="utf-8"))
    cfg = json.loads(Path(cfg_path).read_text(encoding="utf-8"))
    W, D = house["width"], house["depth"]
    levels = []
    for level in house["levels"]:
        lv = build_level(level, cfg["levels"][level["id"]], W, D)
        for n in lv.pop("notes"):
            print(f"  aviso [{level['id']}]: {n}")
        levels.append(lv)
        print(
            f"{lv['name']}: {len(lv['walls'])} muros, {len(lv['wins'])} ventanas, {len(lv['doors'])} puertas, "
            f"{len(lv['slides'])} canceles, {len(lv['rooms'])} cuartos"
        )
    out = {
        "id": cfg["id"],
        "kind": "casa",
        "title": cfg["title"],
        "subtitle": cfg["subtitle"],
        "lot": [mm(W), mm(D)],
        "bounds": {"x": -1850, "y": -1750, "w": mm(W) + 3700, "h": mm(D) + 3500},
        "levels": levels,
    }
    Path(out_path).write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main(*sys.argv[1:4])
