#!/usr/bin/env python3
"""Logotipo GymTrack: comparación de tratamientos y juego final, con el texto en trazos.

Uso:
  python3 logotipo.py tratamientos          lámina de comparación (../../lamina-logotipo-tratamientos.*)
  python3 logotipo.py final [NN]            juego final con el tratamiento NN (por defecto ELEGIDO)
  python3 logotipo.py todo [NN]             las dos cosas

Necesita rsvg-convert y hb-shape (HarfBuzz) en el PATH, fontTools y Pillow.
Unidades: grilla de 64 del símbolo (caja x12-52, y12-52; renglón 7, interlínea 4, paso 11).
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen import ROWS, CROSS, ELE, HOOK, INK, PAPER, MINT, GRAY  # noqa: E402  (símbolo fijado, sin cambios)
from palabra import Palabra, x_height  # noqa: E402

FINAL = os.path.dirname(HERE)                 # logo/final
LOGO = os.path.dirname(FINAL)                 # logo
PNG = os.path.join(FINAL, "png")
FONT = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"'
LINE = "#2A3631"
MUTED = "#9AA59F"

# Caja del símbolo y renglones (grilla de 64)
SX0, SY0, SX1, SY1 = 12, 12, 52, 52
RENGLONES = [(12, 19), (23, 30), (34, 41), (45, 52)]
RESPETO = 7        # área de respeto del logotipo: un alto de renglón, igual que el símbolo

# ---- tratamientos ---------------------------------------------------------
# cap_top: la línea donde sube la mayúscula (la base siempre es y52, borde inferior del último renglón)
# gap: separación entre la caja del símbolo (x52) y la tinta de la primera letra
TRATAMIENTOS = {
    "01": dict(texto="GymTrack", peso=700, espaciado=-0.01, cap_top=23, gap=11,
               linea="Base: 700, espaciado −1 %, mayúscula del 2.º al 4.º renglón"),
    "02": dict(texto="GymTrack", peso=800, espaciado=-0.01, cap_top=23, gap=11,
               linea="Igual que 01, en peso 800"),
    "03": dict(texto="GymTrack", peso=700, espaciado=-0.03, cap_top=23, gap=11,
               linea="Igual que 01, espaciado más apretado: −3 %"),
    "04": dict(texto="GymTrack", peso=700, espaciado=0.02, cap_top=23, gap=11,
               linea="Igual que 01, espaciado más abierto: +2 %"),
    "05": dict(texto="gymtrack", peso=700, espaciado=-0.01, cap_top=23, gap=11,
               linea="Igual que 01, todo en minúscula (la k sube al 2.º renglón)"),
    "06": dict(texto="GymTrack", peso=700, espaciado=-0.01, cap_top=34, gap=7,
               linea="Palabra más chica: mayúscula del 3.º al 4.º renglón, separación de 7"),
}
ELEGIDO = "01"
BASE = 52


def n(v, dec=3):
    s = f"{v:.{dec}f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def palabra_de(t):
    return Palabra(t["texto"], t["peso"], t["espaciado"], cap=BASE - t["cap_top"])


def simbolo(fg, mono=False, accent=MINT):
    if mono:
        return f'<path fill="{fg}" d="{ROWS}{HOOK}"/>'
    return f'<path fill="{fg}" d="{ROWS}{ELE}"/><path fill="{accent}" d="{CROSS}"/>'


def horizontal(t, fg, mono=False):
    """Logotipo horizontal en la grilla. Devuelve (markup, caja de tinta total)."""
    p = palabra_de(t)
    x = SX1 + t["gap"]
    caja = p.caja(x, BASE)
    markup = simbolo(fg, mono) + f'<path fill="{fg}" d="{p.d(x, BASE)}"/>'
    return markup, (SX0, min(SY0, caja[1]), caja[2], max(SY1, caja[3])), p


# Apilado: símbolo arriba, palabra abajo, centrada en el ancho del símbolo (x32).
# La mayúscula mide un paso de renglón (11) y empieza un paso por debajo del símbolo.
APILADO_CAP = 11
APILADO_SEP = 11


def apilado(t, fg, mono=False):
    p = Palabra(t["texto"], t["peso"], t["espaciado"], cap=APILADO_CAP)
    base = SY1 + APILADO_SEP + APILADO_CAP
    x = 32 - p.ancho() / 2
    caja = p.caja(x, base)
    markup = simbolo(fg, mono) + f'<path fill="{fg}" d="{p.d(x, base)}"/>'
    return markup, (min(SX0, caja[0]), SY0, max(SX1, caja[2]), caja[3]), p, base


def solo_palabra(t, fg):
    p = palabra_de(t)
    caja = p.caja(0, BASE)
    return f'<path fill="{fg}" d="{p.d(0, BASE)}"/>', caja, p


def archivo_svg(markup, caja, margen, escala, comentario):
    x0, y0, x1, y1 = caja[0] - margen, caja[1] - margen, caja[2] + margen, caja[3] + margen
    w, h = x1 - x0, y1 - y0
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{n(x0)} {n(y0)} {n(w)} {n(h)}" '
            f'width="{n(w*escala, 1)}" height="{n(h*escala, 1)}">\n'
            f'  <!-- {comentario} -->\n  {markup}\n</svg>\n')


def colocar(markup, gx, gy, k):
    """Pone markup de grilla con el punto de grilla (0,0) en (gx,gy) y escala k px por unidad."""
    return f'<g transform="translate({n(gx)} {n(gy)}) scale({n(k, 4)})">{markup}</g>'


def text(x, y, s, size, fill=PAPER, bold=False, anchor=None):
    a = f' text-anchor="{anchor}"' if anchor else ""
    b = ' font-weight="bold"' if bold else ""
    return f'<text x="{n(x)}" y="{n(y)}"{a} {FONT} font-size="{size}"{b} fill="{fill}">{s}</text>'


def render(src, dst, w=None, h=None, bg=None):
    cmd = ["rsvg-convert"]
    if w:
        cmd += ["-w", str(w)]
    if h:
        cmd += ["-h", str(h)]
    if bg:
        cmd += ["-b", bg]
    subprocess.run(cmd + [src, "-o", dst], check=True)


# ---- lámina de tratamientos ----------------------------------------------
def lamina_tratamientos():
    W, H = 2200, 1380
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="{INK}"/>']
    o.append(text(60, 92, "GymTrack · Logotipo: tratamientos", 44, bold=True))
    o.append(text(60, 138, "Fase 4 · Manrope (opción 1). Todos con el mismo símbolo y la palabra apoyada en el borde inferior del último renglón.", 22, MUTED))
    o.append(text(60, 168, "Líneas finas: los renglones del símbolo prolongados. Abajo de cada uno, el mismo logotipo con el símbolo a 24 px de alto (tamaño real).", 22, MUTED))
    K = 2.3                       # px por unidad de grilla en la vista grande (símbolo de 92 px)
    k = 24 / 40                   # vista chica: símbolo de 24 px
    cols, tw, th = 3, 680, 540
    for i, (num, t) in enumerate(TRATAMIENTOS.items()):
        cx, cy = 60 + (i % cols) * (tw + 20), 220 + (i // cols) * (th + 20)
        o.append(f'<rect x="{cx}" y="{cy}" width="{tw}" height="{th}" rx="6" fill="none" stroke="{LINE}" stroke-width="2"/>')
        o.append(text(cx + 30, cy + 54, num, 30, MINT if num == ELEGIDO else PAPER, bold=True))
        o.append(text(cx + 82, cy + 54, t["linea"], 19, PAPER))
        mk, caja, p = horizontal(t, PAPER)
        gx, gy = cx + 40 - SX0 * K, cy + 110 - SY0 * K
        # renglones prolongados como guía
        for (a, b) in RENGLONES:
            for yy in (a, b):
                o.append(f'<line x1="{cx+20}" x2="{cx+tw-20}" y1="{n(gy+yy*K)}" y2="{n(gy+yy*K)}" stroke="#3A4A43" stroke-width="1"/>')
        o.append(colocar(mk, gx, gy, K))
        # datos
        ancho = caja[2] - caja[0]
        esp = f'{t["espaciado"]*100:+.0f}'.replace("-", "−")
        datos = (f'{t["peso"]} · espaciado {esp} % · mayúscula {BASE - t["cap_top"]} · '
                 f'separación {t["gap"]} · ancho {ancho:.0f} (símbolo 40)')
        o.append(text(cx + 30, cy + 300, datos, 16, MUTED))
        # tamaño real, símbolo de 24 px, en tinta y en papel
        o.append(colocar(mk, cx + 40 - SX0 * k, cy + 340 - SY0 * k, k))
        o.append(f'<rect x="{cx+30}" y="{cy+395}" width="{tw-60}" height="64" fill="{PAPER}"/>')
        mk2, _, _ = horizontal(t, INK)
        o.append(colocar(mk2, cx + 40 - SX0 * k, cy + 415 - SY0 * k, k))
        o.append(text(cx + 30, cy + 500, "Arriba: símbolo de 24 px sobre tinta. Abajo: lo mismo sobre papel.", 16, MUTED))
    o.append("</svg>")
    p = os.path.join(LOGO, "lamina-logotipo-tratamientos.svg")
    open(p, "w").write("\n".join(o))
    render(p, os.path.join(LOGO, "lamina-logotipo-tratamientos.png"))
    return p


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else "todo"
    if len(sys.argv) > 2:
        ELEGIDO = sys.argv[2]
    if modo in ("tratamientos", "todo"):
        print(lamina_tratamientos())
    if modo in ("final", "todo"):
        import final
        final.generar(TRATAMIENTOS[ELEGIDO], ELEGIDO)
