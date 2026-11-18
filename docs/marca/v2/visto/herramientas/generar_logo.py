"""Genera todos los SVG y PNG del logo de la dirección «Visto».

Uso:  python3 docs/marca/v2/visto/herramientas/generar_logo.py
Necesita rsvg-convert y fontTools. No usa red: lee las fuentes de node_modules.
"""
import math
import subprocess
from pathlib import Path

from geometria import (
    ACENTO_OSCURO, ACENTO_TEXTO, BORDE_CONTROL, CENTRO, CENTRO_16, DESHAB, FONDO, MENTA,
    MENTA_PROFUNDA, MENTA_SUAVE, OSCURO, RADIO, RADIO_16, SECUNDARIO, SECUNDARIO_OSCURO,
    SUP_OSCURA, SUPERFICIE, TEXTO_OSCURO, TINTA, TRAZO, TRAZO_16, VISTO, VISTO_16,
    aire_minimo, circulo_d, contorno_visto, distancia_maxima, f, polilinea_d, transformar,
)
from texto import Fuente, texto_svg

AQUI = Path(__file__).resolve().parent
DIR = AQUI.parent
LOGO = DIR / "logo"
PNG = LOGO / "png"
LOGO.mkdir(exist_ok=True)
PNG.mkdir(exist_ok=True)

NS = 'xmlns="http://www.w3.org/2000/svg"'


def guardar(nombre, svg):
    (LOGO / nombre).write_text(svg + "\n", encoding="utf-8")


def render(svg_path, png_path, ancho=None, alto=None):
    cmd = ["rsvg-convert", str(svg_path), "-o", str(png_path)]
    if ancho:
        cmd += ["-w", str(ancho)]
    if alto:
        cmd += ["-h", str(alto)]
    subprocess.run(cmd, check=True)


def trazo_visto(pts, ancho, color):
    return (
        f'<path d="{polilinea_d(pts)}" fill="none" stroke="{color}" stroke-width="{f(ancho)}" '
        f'stroke-linecap="round" stroke-linejoin="round"/>'
    )


# ------------------------------------------------------------------ símbolo
def simbolo_grupo(cx, cy, diametro, circulo=MENTA, visto=TINTA, modo="normal"):
    """Símbolo escalado para que el CÍRCULO mida `diametro` (sin el aire de la grilla)."""
    k = diametro / (2 * RADIO)
    pts = transformar(VISTO, CENTRO, (cx, cy), k)
    r = RADIO * k
    if modo == "calado":
        d = circulo_d(cx, cy, r) + contorno_visto(pts, TRAZO * k)
        return f'<path fill="{circulo}" fill-rule="evenodd" d="{d}"/>'
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{circulo}"/>' + trazo_visto(pts, TRAZO * k, visto)


def simbolo_svg(circulo=MENTA, visto=TINTA, modo="normal", titulo="GymTrack"):
    if modo == "calado":
        cuerpo = (
            f'<path fill="{circulo}" fill-rule="evenodd" '
            f'd="{circulo_d(12, 12, RADIO)}{contorno_visto(VISTO, TRAZO)}"/>'
        )
    elif modo == "solo-visto":
        cuerpo = trazo_visto(VISTO, TRAZO, visto)
    else:
        cuerpo = f'<circle cx="12" cy="12" r="{f(RADIO)}" fill="{circulo}"/>' + trazo_visto(VISTO, TRAZO, visto)
    return f'<svg {NS} viewBox="0 0 24 24" width="24" height="24"><title>{titulo}</title>{cuerpo}</svg>'


def simbolo16_svg():
    return (
        f'<svg {NS} viewBox="0 0 16 16" width="16" height="16"><title>GymTrack</title>'
        f'<circle cx="8" cy="8" r="{f(RADIO_16)}" fill="{MENTA}"/>'
        + trazo_visto(VISTO_16, TRAZO_16, TINTA)
        + "</svg>"
    )


# ------------------------------------------------------------------ logotipo
TAM = 100.0  # tamaño de cuerpo de referencia
ESP = -0.015  # espaciado −1,5 %


