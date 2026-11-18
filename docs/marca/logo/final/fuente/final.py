#!/usr/bin/env python3
"""Juego final del logotipo GymTrack. Se llama desde logotipo.py:  python3 logotipo.py final [NN]

Escribe en ../ (SVG y lámina) y ../png/. El texto va siempre en trazos (palabra.py).
"""
import os
from logotipo import (horizontal, apilado, solo_palabra, archivo_svg, colocar, text, render, n,
                      FINAL, PNG, INK, PAPER, MINT, GRAY, RESPETO, RENGLONES, BASE,
                      SX0, SY0, SX1, SY1, APILADO_CAP, APILADO_SEP)

ESC = 2          # px por unidad de grilla en los atributos width/height de los SVG
TMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tmp")

# Tamaños mínimos (alto del símbolo en px, en pantalla)
MIN_HORIZONTAL = 30      # el mismo mínimo del símbolo principal (simbolo-final.md)
MIN_APILADO = 48         # la mayúscula de la palabra queda en 13,2 px
MIN_PALABRA_CAP = 10     # palabra sola: mayúscula de 10 px


def _w(nombre, txt):
    p = os.path.join(FINAL, nombre)
    open(p, "w").write(txt)
    return p


def archivos(t, num):
    desc = (f'Manrope {t["peso"]}, espaciado {t["espaciado"]*100:+.0f} %, tratamiento {num}. '
            f'Texto en trazos.').replace("-", "−")
    salida = {}
    for suf, fg, mono, uso in [("", PAPER, False, "principal: papel y travesaño menta, para fondo tinta #131A17"),
                               ("-sobre-papel", INK, False, "sobre papel: tinta y travesaño menta, para fondos claros"),
                               ("-mono-papel", PAPER, True, "un solo color papel, para fondos oscuros"),
                               ("-mono-tinta", INK, True, "un solo color tinta, para fondos claros")]:
        mk, caja, _ = horizontal(t, fg, mono)
        salida["h" + suf] = _w(f"gymtrack-logotipo-horizontal{suf}.svg",
                               archivo_svg(mk, caja, RESPETO, ESC, f"GymTrack, logotipo horizontal {uso}. {desc}"))
    for suf, fg, uso in [("", PAPER, "principal: papel y travesaño menta, para fondo tinta #131A17"),
                         ("-sobre-papel", INK, "sobre papel: tinta y travesaño menta, para fondos claros")]:
        mk, caja, _, _ = apilado(t, fg)
        salida["a" + suf] = _w(f"gymtrack-logotipo-apilado{suf}.svg",
                               archivo_svg(mk, caja, RESPETO, ESC, f"GymTrack, logotipo apilado {uso}. {desc}"))
        mk, caja, _ = solo_palabra(t, fg)
        salida["p" + suf] = _w(f"gymtrack-palabra{suf}.svg",
                               archivo_svg(mk, caja, RESPETO, ESC, f"GymTrack, solo la palabra, {'papel, para fondo tinta' if fg == PAPER else 'tinta, para fondos claros'}. {desc}"))
    return salida


def pngs(t, s):
    os.makedirs(PNG, exist_ok=True)
    for clave, nombre in [("h", "logotipo-horizontal"), ("h-sobre-papel", "logotipo-horizontal-sobre-papel"),
                          ("a", "logotipo-apilado"), ("a-sobre-papel", "logotipo-apilado-sobre-papel")]:
        for w in (1200, 600):
            render(s[clave], os.path.join(PNG, f"{nombre}-{w}.png"), w=w)
    os.makedirs(TMP_DIR, exist_ok=True)
    # Imagen para compartir 1200 x 630: horizontal principal, símbolo de 120 px, caja del símbolo centrada en alto
    mk, caja, _ = horizontal(t, PAPER)
    k = 120 / 40
    ancho = (caja[2] - caja[0]) * k
    gx = (1200 - ancho) / 2 - caja[0] * k
    gy = 315 - 32 * k
    og = (f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">'
          f'<rect width="1200" height="630" fill="{INK}"/>{colocar(mk, gx, gy, k)}</svg>')
    p = os.path.join(TMP_DIR, "og.svg")
    open(p, "w").write(og)
    render(p, os.path.join(PNG, "compartir-1200x630.png"))
    # Avatar 400 x 400: apilado principal, 224 px de ancho, centrado (sin contar el trazo bajo la línea base)
    mk, caja, _, base = apilado(t, PAPER)
    k = 224 / (caja[2] - caja[0])
    gx = 200 - (caja[0] + caja[2]) / 2 * k
    gy = 200 - (SY0 + base) / 2 * k
    av = (f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">'
          f'<rect width="400" height="400" fill="{INK}"/>{colocar(mk, gx, gy, k)}</svg>')
    p = os.path.join(TMP_DIR, "avatar.svg")
    open(p, "w").write(av)
    render(p, os.path.join(PNG, "avatar-400.png"))


