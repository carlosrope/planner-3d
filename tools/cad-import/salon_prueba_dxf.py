"""Dibuja un DXF sintético de un salón (el mismo del Salón Demostración, 28 × 44 m) para probar
el importador de salones sin esperar el plano real de un cliente.

Capas: A-MUROS (muros y columnas como polígonos cerrados). Las puertas van en la configuración
del diseñador (`extraDoors`), como cuando el CAD no trae bloques de puerta.
Uso: .venv-cad/bin/python tools/cad-import/salon_prueba_dxf.py planos/_dxf/salon-prueba.dxf
"""

import sys
from pathlib import Path

import ezdxf

W, D, T = 28.0, 44.0, 0.3  # metros; en CAD y crece hacia el fondo
Y_SERV = 44 - 34.2  # muro entre salón y servicios: el diseñador lo pone en z 34.0–34.2


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def segments(lo, hi, gaps):
    """Tramos de muro entre `lo` y `hi` dejando los huecos [(a, b), ...]."""
    out, start = [], lo
    for a, b in sorted(gaps) + [(hi, hi)]:
        if a > start:
            out.append((start, a))
        start = max(start, b)
    return out


def main(out_path):
    doc = ezdxf.new("R2010")
    doc.layers.add("A-MUROS")
    msp = doc.modelspace()
    polys = []
    # Fachada del fondo (arriba en CAD) y laterales, con salidas de emergencia como huecos.
    polys.append(rect(0, D - T, W, D))
    for a, b in segments(T, D - T, [(44 - 17.8, 44 - 16.0)]):
        polys.append(rect(0, a, T, b))
    for a, b in segments(T, D - T, [(44 - 11.8, 44 - 10.0)]):
        polys.append(rect(W - T, a, W, b))
    # Fachada principal (abajo en CAD): acceso principal y acceso de servicio.
    for a, b in segments(0, W, [(12.5, 15.5), (25.0, 26.0)]):
        polys.append(rect(a, 0, b, T))
    # Muro entre el salón y la franja de servicios, con sus puertas.
    for a, b in segments(T, W - T, [(1.5, 2.4), (5.5, 6.4), (12.5, 15.5), (22.5, 23.5)]):
        polys.append(rect(a, Y_SERV, b, Y_SERV + 0.2))
    # Divisiones de servicios.
    for x0, x1 in ((4.10, 4.25), (8.00, 8.15), (19.85, 20.00)):
        polys.append(rect(x0, T, x1, Y_SERV))
    # Columnas del salón.
    for cx in (9.4, 18.6):
        for cz in (11.5, 22.8):
            cy = D - cz
            polys.append(rect(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3))
    for pts in polys:
        msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": "A-MUROS"})
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    doc.saveas(out_path)
    print(f"{out_path}: {len(polys)} polígonos de muro")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "planos/_dxf/salon-prueba.dxf")