def medidas_palabra():
    fu = Fuente("manrope-700")
    xmin, ymin, xmax, ymax = fu.bbox_glifo("G")
    s = TAM / fu.upm
    alto_g = (ymax - ymin) * s
    centro_g = -((ymax + ymin) / 2) * s  # respecto de la línea base (y hacia abajo)
    # caja real de la palabra
    _, ymin_y, _, _ = fu.bbox_glifo("y")
    desc = -ymin_y * s
    sube = ymax * s
    ancho = fu.ancho("GymTrack", TAM, ESP)
    # el primer glifo tiene margen izquierdo (lsb); lo descontamos para que la palabra arranque justo
    lsb = xmin * s
    _, _, kx, _ = fu.bbox_glifo("k")
    rsb = (fu.hmtx[fu.glifo("k")][0] - kx) * s
    return dict(alto_g=alto_g, centro_g=centro_g, desc=desc, sube=sube, ancho=ancho, lsb=lsb, rsb=rsb)


def logotipo_horizontal(color_palabra, circulo=MENTA, visto=TINTA, modo="normal"):
    m = medidas_palabra()
    D = 1.3 * m["alto_g"]
    sep = D / 2
    arriba = min(-m["sube"], m["centro_g"] - D / 2)
    abajo = max(m["desc"], m["centro_g"] + D / 2)
    alto = abajo - arriba
    base = -arriba
    cy = base + m["centro_g"]
    x_palabra = D + sep - m["lsb"]
    ancho = D + sep + (m["ancho"] - m["lsb"] - m["rsb"])
    sim = simbolo_grupo(D / 2, cy, D, circulo, visto, modo)
    palabra, _ = texto_svg("GymTrack", "manrope-700", TAM, x_palabra, base, color_palabra, espaciado_em=ESP)
    return (
        f'<svg {NS} viewBox="0 0 {f(ancho)} {f(alto)}" width="{f(ancho)}" height="{f(alto)}">'
        f"<title>GymTrack</title>{sim}{palabra}</svg>",
        dict(ancho=ancho, alto=alto, D=D, sep=sep, alto_g=m["alto_g"]),
    )


def logotipo_apilado(color_palabra, circulo=MENTA, visto=TINTA, modo="normal"):
    m = medidas_palabra()
    Ds = 2.4 * m["alto_g"]
    sep = 0.6 * m["alto_g"]
    ancho_p = m["ancho"] - m["lsb"] - m["rsb"]
    ancho = max(ancho_p, Ds)
    cap_top = Ds + sep
    base = cap_top + m["sube"]
    alto = base + m["desc"]
    sim = simbolo_grupo(ancho / 2, Ds / 2, Ds, circulo, visto, modo)
    palabra, _ = texto_svg("GymTrack", "manrope-700", TAM, (ancho - ancho_p) / 2 - m["lsb"], base, color_palabra, espaciado_em=ESP)
    return (
        f'<svg {NS} viewBox="0 0 {f(ancho)} {f(alto)}" width="{f(ancho)}" height="{f(alto)}">'
        f"<title>GymTrack</title>{sim}{palabra}</svg>",
        dict(ancho=ancho, alto=alto),
    )


# ------------------------------------------------------------------ ícono de app
ICONO = 512
# Después de la revisión: el visto creció 1,6 veces, bajó a la izquierda y su brazo largo
# sigue de largo hasta que lo corta el borde, en la esquina superior derecha. Contenido y
# centrado, con máscara de cuadrado redondeado se leía como una casilla marcada.
ICONO_K = 34.0                 # px por unidad de la grilla de 24 (antes 21,36)
ICONO_TRAZO = 74.0             # 2,18 unidades: el mismo grosor relativo que tenía (46 px)
ICONO_VERTICE = (196.0, 372.0)
ICONO_LARGO = 760.0            # el brazo largo sale del lienzo de 512 y también de la capa de 108 dp
_A, _V, _E = VISTO
_u = ((_E[0] - _V[0]), (_E[1] - _V[1]))
_n = math.hypot(*_u)
ICONO_DIR = (_u[0] / _n, _u[1] / _n)  # mismo ángulo del visto del símbolo (47,8°)
ICONO_VISTO = [
    (ICONO_VERTICE[0] + (_A[0] - _V[0]) * ICONO_K, ICONO_VERTICE[1] + (_A[1] - _V[1]) * ICONO_K),
    ICONO_VERTICE,
    (ICONO_VERTICE[0] + ICONO_DIR[0] * ICONO_LARGO, ICONO_VERTICE[1] + ICONO_DIR[1] * ICONO_LARGO),
]
# Capa adaptativa: el lienzo de 512 representa 108 dp y el sistema muestra solo los 72 dp
# centrales; se reduce a 72/108 para que, ya recortado, se vea igual que icono-app.svg.
ADAPT = 72 / 108
CAPA_VISTO = transformar(ICONO_VISTO, (256, 256), (256, 256), ADAPT)
CAPA_TRAZO = ICONO_TRAZO * ADAPT