def cota_h(x0, x1, y, lab, color=MINT, size=17):
    return (f'<line x1="{n(x0)}" x2="{n(x1)}" y1="{n(y)}" y2="{n(y)}" stroke="{color}" stroke-width="1.5"/>'
            f'<line x1="{n(x0)}" x2="{n(x0)}" y1="{n(y-6)}" y2="{n(y+6)}" stroke="{color}" stroke-width="1.5"/>'
            f'<line x1="{n(x1)}" x2="{n(x1)}" y1="{n(y-6)}" y2="{n(y+6)}" stroke="{color}" stroke-width="1.5"/>'
            + text((x0 + x1) / 2, y - 10, lab, size, color, anchor="middle"))


def cota_v(x, y0, y1, lab, color=MINT, size=17, lado=1):
    tx = x + 10 if lado > 0 else x - 10
    return (f'<line x1="{n(x)}" x2="{n(x)}" y1="{n(y0)}" y2="{n(y1)}" stroke="{color}" stroke-width="1.5"/>'
            f'<line x1="{n(x-6)}" x2="{n(x+6)}" y1="{n(y0)}" y2="{n(y0)}" stroke="{color}" stroke-width="1.5"/>'
            f'<line x1="{n(x-6)}" x2="{n(x+6)}" y1="{n(y1)}" y2="{n(y1)}" stroke="{color}" stroke-width="1.5"/>'
            + text(tx, (y0 + y1) / 2 + 6, lab, size, color, anchor=None if lado > 0 else "end"))


