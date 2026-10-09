"""Salón de demostración en el formato del diseñador (milímetros, y hacia abajo).

Es un salón ficticio de 28 × 44 m mientras llegan los planos del salón #1: salón
principal con 4 columnas, recepción con entrada al frente, baños y cocina.
Los muebles iniciales no van aquí: los acomoda src/lib/designer/starter.ts según
el número de invitados (zona de mesas y elementos fijos en "setup").

Uso: python tools/designer/salon_demo.py   (con el venv de tools/cad-import)
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/cad-import"))
from to_designer import dims_for, entry_arrow  # noqa: E402

OUT = ROOT / "src/designer/salones/salon-demo.json"
W, D = 28000, 44000
T = 300  # muro exterior
SILL, HEAD = 1.2, 3.4  # ventanas del salón (m)

walls, wins, doors = [], [], []


def wall(x0, y0, x1, y1, kind, gaps=()):
    """Muro recto con huecos [(a, b), ...] medidos sobre su eje largo."""
    horiz = x1 - x0 >= y1 - y0
    lo, hi = (x0, x1) if horiz else (y0, y1)
    cuts = sorted(gaps)
    start = lo
    for a, b in cuts + [(hi, hi)]:
        if a > start:
            walls.append([x0, start, x1, a, kind] if not horiz else [start, y0, a, y1, kind])
        start = max(start, b)


def window(rect):
    wins.append([*rect, SILL, HEAD])


def door(rect, hinge, closed, opens, length, name, entry=False):
    d = {"rect": rect, "h": hinge, "c": closed, "o": opens, "len": length, "name": name}
    if entry:
        d["entry"] = True
    doors.append(d)


def double_door_h(x0, x1, y0, y1, face, opens, name, entry=False):
    """Puerta doble en muro horizontal; `face` es la cara del muro hacia donde abre."""
    mid = (x0 + x1) // 2
    half = mid - x0
    door([x0, y0, mid, y1], [x0, face], [1, 0], [0, opens], half, name, entry)
    door([mid, y0, x1, y1], [x1, face], [-1, 0], [0, opens], half, name)


def double_door_v(x0, x1, y0, y1, face, opens, name):
    mid = (y0 + y1) // 2
    half = mid - y0
    door([x0, y0, x1, mid], [face, y0], [0, 1], [opens, 0], half, name)
    door([x0, mid, x1, y1], [face, y1], [0, -1], [opens, 0], half, name)


# --- Fachadas ---------------------------------------------------------------
top_wins = [(4000, 8000), (20000, 24000)]
wall(0, 0, W, T, "b", top_wins)
for a, b in top_wins:
    window([a, 0, b, T])

left_wins = [(4000, 7000), (22000, 25000), (28000, 31000)]
left_exit = (16000, 17800)
wall(0, T, T, D - T, "b", left_wins + [left_exit])
for a, b in left_wins:
    window([0, a, T, b])
double_door_v(0, T, *left_exit, 0, -1, "Salida de emergencia")

right_wins = [(4000, 7000), (16000, 19000), (22000, 25000), (28000, 31000), (38000, 40000)]
right_exit = (10000, 11800)
wall(W - T, T, W, D - T, "b", right_wins + [right_exit])
for a, b in right_wins:
    window([W - T, a, W, b])
double_door_v(W - T, W, *right_exit, W, 1, "Salida de emergencia")

entrance = (12500, 15500)
service = (25000, 26000)
front_wins = [(9000, 11500), (16500, 19000)]
wall(0, D - T, W, D, "b", front_wins + [entrance, service])
for a, b in front_wins:
    window([a, D - T, b, D])
double_door_h(*entrance, D - T, D, D - T, -1, "Acceso principal", entry=True)
door([service[0], D - T, service[1], D], [service[0], D - T], [1, 0], [0, -1], 1000, "Acceso de servicio")

# --- Interiores -------------------------------------------------------------
Y0, Y1 = 34000, 34200  # muro entre el salón y la franja de servicios
hall_doors = [(1500, 2400), (5500, 6400), entrance, (22500, 23500)]
wall(T, Y0, W - T, Y1, "b", hall_doors)
door([1500, Y0, 2400, Y1], [1500, Y1], [1, 0], [0, 1], 900, "Baño de mujeres")
door([5500, Y0, 6400, Y1], [5500, Y1], [1, 0], [0, 1], 900, "Baño de hombres")
double_door_h(*entrance, Y0, Y1, Y0, -1, "Entrada al salón")
door([22500, Y0, 23500, Y1], [22500, Y1], [1, 0], [0, 1], 1000, "Puerta de cocina")
wall(4100, Y1, 4250, D - T, "n")
wall(8000, Y1, 8150, D - T, "n")
wall(19850, Y1, 20000, D - T, "n")

# Columnas del salón
for cx in (9400, 18600):
    for cy in (11500, 22800):
        walls.append([cx - 300, cy - 300, cx + 300, cy + 300, "b"])


def room(rid, name, x0, y0, x1, y1, mat, at=None):
    return {
        "id": rid,
        "name": name,
        "poly": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
        "mat": mat,
        "at": at or [(x0 + x1) // 2, (y0 + y1) // 2],
    }


rooms = [
    room("salon", "Salón principal", T, T, W - T, Y0, "marble", [4200, 1500]),
    room("banos-m", "Baño de mujeres", T, Y1, 4100, D - T, "tile600"),
    room("banos-h", "Baño de hombres", 4250, Y1, 8000, D - T, "tile600"),
    room("recepcion", "Recepción", 8150, Y1, 19850, D - T, "tile800", [14000, 40200]),
    room("cocina", "Cocina", 20000, Y1, W - T, D - T, "antislip"),
]

entrance_rect = {"rect": [entrance[0], D - T, entrance[1], D], "o": [0, -1]}
cx = (entrance[0] + entrance[1]) // 2
level = {
    "id": "salon",
    "name": "Salón",
    "height": 5.0,
    "walls": walls,
    "wins": wins,
    "doors": doors,
    "slides": [],
    "rooms": rooms,
    "dims": dims_for([*walls, *[[*w[:4], "w"] for w in wins], *[[*d["rect"], "d"] for d in doors]], W / 1000, D / 1000),
    "entry": entry_arrow(entrance_rect),
    "walk": {"from": [cx, D + 1600], "to": [cx, D - 3000]},
    "stairs": [],
    "stairLines": [],
    "furniture": [],
}

plan = {
    "id": "salon-demo",
    "kind": "salon",
    "title": "Salón Demostración",
    "subtitle": "Salón de 28 × 44 m · medidas en mm",
    "lot": [W, D],
    "bounds": {"x": -1850, "y": -1750, "w": W + 3700, "h": D + 3500},
    "levels": [level],
    # Para el montaje inicial (starter.ts): zona libre para mesas y dónde van los fijos.
    "setup": {
        "tables": [1100, 5200, W - 1100, Y0 - 800],
        "stage": {"cx": W // 2, "cy": T + 2000, "w": 8000, "d": 4000},
        "dance": {"cx": W // 2, "cy": 8600, "w": 7000, "d": 6000},
        "head": {"cx": W // 2, "cy": 12600},
        "dj": {"cx": W // 2 + 6000, "cy": T + 1300},
        "bar": {"cx": W - T - 500, "cy": 29000, "rot": 90},
        "dessert": {"cx": T + 400, "cy": 29000, "rot": 270},
        "cake": {"cx": T + 2000, "cy": 25500},
    },
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
print(f"{OUT.relative_to(ROOT)}: {len(walls)} muros, {len(wins)} ventanas, {len(doors)} puertas, {len(rooms)} cuartos")