def icono_app_svg():
    return (
        f'<svg {NS} viewBox="0 0 512 512" width="512" height="512"><title>GymTrack</title>'
        f'<rect width="512" height="512" fill="{MENTA}"/>' + trazo_visto(ICONO_VISTO, ICONO_TRAZO, TINTA) + "</svg>"
    )


def capa_fondo_svg():
    return f'<svg {NS} viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" fill="{MENTA}"/></svg>'


def capa_frente_svg(color=TINTA):
    return f'<svg {NS} viewBox="0 0 512 512" width="512" height="512">' + trazo_visto(CAPA_VISTO, CAPA_TRAZO, color) + "</svg>"


def vista_svg(forma):
    if forma == "circulo":
        clip = '<circle cx="256" cy="256" r="256"/>'
    else:
        clip = '<rect width="512" height="512" rx="116"/>'
    return (
        f'<svg {NS} viewBox="0 0 512 512" width="512" height="512"><title>GymTrack</title>'
        f'<defs><clipPath id="m">{clip}</clipPath></defs><g clip-path="url(#m)">'
        f'<rect width="512" height="512" fill="{MENTA}"/>' + trazo_visto(ICONO_VISTO, ICONO_TRAZO, TINTA) + "</g></svg>"
    )


# ------------------------------------------------------------------ lámina
def t(txt, x, y, tam=16, color=TINTA, peso="manrope-500", ancla="start", esp=0.0):
    p, _ = texto_svg(txt, peso, tam, x, y, color, ancla, esp)
    return p


def tarjeta(x, y, w, h, fondo=SUPERFICIE, r=24, borde=None):
    b = f' stroke="{borde}" stroke-width="1"' if borde else ""
    return f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{r}" fill="{fondo}"{b}/>'


def incrustar(svg_texto, x, y, escala=1.0):
    """Mete un SVG (sin la etiqueta raíz) dentro de un grupo trasladado."""
    import re

    interior = re.sub(r"^<svg[^>]*>", "", svg_texto.strip())
    interior = re.sub(r"</svg>$", "", interior)
    interior = re.sub(r"<title>.*?</title>", "", interior)
    return f'<g transform="translate({f(x)} {f(y)}) scale({f(escala)})">{interior}</g>'


def pixeles_16(x, y, celda=8, fondo=(245, 247, 245)):
    from PIL import Image

    im = Image.open(PNG / "simbolo-16.png").convert("RGBA")
    out = [f'<rect x="{x}" y="{y}" width="{16*celda}" height="{16*celda}" fill="{FONDO}"/>']
    for j in range(16):
        for i in range(16):
            r, g, b, a = im.getpixel((i, j))
            if a == 0:
                continue
            al = a / 255
            rr = round(r * al + fondo[0] * (1 - al))
            gg = round(g * al + fondo[1] * (1 - al))
            bb = round(b * al + fondo[2] * (1 - al))
            out.append(
                f'<rect x="{x+i*celda}" y="{y+j*celda}" width="{celda}" height="{celda}" fill="#{rr:02X}{gg:02X}{bb:02X}"/>'
            )
    # grilla de píxeles
    for k in range(17):
        out.append(f'<path d="M{x+k*celda} {y}V{y+16*celda}M{x} {y+k*celda}H{x+16*celda}" stroke="{SUPERFICIE}" stroke-width="0.5" stroke-opacity="0.6"/>')
    return "".join(out)