def lamina(t, num):
    W, H = 2200, 2090
    LBL = "#5E6D67"
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
    esp = f'{t["espaciado"]*100:+.0f}'.replace("-", "−")
    o.append(text(40, 78, "GymTrack · Logotipo final", 44, INK, bold=True))
    o.append(text(40, 122, f'Fase 4 · Tratamiento {num}: Manrope {t["peso"]}, espaciado {esp} %, «{t["texto"]}». '
                  f'La palabra se apoya en el último renglón del símbolo y la mayúscula sube hasta el segundo.', 22, GRAY))
    o.append(text(40, 152, "Texto convertido a trazos. Tinta #131A17 · papel #F5F7F5 · menta #45B392 solo en el travesaño.", 22, GRAY))

    def baldosa(x, y, w, h, bg, mk, caja, lab, k=None):
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}"/>')
        if bg == PAPER:
            o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#DCE2DE"/>')
        cw, ch = caja[2] - caja[0], caja[3] - caja[1]
        kk = k or min((w * 0.72) / cw, (h * 0.62) / ch)
        gx = x + w / 2 - (caja[0] + caja[2]) / 2 * kk
        gy = y + h / 2 - (caja[1] + caja[3]) / 2 * kk
        o.append(colocar(mk, gx, gy, kk))
        o.append(text(x, y + h + 30, lab, 19, LBL))

    # Fila 1 y 2: horizontal en sus cuatro colores
    filas = [(PAPER, False, INK, "Horizontal principal, sobre tinta (gymtrack-logotipo-horizontal.svg)"),
             (INK, False, PAPER, "Horizontal sobre papel (…-horizontal-sobre-papel.svg)"),
             (PAPER, True, INK, "Un solo color papel, sobre fondo oscuro (…-horizontal-mono-papel.svg)"),
             (INK, True, PAPER, "Un solo color tinta, sobre fondo claro (…-horizontal-mono-tinta.svg)")]
    for i, (fg, mono, bg, lab) in enumerate(filas):
        x, y = 40 + (i % 2) * 1070, 200 + (i // 2) * 360
        mk, caja, _ = horizontal(t, fg, mono)
        baldosa(x, y, 1050, 290, bg, mk, caja, lab, k=3.2)
    # Fila 3: apilado y palabra
    y3 = 940
    piezas = [(apilado(t, PAPER), INK, "Apilado principal (…-apilado.svg)"),
              (apilado(t, INK), PAPER, "Apilado sobre papel (…-apilado-sobre-papel.svg)"),
              (solo_palabra(t, PAPER), INK, "Solo la palabra (gymtrack-palabra.svg)"),
              (solo_palabra(t, INK), PAPER, "Palabra sobre papel (…-palabra-sobre-papel.svg)")]
    for i, (res, bg, lab) in enumerate(piezas):
        mk, caja = res[0], res[1]
        x = 40 + i * 535
        k = 3.0 if i < 2 else 1.7
        baldosa(x, y3, 515, 330, bg, mk, caja, lab, k=k)

    # Fila 4: construcción y área de respeto
    y4 = 1360
    o.append(text(40, y4, "Construcción y área de respeto", 26, INK, bold=True))
    K = 3.6
    mk, caja, p = horizontal(t, INK)
    gx, gy = 40 + 100 - (caja[0] - RESPETO) * K, y4 + 70 - (caja[1] - RESPETO) * K
    X = lambda v: gx + v * K  # noqa: E731
    Y = lambda v: gy + v * K  # noqa: E731
    o.append(f'<rect x="{n(X(caja[0]-RESPETO))}" y="{n(Y(caja[1]-RESPETO))}" width="{n((caja[2]-caja[0]+2*RESPETO)*K)}" '
             f'height="{n((caja[3]-caja[1]+2*RESPETO)*K)}" fill="#EAF6F1" stroke="{MINT}" stroke-width="1.5" stroke-dasharray="6 5"/>')
    o.append(f'<rect x="{n(X(caja[0]))}" y="{n(Y(caja[1]))}" width="{n((caja[2]-caja[0])*K)}" height="{n((caja[3]-caja[1])*K)}" fill="#FFFFFF"/>')
    for (a, b) in RENGLONES:
        for yy in (a, b):
            o.append(f'<line x1="{n(X(caja[0]-RESPETO))}" x2="{n(X(caja[2]+RESPETO))}" y1="{n(Y(yy))}" y2="{n(Y(yy))}" stroke="#C9D3CE" stroke-width="1"/>')
    o.append(colocar(mk, gx, gy, K))
    o.append(cota_v(X(caja[2] + RESPETO) + 18, Y(t["cap_top"]), Y(BASE), f'mayúscula {BASE - t["cap_top"]}'))
    o.append(cota_v(X(caja[0]) - 26, Y(SY0), Y(SY1), "símbolo 40", lado=-1))
    o.append(cota_h(X(SX1), X(SX1 + t["gap"]), Y(SY0) - 14, f'{t["gap"]}'))
    o.append(cota_h(X(caja[2]), X(caja[2] + RESPETO), Y(caja[3]) + 22, f"{RESPETO}"))
    o.append(cota_v(X(caja[2] + RESPETO) + 18, Y(caja[1] - RESPETO), Y(caja[1]), f"{RESPETO}"))
    tx = 1190
    notas = [f'Grilla del símbolo: renglón 7, interlínea 4, paso 11; caja de 40.',
             f'Palabra: Manrope {t["peso"]}, cuerpo {p.cuerpo:.2f}, espaciado {esp} %.',
             f'Línea base en el borde inferior del último renglón.',
             f'La mayúscula ({BASE - t["cap_top"]}) sube hasta el borde superior del segundo.',
             f'Separación símbolo–palabra: {t["gap"]}, un paso de renglón.',
             f'Área de respeto: {RESPETO} (un alto de renglón) por lado,',
             f'medida desde la tinta, incluida la cola de la «y».']
    for i, s in enumerate(notas):
        o.append(text(tx, y4 + 110 + i * 32, s, 19, INK if i in (0,) else GRAY))
    # Apilado, construcción chica
    mk, caja, pa, base = apilado(t, INK)
    K2 = 2.6
    ax = 1760
    gx2, gy2 = ax + 60 - caja[0] * K2, y4 + 90 - SY0 * K2
    o.append(colocar(mk, gx2, gy2, K2))
    o.append(cota_v(ax + 60 - caja[0] * K2 + (caja[2]) * K2 + 22, gy2 + SY1 * K2, gy2 + (base - APILADO_CAP) * K2, f"{APILADO_SEP}"))
    o.append(cota_v(ax + 60 - caja[0] * K2 + (caja[2]) * K2 + 22, gy2 + (base - APILADO_CAP) * K2, gy2 + base * K2, f"mayúscula {APILADO_CAP}"))
    o.append(text(ax + 40, y4 + 90 + 240, "Apilado: palabra centrada en el símbolo,", 18, GRAY))
    o.append(text(ax + 40, y4 + 90 + 266, "mayúscula de un paso (11), a un paso.", 18, GRAY))

    # Fila 5: tamaños mínimos, tamaño real
    y5 = 1800
    o.append(text(40, y5, "Tamaños mínimos (tamaño real, en pantalla)", 26, INK, bold=True))
    bloques = []
    mkh, cajah, _ = horizontal(t, PAPER)
    mkh2, _, _ = horizontal(t, INK)
    mka, cajaa, _, _ = apilado(t, PAPER)
    mka2, _, _, _ = apilado(t, INK)
    mkp, cajap, pp = solo_palabra(t, PAPER)
    mkp2, _, _ = solo_palabra(t, INK)
    kh = MIN_HORIZONTAL / 40
    ka = MIN_APILADO / 40
    kp = MIN_PALABRA_CAP / (BASE - t["cap_top"])
    for j, (bg, h, a, pal) in enumerate([(INK, mkh, mka, mkp), (PAPER, mkh2, mka2, mkp2)]):
        x = 40 + j * 1070
        o.append(f'<rect x="{x}" y="{y5+30}" width="1050" height="200" fill="{bg}"/>')
        o.append(colocar(h, x + 40 - SX0 * kh, y5 + 30 + 60 - SY0 * kh, kh))
        o.append(colocar(a, x + 420 - cajaa[0] * ka, y5 + 30 + 40 - SY0 * ka, ka))
        o.append(colocar(pal, x + 720 - cajap[0] * kp, y5 + 30 + 60 - cajap[1] * kp, kp))
        lc = "#9AA59F" if bg == INK else GRAY
        anch_h = (cajah[2] - cajah[0]) * kh
        anch_p = (cajap[2] - cajap[0]) * kp
        o.append(text(x + 40, y5 + 30 + 170, f"Horizontal: símbolo de {MIN_HORIZONTAL} px ({anch_h:.0f} px de ancho)", 16, lc))
        o.append(text(x + 420, y5 + 30 + 170, f"Apilado: símbolo de {MIN_APILADO} px", 16, lc))
        o.append(text(x + 720, y5 + 30 + 170, f"Palabra: mayúscula de {MIN_PALABRA_CAP} px ({anch_p:.0f} px)", 16, lc))
    o.append(text(40, y5 + 280, "Más chico que esto: el símbolo solo (versión chica en cuadros de 16 y 32 px). "
                  "La versión compacta del logotipo es el símbolo solo.", 19, GRAY))
    o.append("</svg>")
    p = _w("lamina-logotipo-final.svg", "\n".join(o))
    render(p, os.path.join(FINAL, "lamina-logotipo-final.png"))


def generar(t, num):
    s = archivos(t, num)
    pngs(t, s)
    lamina(t, num)
    if os.path.isdir(TMP_DIR):
        for f in os.listdir(TMP_DIR):
            os.remove(os.path.join(TMP_DIR, f))
        os.rmdir(TMP_DIR)
    print("listo:", num)
