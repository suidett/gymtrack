#!/usr/bin/env python3
"""Arma lamina-exploracion-2 y lamina-icono-android-2 (SVG + PNG) con los simbolos incrustados."""
import os, subprocess, re
from gen import body, NAMES, OUT, INK, PAPER, MINT

FONT = 'font-family="Helvetica, Arial, sans-serif"'
GRAY = "#5E6D67"
V07 = open("/Users/suidett/gymtrack/docs/marca/logo/exploracion-1/v07.svg").read()
V07_BODY = re.search(r"<svg[^>]*>(.*)</svg>", V07, re.S).group(1)
V07_BODY = re.sub(r"<!--.*?-->", "", V07_BODY).strip()

CAMBIA = {
    "a": "Barras de 8,5 e interlínea de 2,5 (antes 7 y 4)",
    "b": "Cinco filas; la cuarta suma un espolón a la derecha",
    "c": "Las puntas de los renglones siguen un círculo",
    "d": "Renglón de arriba más corto; el travesaño entra más",
    "e": "El menta pasa del travesaño al renglón de abajo",
    "f": "Puntas a escuadra, sin radio (las demás: radio 2)",
    "g": "La G va calada dentro de una página en tinta",
    "h": "Un trazo vertical une el travesaño con la base",
}


def sym(key, x, y, size, color, mono=False, accent=MINT):
    return (f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 64 64" '
            f'overflow="visible" fill="none" style="color:{color}">'
            f'{body(key, mono=mono, accent=accent)}</svg>')


def text(x, y, s, size, fill=INK, bold=False, anchor=None):
    a = f' text-anchor="{anchor}"' if anchor else ""
    b = ' font-weight="bold"' if bold else ""
    return f'<text x="{x}" y="{y}"{a} {FONT} font-size="{size}"{b} fill="{fill}">{s}</text>'


def lamina():
    W, M, G = 2400, 40, 40
    CW = (W - 2 * M - 3 * G) // 4  # 550
    TOP = 230
    CH = 600
    H = TOP + 2 * CH + 20
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
    # referencia ronda 1, chica, arriba a la izquierda
    o.append(f'<rect x="{M}" y="40" width="120" height="120" fill="{PAPER}"/>')
    o.append(f'<svg x="{M+10}" y="50" width="100" height="100" viewBox="0 0 64 64" overflow="visible" fill="none" style="color:{INK}">{V07_BODY}</svg>')
    o.append(text(M + 60, 186, "ronda 1", 17, GRAY, anchor="middle"))
    o.append(text(M + 150, 86, "GymTrack · Símbolo, ronda 2: mutaciones de la 07 «G de renglones»", 38, bold=True))
    o.append(text(M + 150, 128, "Fase 3 · Cuaderno Exacto · Cada variante cambia una sola cosa respecto de la 07. Todas pasan de puntas de píldora a radio 2, salvo F (a escuadra).", 21, GRAY))
    o.append(text(M + 150, 158, "Tinta #131A17, papel #F5F7F5. El menta #45B392 subraya el travesaño (en E, el renglón de abajo). La tira de 64, 32 y 16 px va en un solo color, sin acento.", 21, GRAY))
    for i, k in enumerate("abcdefgh"):
        col, row = i % 4, i // 4
        x0 = M + col * (CW + G)
        y0 = TOP + row * CH
        o.append(f'<line x1="{x0}" y1="{y0}" x2="{x0+CW}" y2="{y0}" stroke="{INK}" stroke-width="2"/>')
        o.append(text(x0, y0 + 66, k.upper(), 58, bold=True))
        o.append(text(x0 + 62, y0 + 60, NAMES[k], 27))
        o.append(text(x0, y0 + 102, CAMBIA[k], 19, GRAY))
        sq = 265
        sy = y0 + 124
        for j, (bg, fg) in enumerate(((PAPER, INK), (INK, PAPER))):
            sx = x0 + j * (sq + 20)
            o.append(f'<rect x="{sx}" y="{sy}" width="{sq}" height="{sq}" fill="{bg}"/>')
            o.append(sym(k, sx + (sq - 210) / 2, sy + (sq - 210) / 2, 210, fg))
            o.append(text(sx, sy + sq + 24, "papel, con acento" if j == 0 else "tinta, con acento", 16, GRAY))
        ty = sy + sq + 40
        th = 110
        for j, (bg, fg) in enumerate(((PAPER, INK), (INK, PAPER))):
            sx = x0 + j * (sq + 20)
            o.append(f'<rect x="{sx}" y="{ty}" width="{sq}" height="{th}" fill="{bg}"/>')
            cx = sx + 22
            for s in (64, 32, 16):
                o.append(sym(k, cx, ty + 14 + (64 - s) / 2, s, fg, mono=True))
                o.append(text(cx + s / 2, ty + 99, str(s), 15, GRAY if j == 0 else "#9AA59F", anchor="middle"))
                cx += s + (60 if s == 64 else 56)
        o.append(text(x0, ty + th + 24, "64, 32 y 16 px a tamaño real, un solo color", 15, GRAY))
    o.append("</svg>")
    return "\n".join(o), W


def android():
    R, SAFE = 90, 82.5  # 72 dp de mascara -> 2,5 px por dp; zona segura 66 dp
    SYM = 154.29        # viewBox 64 -> 61,7 dp; el radio maximo medido (30,1) queda en 29 dp
    STEP = 228
    LX = 60 + 200
    W = LX + 8 * STEP + 20
    rows = [("menta", "símbolo tinta", MINT, INK, True),
            ("tinta", "símbolo papel", INK, PAPER, True),
            ("papel", "tinta y acento", PAPER, INK, False)]
    H = 150 + len(rows) * 250 + 20
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
         text(60, 66, "GymTrack · Ícono adaptativo de Android, ronda 2", 34, bold=True),
         text(60, 106, "Máscara circular de 72 dp sobre lienzo de 108 dp. Línea punteada: zona segura de 66 dp. Todos los símbolos a la misma escala; el que más ocupa (G) llega a 58 dp de diámetro.", 20, GRAY)]
    for r, (n1, n2, bg, fg, mono) in enumerate(rows):
        cy = 150 + r * 250 + R + 10
        o.append(text(60, cy - 6, n1, 22, bold=True))
        o.append(text(60, cy + 22, n2, 18, GRAY))
        for i, k in enumerate("abcdefgh"):
            cx = LX + i * STEP + R
            stroke = ' stroke="#C9D1CC" stroke-width="1.5"' if bg == PAPER else ""
            o.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="{bg}"{stroke}/>')
            o.append(f'<circle cx="{cx}" cy="{cy}" r="{SAFE}" fill="none" stroke="{INK if bg != INK else PAPER}" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="4 5"/>')
            o.append(sym(k, cx - SYM / 2, cy - SYM / 2, SYM, fg, mono=mono))
            if r == len(rows) - 1:
                o.append(text(cx, cy + R + 34, k.upper(), 22, bold=True, anchor="middle"))
    o.append("</svg>")
    return "\n".join(o), W


if __name__ == "__main__":
    for name, (svg, w) in (("lamina-exploracion-2", lamina()), ("lamina-icono-android-2", android())):
        p = os.path.join(OUT, name + ".svg")
        open(p, "w").write(svg)
        subprocess.run(["rsvg-convert", "-w", str(w), p, "-o", os.path.join(OUT, name + ".png")], check=True)
        print(p)