def construccion(x, y, u=16):
    """Diagrama de construcción sobre la grilla de 24 (u = px por unidad)."""
    out = []
    for k in range(25):
        c = DESHAB
        w = 1
        out.append(f'<path d="M{f(x+k*u)} {f(y)}V{f(y+24*u)}M{f(x)} {f(y+k*u)}H{f(x+24*u)}" stroke="{c}" stroke-width="{w}"/>')
    cx, cy = x + 12 * u, y + 12 * u
    out.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(RADIO*u)}" fill="{MENTA_SUAVE}" stroke="{MENTA_PROFUNDA}" stroke-width="2"/>')
    # aire mínimo: círculo de 8 unidades (11 − 3)
    out.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(8*u)}" fill="none" stroke="{BORDE_CONTROL}" stroke-width="1.5" stroke-dasharray="6 6"/>')
    pts = [(x + px * u, y + py * u) for px, py in VISTO]
    out.append(f'<path d="{contorno_visto(pts, TRAZO*u)}" fill="none" stroke="{TINTA}" stroke-width="2"/>')
    out.append(f'<path d="{polilinea_d(pts)}" fill="none" stroke="{ACENTO_TEXTO}" stroke-width="1.5" stroke-dasharray="4 4"/>')
    out.append(f'<path d="M{f(cx-8)} {f(cy)}H{f(cx+8)}M{f(cx)} {f(cy-8)}V{f(cy+8)}" stroke="{TINTA}" stroke-width="1.5"/>')
    for (px, py), (sx, sy) in zip(pts, VISTO):
        out.append(f'<circle cx="{f(px)}" cy="{f(py)}" r="5" fill="{SUPERFICIE}" stroke="{ACENTO_TEXTO}" stroke-width="2"/>')
    # rótulos
    a, v, e = pts
    # «7 · 12» va sobre el vértice y dentro del círculo de aire: antes cruzaba la línea punteada
    out.append(t("7 · 12", a[0] + 4, a[1] - 30, 13, ACENTO_TEXTO, "plex-600", "middle"))
    out.append(t("10,6 · 15,6", v[0], v[1] + 36, 13, ACENTO_TEXTO, "plex-600", "middle"))
    out.append(t("17,3 · 8,2", e[0] - 12, e[1] - 24, 13, ACENTO_TEXTO, "plex-600", "end"))
    out.append(t("r 11", cx + RADIO * u * 0.72, cy + RADIO * u * 0.86, 13, MENTA_PROFUNDA, "plex-600"))
    out.append(t("aire ≥ 3", cx - 8 * u * 0.2, y + (12 - 8) * u - 6, 13, SECUNDARIO, "plex-600", "middle"))
    return "".join(out)


def lamina():
    W, H = 1600, 1290
    o = [f'<svg {NS} viewBox="0 0 {W} {H}" width="{W}" height="{H}">', f'<rect width="{W}" height="{H}" fill="{FONDO}"/>']
    # encabezado
    hz, mh = logotipo_horizontal(TINTA)
    esc = 44 / mh["alto"]
    o.append(incrustar(hz, 64, 56, esc))
    o.append(t("Dirección Visto · logo", W - 64, 86, 18, SECUNDARIO, "manrope-500", "end"))
    o.append(f'<path d="M64 128H{W-64}" stroke="{DESHAB}" stroke-width="2"/>')

    # fila A
    yA = 160
    o.append(tarjeta(64, yA, 440, 460))
    o.append(incrustar(simbolo_svg(), 64 + 40, yA + 30, 360 / 24))
    o.append(t("Símbolo", 92, yA + 424, 18, TINTA, "manrope-700"))
    o.append(t("Círculo menta #45B392 y visto tinta #131A17", 92, yA + 446, 14, SECUNDARIO))

    o.append(tarjeta(528, yA, 440, 460))
    o.append(construccion(528 + 40, yA + 24, 15))
    o.append(t("Construcción · grilla de 24", 556, yA + 424, 18, TINTA, "manrope-700"))
    o.append(t("Trazo 2,75 · puntas y unión redondas · aire ≥ 3", 556, yA + 446, 14, SECUNDARIO))

    # logotipos
    o.append(tarjeta(992, yA, 544, 220))
    esc = 400 / mh["ancho"]
    o.append(incrustar(hz, 992 + 72, yA + 48, esc))
    o.append(t("Logotipo horizontal · Manrope 700 · −1,5 %", 1020, yA + 196, 14, SECUNDARIO))
    o.append(tarjeta(992, yA + 240, 544, 220, OSCURO))
    hzo, _ = logotipo_horizontal(TEXTO_OSCURO, MENTA, OSCURO)
    o.append(incrustar(hzo, 992 + 72, yA + 240 + 48, esc))
    o.append(t("Sobre oscuro · palabra #ECF2EF · visto #0E1412", 1020, yA + 240 + 196, 14, SECUNDARIO_OSCURO))

    # fila B
    yB = 644
    o.append(tarjeta(64, yB, 904, 320))
    o.append(t("Ícono de app · Android", 92, yB + 44, 18, TINTA, "manrope-700"))
    o.append(incrustar(vista_svg("circulo"), 92, yB + 72, 200 / 512))
    o.append(incrustar(vista_svg("cuadrado"), 316, yB + 72, 200 / 512))
    o.append(t("Máscara circular", 192, yB + 298, 13, SECUNDARIO, ancla="middle"))
    o.append(t("Cuadrado redondeado", 416, yB + 298, 13, SECUNDARIO, ancla="middle"))
    # capas con zonas
    capas = [("Fondo", capa_fondo_svg()), ("Primer plano", capa_frente_svg()), ("Monocromo", capa_frente_svg(TINTA))]
    for i, (nom, s) in enumerate(capas):
        cx0 = 560 + i * 136
        o.append(f'<rect x="{cx0}" y="{yB+92}" width="120" height="120" fill="{FONDO}" stroke="{DESHAB}"/>')
        if nom == "Monocromo":
            o.append(f'<rect x="{cx0}" y="{yB+92}" width="120" height="120" fill="{DESHAB}"/>')
        # la capa se recorta a su lienzo de 108 dp (el brazo largo del visto sale de él)
        o.append(f'<clipPath id="capa{i}"><rect x="{cx0}" y="{yB+92}" width="120" height="120"/></clipPath>')
        o.append(f'<g clip-path="url(#capa{i})">' + incrustar(s, cx0, yB + 92, 120 / 512) + "</g>")
        # zona visible 72/108 y zona segura 66/108
        o.append(f'<circle cx="{cx0+60}" cy="{yB+152}" r="{f(60*72/108)}" fill="none" stroke="{ACENTO_TEXTO}" stroke-width="1" stroke-dasharray="3 3"/>')
        o.append(f'<circle cx="{cx0+60}" cy="{yB+152}" r="{f(60*66/108)}" fill="none" stroke="{SECUNDARIO}" stroke-width="1"/>')
        o.append(t(nom, cx0 + 60, yB + 236, 13, SECUNDARIO, ancla="middle"))
    o.append(t("Capas de 108 dp. Punteada: lo que muestra el sistema (72 dp).", 560, yB + 270, 12, SECUNDARIO))
    o.append(t("Continua: zona segura (66 dp). El ángulo y el brazo corto", 560, yB + 288, 12, SECUNDARIO))
    o.append(t("quedan dentro; el brazo largo sale por el borde a propósito.", 560, yB + 306, 12, SECUNDARIO))

    # tamaños
    o.append(tarjeta(992, yB, 544, 320))
    o.append(t("Tamaños · 64, 32 y 16 px reales", 1020, yB + 44, 18, TINTA, "manrope-700"))
    x0 = 1020
    yy = yB + 80
    o.append(incrustar(simbolo_svg(), x0, yy, 64 / 24))
    o.append(incrustar(simbolo_svg(), x0 + 84, yy + 32, 32 / 24))
    o.append(incrustar(simbolo16_svg(), x0 + 136, yy + 48, 1))
    o.append(f'<rect x="{x0}" y="{yy+86}" width="172" height="80" rx="12" fill="{OSCURO}"/>')
    o.append(incrustar(simbolo_svg(MENTA, OSCURO), x0 + 12, yy + 94, 64 / 24))
    o.append(incrustar(simbolo_svg(MENTA, OSCURO), x0 + 92, yy + 110, 32 / 24))
    o.append(f'<g transform="translate({x0+140} {yy+118})"><circle cx="8" cy="8" r="{RADIO_16}" fill="{MENTA}"/>{trazo_visto(VISTO_16, TRAZO_16, OSCURO)}</g>')
    o.append(t("64", x0 + 32, yy + 196, 12, SECUNDARIO, "plex-600", "middle"))
    o.append(t("32", x0 + 100, yy + 196, 12, SECUNDARIO, "plex-600", "middle"))
    o.append(t("16", x0 + 144, yy + 196, 12, SECUNDARIO, "plex-600", "middle"))
    o.append(pixeles_16(1340, yB + 64, 10))
    o.append(t("16 px ampliado al 1000 %", 1420, yB + 250, 12, SECUNDARIO, ancla="middle"))
    o.append(t("versión propia de 16: trazo más grueso", 1420, yB + 268, 12, SECUNDARIO, ancla="middle"))
    o.append(t("y vértices en medio píxel", 1420, yB + 286, 12, SECUNDARIO, ancla="middle"))

    # fila C: versiones
    yC = 988
    o.append(t("Versiones", 64, yC + 20, 18, TINTA, "manrope-700"))
    vers = [
        ("Sobre claro", SUPERFICIE, simbolo_svg(), SECUNDARIO),
        ("Sobre oscuro", OSCURO, simbolo_svg(MENTA, OSCURO), SECUNDARIO_OSCURO),
        ("Un color · tinta, visto calado", SUPERFICIE, simbolo_svg(TINTA, None, "calado"), SECUNDARIO),
        ("Un color · blanco sobre oscuro", OSCURO, simbolo_svg(SUPERFICIE, None, "calado"), SECUNDARIO_OSCURO),
        ("Solo el visto · Android 13", DESHAB, simbolo_svg(None, TINTA, "solo-visto"), SECUNDARIO),
    ]
    tw = (W - 128 - 4 * 24) / 5
    for i, (nom, bg, s, col) in enumerate(vers):
        x = 64 + i * (tw + 24)
        o.append(tarjeta(x, yC + 40, tw, 230, bg))
        o.append(incrustar(s, x + tw / 2 - 64, yC + 70, 128 / 24))
        o.append(t(nom, x + tw / 2, yC + 244, 13, TINTA if bg != OSCURO else TEXTO_OSCURO, "manrope-500", "middle"))
    o.append("</svg>")
    return "".join(o)


def main():
    guardar("simbolo.svg", simbolo_svg())
    guardar("simbolo-sobre-claro.svg", simbolo_svg())
    guardar("simbolo-sobre-oscuro.svg", simbolo_svg(MENTA, OSCURO))
    guardar("simbolo-mono-tinta.svg", simbolo_svg(TINTA, None, "calado"))
    guardar("simbolo-mono-blanco.svg", simbolo_svg(SUPERFICIE, None, "calado"))
    guardar("simbolo-visto-solo.svg", simbolo_svg(None, TINTA, "solo-visto"))
    guardar("simbolo-16.svg", simbolo16_svg())

    hz, mh = logotipo_horizontal(TINTA)
    guardar("logotipo-horizontal.svg", hz)
    guardar("logotipo-horizontal-sobre-oscuro.svg", logotipo_horizontal(TEXTO_OSCURO, MENTA, OSCURO)[0])
    guardar("logotipo-horizontal-mono.svg", logotipo_horizontal(TINTA, TINTA, None, "calado")[0])
    guardar("logotipo-horizontal-mono-blanco.svg", logotipo_horizontal(SUPERFICIE, SUPERFICIE, None, "calado")[0])
    ap, ma = logotipo_apilado(TINTA)
    guardar("logotipo-apilado.svg", ap)
    guardar("logotipo-apilado-sobre-oscuro.svg", logotipo_apilado(TEXTO_OSCURO, MENTA, OSCURO)[0])
    guardar("logotipo-apilado-mono.svg", logotipo_apilado(TINTA, TINTA, None, "calado")[0])

    guardar("icono-app.svg", icono_app_svg())
    guardar("icono-app-capa-fondo.svg", capa_fondo_svg())
    guardar("icono-app-capa-frente.svg", capa_frente_svg())
    guardar("icono-app-capa-monocromo.svg", capa_frente_svg(TINTA))
    guardar("icono-app-vista-circulo.svg", vista_svg("circulo"))
    guardar("icono-app-vista-cuadrado.svg", vista_svg("cuadrado"))

    # PNG
    render(LOGO / "simbolo-16.svg", PNG / "simbolo-16.png", 16, 16)
    for n in (32, 48, 192, 512):
        render(LOGO / "simbolo.svg", PNG / f"simbolo-{n}.png", n, n)
    for nom in ("simbolo-sobre-oscuro", "simbolo-mono-tinta", "simbolo-mono-blanco", "simbolo-visto-solo"):
        render(LOGO / f"{nom}.svg", PNG / f"{nom}-512.png", 512, 512)
    for nom in ("icono-app", "icono-app-capa-fondo", "icono-app-capa-frente", "icono-app-capa-monocromo",
                "icono-app-vista-circulo", "icono-app-vista-cuadrado"):
        render(LOGO / f"{nom}.svg", PNG / f"{nom}-512.png", 512, 512)
    for nom in ("logotipo-horizontal", "logotipo-horizontal-sobre-oscuro", "logotipo-horizontal-mono",
                "logotipo-horizontal-mono-blanco"):
        render(LOGO / f"{nom}.svg", PNG / f"{nom}.png", 1200)
    for nom in ("logotipo-apilado", "logotipo-apilado-sobre-oscuro", "logotipo-apilado-mono"):
        render(LOGO / f"{nom}.svg", PNG / f"{nom}.png", 800)

    (DIR / "lamina-logo.svg").write_text(lamina() + "\n", encoding="utf-8")
    render(DIR / "lamina-logo.svg", DIR / "lamina-logo.png", 1600)

    # comprobaciones
    print("aire símbolo (u):", round(aire_minimo(VISTO, TRAZO, CENTRO, RADIO), 3))
    print("aire 16 (px):", round(aire_minimo(VISTO_16, TRAZO_16, CENTRO_16, RADIO_16), 3))
    # el brazo largo sale a propósito: se mide solo la punta del brazo corto y el ángulo
    print("ícono: punta corta y ángulo, distancia máx. al centro",
          round(distancia_maxima(ICONO_VISTO[:2], ICONO_TRAZO, (256, 256)), 1), "(zona segura 66 dp = 234,7 en el lienzo de 72 dp)")
    print("capa: punta corta y ángulo, distancia máx. al centro", round(distancia_maxima(CAPA_VISTO[:2], CAPA_TRAZO, (256, 256)), 1),
          "(visible 170,7 · zona segura 156,4)")
    # dónde corta el borde de 512 al eje del brazo largo
    t_borde = (512 - ICONO_VERTICE[0]) / ICONO_DIR[0]
    print("ícono: el eje del brazo largo cruza x = 512 en y =", round(ICONO_VERTICE[1] + ICONO_DIR[1] * t_borde, 1))
    print("vértices ícono", [(round(x, 1), round(y, 1)) for x, y in ICONO_VISTO], "k", ICONO_K, "trazo", ICONO_TRAZO,
          "· capa", [(round(x, 1), round(y, 1)) for x, y in CAPA_VISTO], "trazo", round(CAPA_TRAZO, 2))
    print("logotipo", {k: round(v, 2) for k, v in mh.items()}, "apilado", {k: round(v, 2) for k, v in ma.items()})


if __name__ == "__main__":
    main()
