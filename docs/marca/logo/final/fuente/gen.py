#!/usr/bin/env python3
"""Genera el juego final del símbolo GymTrack (variante H pulida), sus PNG y las dos láminas.

Uso: python3 gen.py  (necesita rsvg-convert y Pillow). Escribe en ../ y ../png/.
"""
import math, os, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
PNG = os.path.join(OUT, "png")
TMP = os.path.join(HERE, "_tmp")
INK, PAPER, MINT, GRAY = "#131A17", "#F5F7F5", "#45B392", "#5E6D67"
FONT = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"'

# Corrimiento óptico: se aplica solo al poner el símbolo dentro de un cuadro
# (ícono, Android, favicon 48). En unidades de la grilla de 64.
OPT_DX, OPT_DY = 0.5, -0.5


def n(v):
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def rr(x, y, w, h, r):
    """Rectángulo con las cuatro esquinas de radio r, como path."""
    if r == 0:
        return f"M{n(x)} {n(y)}H{n(x+w)}V{n(y+h)}H{n(x)}Z"
    return (f"M{n(x+r)} {n(y)}H{n(x+w-r)}A{n(r)} {n(r)} 0 0 1 {n(x+w)} {n(y+r)}"
            f"V{n(y+h-r)}A{n(r)} {n(r)} 0 0 1 {n(x+w-r)} {n(y+h)}"
            f"H{n(x+r)}A{n(r)} {n(r)} 0 0 1 {n(x)} {n(y+h-r)}V{n(y+r)}A{n(r)} {n(r)} 0 0 1 {n(x+r)} {n(y)}Z")


# ---- versión principal, grilla de 64 -------------------------------------
# Renglón 7, interlínea 4, radio exterior 2, radio interior 1. Caja x12-52, y12-52.
ROWS = rr(12, 12, 36, 7, 2) + rr(12, 23, 12, 7, 2) + rr(12, 34, 12, 7, 2)
# Travesaño (menta): renglón completo x32-52, y34-41; esquina inferior derecha a escuadra
# para que el corte con el papel sea una sola línea horizontal en y41.
CROSS = "M34 34H50A2 2 0 0 1 52 36V41H34A2 2 0 0 1 32 39V36A2 2 0 0 1 34 34Z"
# Base + trazo que baja, una sola forma en L. La lengüeta x45-51,5, y38-41 queda tapada
# por el menta (media unidad adentro del borde derecho, para que no asome): evita la línea de fondo que deja el suavizado entre dos formas que se tocan.
ELE = ("M45 38H51.5V41H52V50A2 2 0 0 1 50 52H14A2 2 0 0 1 12 50V47A2 2 0 0 1 14 45H44"
       "A1 1 0 0 0 45 44V42A1 1 0 0 0 44 41H45Z")
# En un solo color: travesaño, trazo y base son un solo gancho.
HOOK = ("M34 34H50A2 2 0 0 1 52 36V50A2 2 0 0 1 50 52H14A2 2 0 0 1 12 50V47A2 2 0 0 1 14 45H44"
        "A1 1 0 0 0 45 44V42A1 1 0 0 0 44 41H34A2 2 0 0 1 32 39V36A2 2 0 0 1 34 34Z")


def body(ink, accent=MINT, mono=False):
    if mono:
        return f'<path fill="{ink}" d="{ROWS}{HOOK}"/>'
    return f'<path fill="{ink}" d="{ROWS}{ELE}"/>\n  <path fill="{accent}" d="{CROSS}"/>'


# ---- versión chica, grilla de 16 (para 16 y 32 px) -----------------------
# Barras de 2 px con 1 px de aire. Caja x3-14, y2-13 (11 x 11): 1 px más a la derecha
# y 1 px más arriba que el centro exacto (el mismo corrimiento óptico, llevado al pixel).
S_ROWS = rr(3, 2, 9, 2, .5) + rr(3, 5, 3, 2, .5) + rr(3, 8, 3, 2, .5)
S_CROSS = "M8.5 8H13.5A.5 .5 0 0 1 14 8.5V10H8.5A.5 .5 0 0 1 8 9.5V8.5A.5 .5 0 0 1 8.5 8Z"
S_ELE = "M12 9H13.5V10H14V12.5A.5 .5 0 0 1 13.5 13H3.5A.5 .5 0 0 1 3 12.5V11.5A.5 .5 0 0 1 3.5 11H12Z"
S_HOOK = ("M8.5 8H13.5A.5 .5 0 0 1 14 8.5V12.5A.5 .5 0 0 1 13.5 13H3.5A.5 .5 0 0 1 3 12.5V11.5"
          "A.5 .5 0 0 1 3.5 11H12V10H8.5A.5 .5 0 0 1 8 9.5V8.5A.5 .5 0 0 1 8.5 8Z")


def sbody(ink, accent=MINT, mono=False):
    if mono:
        return f'<path fill="{ink}" d="{S_ROWS}{S_HOOK}"/>'
    return f'<path fill="{ink}" d="{S_ROWS}{S_ELE}"/>\n  <path fill="{accent}" d="{S_CROSS}"/>'


def svgfile(vb, w, h, inner, comment):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">\n'
            f'  <!-- {comment} -->\n  {inner}\n</svg>\n')


def placed(cx, cy, scale, inner, opt=True):
    """Pone el símbolo de 64 con su centro geométrico (32,32) en (cx,cy)."""
    dx, dy = (OPT_DX, OPT_DY) if opt else (0, 0)
    if scale == 1:
        return f'<g transform="translate({n(cx + dx - 32)} {n(cy + dy - 32)})">{inner}</g>'
    return (f'<g transform="translate({n(cx + dx*scale)} {n(cy + dy*scale)}) scale({n(scale)}) '
            f'translate(-32 -32)">{inner}</g>')


ICON_SCALE = 12.8      # 1024 px: el símbolo (40 de grilla) mide 512 px, la mitad del lado
ANDROID_SCALE = 1.0    # lienzo 108 dp: símbolo de 40 dp, radio máximo 27,5 dp (zona segura: 33)


def write(name, text):
    with open(os.path.join(OUT, name), "w") as fh:
        fh.write(text)
    return os.path.join(OUT, name)


def render(src, dst, w, h=None, bg=None):
    cmd = ["rsvg-convert", "-w", str(w), "-h", str(h or w)]
    if bg:
        cmd += ["-b", bg]
    subprocess.run(cmd + [src, "-o", dst], check=True)


def files():
    write("gymtrack-simbolo.svg", svgfile("0 0 64 64", 64, 64, body(PAPER),
          "GymTrack, símbolo principal: papel y travesaño menta, para fondo tinta #131A17"))
    write("gymtrack-simbolo-sobre-papel.svg", svgfile("0 0 64 64", 64, 64, body(INK),
          "GymTrack, símbolo sobre papel: tinta y travesaño menta, para fondos claros"))
    write("gymtrack-simbolo-mono-papel.svg", svgfile("0 0 64 64", 64, 64, body(PAPER, mono=True),
          "GymTrack, símbolo en un solo color: papel, para fondos oscuros"))
    write("gymtrack-simbolo-mono-tinta.svg", svgfile("0 0 64 64", 64, 64, body(INK, mono=True),
          "GymTrack, símbolo en un solo color: tinta, para fondos claros"))
    write("gymtrack-simbolo-16.svg", svgfile("0 0 16 16", 16, 16, sbody(PAPER),
          "GymTrack, versión chica para 16 y 32 px, ajustada a la grilla de pixeles; para fondo tinta"))
    write("gymtrack-icono.svg", svgfile("0 0 1024 1024", 1024, 1024,
          f'<rect width="1024" height="1024" fill="{INK}"/>\n  ' + placed(512, 512, ICON_SCALE, body(PAPER)),
          "GymTrack, ícono de la app: fondo tinta, símbolo principal centrado (centro óptico)"))
    write("android-foreground.svg", svgfile("0 0 108 108", 108, 108,
          placed(54, 54, ANDROID_SCALE, body(PAPER)),
          "Ícono adaptativo de Android, primer plano. Lienzo 108 dp, fondo #131A17 aparte"))
    write("android-monochrome.svg", svgfile("0 0 108 108", 108, 108,
          placed(54, 54, ANDROID_SCALE, body("#FFFFFF", mono=True)),
          "Ícono adaptativo de Android, capa monocroma (íconos temáticos): Android usa solo la silueta"))
    # fuentes auxiliares de los favicons
    os.makedirs(TMP, exist_ok=True)
    fav48 = os.path.join(HERE, "favicon-48.svg")
    open(fav48, "w").write(svgfile("0 0 48 48", 48, 48,
        f'<rect width="48" height="48" rx="6" fill="{INK}"/>\n  ' + placed(24, 24, 0.825, body(PAPER)),
        "Favicon 48: versión principal sobre tinta"))
    fav16 = os.path.join(HERE, "favicon-16.svg")
    open(fav16, "w").write(svgfile("0 0 16 16", 16, 16,
        f'<rect width="16" height="16" rx="2" fill="{INK}"/>\n  ' + sbody(PAPER),
        "Favicon 16 y 32: versión chica sobre tinta"))
    os.makedirs(PNG, exist_ok=True)
    icon = os.path.join(OUT, "gymtrack-icono.svg")
    for s in (1024, 512, 192):
        render(icon, os.path.join(PNG, f"icono-{s}.png"), s)
    render(fav48, os.path.join(PNG, "favicon-48.png"), 48)
    render(fav16, os.path.join(PNG, "favicon-32.png"), 32)
    render(fav16, os.path.join(PNG, "favicon-16.png"), 16)
    render(os.path.join(OUT, "gymtrack-simbolo.svg"), os.path.join(PNG, "simbolo-512.png"), 512)


# ---- láminas --------------------------------------------------------------
def text(x, y, s, size, fill=INK, bold=False, anchor=None):
    a = f' text-anchor="{anchor}"' if anchor else ""
    b = ' font-weight="bold"' if bold else ""
    return f'<text x="{n(x)}" y="{n(y)}"{a} {FONT} font-size="{size}"{b} fill="{fill}">{s}</text>'


def sym(x, y, size, inner, vb="0 0 64 64"):
    return f'<svg x="{n(x)}" y="{n(y)}" width="{n(size)}" height="{n(size)}" viewBox="{vb}" overflow="visible">{inner}</svg>'


def squircle(cx, cy, r, k=5, steps=240):
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        c, s = math.cos(t), math.sin(t)
        x = cx + r * math.copysign(abs(c) ** (2 / k), c)
        y = cy + r * math.copysign(abs(s) ** (2 / k), s)
        pts.append(f"{x:.2f} {y:.2f}")
    return "M" + "L".join(pts) + "Z"


def pixels(png, x0, y0, k):
    im = Image.open(png).convert("RGBA")
    o = []
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b, a = im.getpixel((xx, yy))
            o.append(f'<rect x="{x0+xx*k}" y="{y0+yy*k}" width="{k}" height="{k}" fill="#{r:02X}{g:02X}{b:02X}"/>')
    return "".join(o)


def lamina_final():
    W, H = 2200, 1560
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
    o.append(text(40, 78, "GymTrack · Símbolo final", 44, bold=True))
    o.append(text(40, 122, "Fase 3 · Cuaderno Exacto · Variante H pulida: la G escrita en renglones, con el trazo que baja del travesaño a la base.", 22, GRAY))
    o.append(text(40, 152, "Tinta #131A17 · papel #F5F7F5 · menta #45B392 en el travesaño. La versión principal va sobre tinta.", 22, GRAY))
    # principal grande
    o.append(f'<rect x="40" y="200" width="760" height="760" fill="{INK}"/>')
    o.append(sym(40 + 380 - 380 + 0, 200, 760, placed(32, 32, 1, body(PAPER))))
    o.append(text(40, 994, "Principal, sobre tinta: papel y travesaño menta (gymtrack-simbolo.svg)", 20, GRAY))
    # variantes
    tiles = [(PAPER, body(INK), "Sobre papel: tinta y menta"),
             (INK, body(PAPER, mono=True), "Un solo color: papel"),
             (PAPER, body(INK, mono=True), "Un solo color: tinta")]
    for i, (bg, inner, lab) in enumerate(tiles):
        x = 860 + i * 440
        o.append(f'<rect x="{x}" y="200" width="400" height="400" fill="{bg}"/>')
        o.append(sym(x, 200, 400, placed(32, 32, 1, inner)))
        o.append(text(x, 634, lab, 20, GRAY))
    # tira de tamaños, tamaño real
    fav16 = os.path.join(TMP, "s16.png")
    for j, (bg, fg, lab) in enumerate([(INK, PAPER, "Sobre tinta"), (PAPER, INK, "Sobre papel")]):
        x = 860 + j * 660
        o.append(f'<rect x="{x}" y="680" width="620" height="280" fill="{bg}"/>')
        o.append(sym(x + 40, 720, 64, body(fg)))
        o.append(sym(x + 140, 736, 32, sbody(fg), "0 0 16 16"))
        o.append(sym(x + 208, 744, 16, sbody(fg), "0 0 16 16"))
        tmp = os.path.join(TMP, f"s16-{j}.svg")
        open(tmp, "w").write(svgfile("0 0 16 16", 16, 16, f'<rect width="16" height="16" fill="{bg}"/>' + sbody(fg), "tmp"))
        render(tmp, fav16, 16)
        o.append(pixels(fav16, x + 330, 720, 8))
        lc = "#9AA59F" if bg == INK else GRAY
        o.append(text(x + 72, 830, "64", 18, lc, anchor="middle"))
        o.append(text(x + 156, 830, "32", 18, lc, anchor="middle"))
        o.append(text(x + 216, 830, "16", 18, lc, anchor="middle"))
        o.append(text(x + 394, 880, "16 px, ampliado 8×", 18, lc, anchor="middle"))
        o.append(text(x + 40, 930, lab + " · 64 px: principal; 32 y 16 px: versión chica", 18, lc))
    o.append(text(860, 994, "Tamaño real. La versión chica (gymtrack-simbolo-16.svg) va en grilla de 16: barras de 2 px, 1 px de aire.", 20, GRAY))
    # máscaras
    y0 = 1060
    icon_inner = f'<rect width="1024" height="1024" fill="{INK}"/>' + placed(512, 512, ICON_SCALE, body(PAPER))
    S = 400
    masks = [("Círculo", f'<circle cx="{S/2}" cy="{S/2}" r="{S/2}"/>'),
             ("Cuadrado redondeado", f'<rect width="{S}" height="{S}" rx="{S*0.2}"/>'),
             ("Squircle", f'<path d="{squircle(S/2, S/2, S/2)}"/>')]
    for i, (lab, shape) in enumerate(masks):
        x = 40 + i * 440
        o.append(f'<clipPath id="m{i}">{shape}</clipPath>')
        o.append(f'<g transform="translate({x} {y0})"><g clip-path="url(#m{i})">{sym(0, 0, S, icon_inner, "0 0 1024 1024")}</g></g>')
        o.append(text(x, y0 + S + 34, f"Ícono en máscara: {lab.lower()}", 20, GRAY))
    # Android adaptativo
    x = 1360
    k = S / 108
    fg = placed(54, 54, ANDROID_SCALE, body(PAPER))
    o.append(f'<g transform="translate({x} {y0}) scale({n(k)})">'
             f'<rect width="108" height="108" fill="{INK}"/>{fg}'
             f'<path fill="#FFFFFF" fill-opacity="0.82" fill-rule="evenodd" d="M0 0H108V108H0Z M54 18A36 36 0 1 0 54 90A36 36 0 1 0 54 18Z"/>'
             f'<circle cx="54" cy="54" r="33" fill="none" stroke="{MINT}" stroke-width="0.4" stroke-dasharray="1.2 1"/>'
             f'<circle cx="54" cy="54" r="36" fill="none" stroke="{GRAY}" stroke-width="0.25"/></g>')
    o.append(text(x + S + 36, y0 + 40, "Android adaptativo", 24, bold=True))
    for i, line in enumerate(["Lienzo 108 dp, fondo #131A17.",
                              "Gris: lo que recorta el launcher (círculo de 72).",
                              "Menta punteado: zona segura de 66 dp.",
                              "Símbolo de 40 dp; su punto más lejano",
                              "queda a 27,5 dp del centro (límite: 33).",
                              "Centro óptico: 0,5 a la derecha, 0,5 arriba."]):
        o.append(text(x + S + 36, y0 + 84 + i * 32, line, 19, GRAY))
    o.append(text(x, y0 + S + 34, "android-foreground.svg sobre el fondo tinta", 20, GRAY))
    o.append("</svg>")
    p = write("lamina-simbolo-final.svg", "\n".join(o))
    render(p, os.path.join(OUT, "lamina-simbolo-final.png"), W, H)


def lamina_construccion():
    W, H = 2200, 1440
    U = 16                     # px por unidad de grilla
    GX, GY = 60, 190           # origen de la grilla de 64
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
    o.append(text(40, 78, "GymTrack · Construcción del símbolo", 44, bold=True))
    o.append(text(40, 122, "Grilla de 64 unidades. Todo sale de dos módulos: el renglón (7) y la interlínea (4). Las cotas van en unidades de grilla.", 22, GRAY))
    X = lambda v: GX + v * U
    Y = lambda v: GY + v * U
    # fondo y grilla
    o.append(f'<rect x="{X(0)}" y="{Y(0)}" width="{64*U}" height="{64*U}" fill="{PAPER}"/>')
    for v in range(65):
        w = 0.6 if v % 4 else 1.1
        c = "#DCE2DE" if v % 4 else "#C5CEC9"
        o.append(f'<line x1="{X(v)}" y1="{Y(0)}" x2="{X(v)}" y2="{Y(64)}" stroke="{c}" stroke-width="{w}"/>')
        o.append(f'<line x1="{X(0)}" y1="{Y(v)}" x2="{X(64)}" y2="{Y(v)}" stroke="{c}" stroke-width="{w}"/>')
    # área de respeto: un renglón (7) alrededor de la caja 12-52
    o.append(f'<rect x="{X(5)}" y="{Y(5)}" width="{54*U}" height="{54*U}" fill="none" stroke="{MINT}" stroke-width="2.5" stroke-dasharray="10 7"/>')
    o.append(f'<rect x="{X(12)}" y="{Y(12)}" width="{40*U}" height="{40*U}" fill="none" stroke="{GRAY}" stroke-width="1.2"/>')
    # símbolo, tinta al 88 %
    o.append(f'<g transform="translate({GX} {GY}) scale({U})" opacity="0.9">{body(INK)}</g>')

    def hdim(x1, x2, y, lab, above=True, col="#C0392B"):
        yy = Y(y)
        t = yy - 8 if above else yy + 22
        return (f'<line x1="{X(x1)}" y1="{yy}" x2="{X(x2)}" y2="{yy}" stroke="{col}" stroke-width="1.6"/>'
                f'<line x1="{X(x1)}" y1="{yy-6}" x2="{X(x1)}" y2="{yy+6}" stroke="{col}" stroke-width="1.6"/>'
                f'<line x1="{X(x2)}" y1="{yy-6}" x2="{X(x2)}" y2="{yy+6}" stroke="{col}" stroke-width="1.6"/>'
                + text((X(x1) + X(x2)) / 2, t, lab, 17, col, bold=True, anchor="middle"))

    def vdim(y1, y2, x, lab, left=True, col="#C0392B"):
        xx = X(x)
        t = xx - 10 if left else xx + 10
        return (f'<line x1="{xx}" y1="{Y(y1)}" x2="{xx}" y2="{Y(y2)}" stroke="{col}" stroke-width="1.6"/>'
                f'<line x1="{xx-6}" y1="{Y(y1)}" x2="{xx+6}" y2="{Y(y1)}" stroke="{col}" stroke-width="1.6"/>'
                f'<line x1="{xx-6}" y1="{Y(y2)}" x2="{xx+6}" y2="{Y(y2)}" stroke="{col}" stroke-width="1.6"/>'
                + text(t, (Y(y1) + Y(y2)) / 2 + 6, lab, 17, col, bold=True, anchor="end" if left else None))
    R = "#B03A2E"
    o.append(hdim(12, 48, 10.6, "36", col=R))
    o.append(hdim(48, 52, 10.6, "4", col=R))
    o.append(hdim(12, 24, 21.6, "12", col=R))
    o.append(hdim(24, 32, 33, "8", col=R))
    o.append(hdim(32, 52, 32.6, "20", col=R))
    o.append(hdim(12, 52, 54.2, "40", above=False, col=R))
    o.append(vdim(12, 19, 9.6, "7", col=R))
    o.append(vdim(19, 23, 9.6, "4", col=R))
    o.append(vdim(23, 30, 9.6, "7", col=R))
    o.append(vdim(30, 34, 9.6, "4", col=R))
    o.append(vdim(34, 41, 9.6, "7", col=R))
    o.append(vdim(41, 45, 9.6, "4", col=R))
    o.append(vdim(45, 52, 9.6, "7", col=R))
    o.append(vdim(12, 52, 54.6, "40", left=False, col=R))
    # flechas a radios
    def callout(px, py, tx, ty, lab):
        return (f'<line x1="{X(px)}" y1="{Y(py)}" x2="{X(tx)}" y2="{Y(ty)}" stroke="{GRAY}" stroke-width="1.4"/>'
                f'<circle cx="{X(px)}" cy="{Y(py)}" r="4" fill="{GRAY}"/>' + text(X(tx) + 6, Y(ty) + 6, lab, 17, GRAY))
    o.append(callout(51.4, 51.4, 57, 57.5, "radio exterior 2"))
    o.append(callout(44.7, 44.3, 54.5, 47.5, "radio interior 1"))
    o.append(callout(48.5, 41, 54.5, 39, "corte menta / papel: y 41"))
    o.append(callout(50, 43, 54.5, 43.5, "trazo que baja: 7 de ancho"))
    o.append(text(X(5), Y(5) - 10, "área de respeto: 7 (un renglón) por lado", 17, "#2E8A6E", bold=True))
    # panel derecho
    px = GX + 64 * U + 70
    y = GY + 10
    o.append(text(px, y, "Módulos", 28, bold=True)); y += 44
    for line in ["Renglón (alto de barra): 7. Es la unidad de todo.",
                 "Interlínea: 4. Cuatro filas: 4 × 7 + 3 × 4 = 40.",
                 "Caja del símbolo: 40 × 40, de x12 a x52 y de y12 a y52.",
                 "Radio exterior: 2 (canto de libreta, no píldora).",
                 "Radio interior: 1, solo en los dos ángulos del gancho.",
                 "Trazo que baja: 7 de ancho, igual que un renglón."]:
        o.append(text(px, y, line, 20)); y += 34
    y += 24
    o.append(text(px, y, "Largo de cada renglón", 28, bold=True)); y += 44
    for line in ["1 · arriba: 36 (x12–48). Deja una abertura de 4.",
                 "2 · margen: 12 (x12–24).",
                 "3 · margen: 12; aire de 8; travesaño menta: 20 (x32–52).",
                 "4 · base: 40 (x12–52), unida al travesaño por el trazo.",
                 "Corte del menta: línea recta en y41, ancho completo."]:
        o.append(text(px, y, line, 20)); y += 34
    y += 24
    o.append(text(px, y, "Área de respeto", 28, bold=True)); y += 44
    for line in ["Un renglón (7 de grilla, 17,5 % del lado del símbolo)",
                 "libre por los cuatro lados. Nada entra ahí: ni texto,",
                 "ni bordes, ni otra marca. Con el símbolo a 40 px,",
                 "son 7 px."]:
        o.append(text(px, y, line, 20)); y += 34
    y += 24
    o.append(text(px, y, "Tamaño mínimo", 28, bold=True)); y += 44
    for line in ["Principal: con el símbolo de 30 px de ancho o más",
                 "(ícono o favicon de 48 px en adelante).",
                 "Versión chica: solo en cuadros de 16 y 32 px exactos",
                 "(símbolo de 11 y 22 px). Otros tamaños bajo 48 px",
                 "se redondean a 32 o a 48. Bajo 16 px no se usa."]:
        o.append(text(px, y, line, 20)); y += 34
    # mini muestra de la versión chica en grilla
    y += 20
    k = 14
    o.append(f'<rect x="{px}" y="{y}" width="{16*k}" height="{16*k}" fill="{PAPER}"/>')
    for v in range(17):
        o.append(f'<line x1="{px+v*k}" y1="{y}" x2="{px+v*k}" y2="{y+16*k}" stroke="#DCE2DE" stroke-width="0.8"/>')
        o.append(f'<line x1="{px}" y1="{y+v*k}" x2="{px+16*k}" y2="{y+v*k}" stroke="#DCE2DE" stroke-width="0.8"/>')
    o.append(f'<g transform="translate({px} {y}) scale({k})" opacity="0.9">{sbody(INK)}</g>')
    o.append(text(px + 16 * k + 24, y + 30, "Versión chica, grilla de 16", 20, bold=True))
    o.append(text(px + 16 * k + 24, y + 62, "Caja de 11 × 11 px, 1 px corrida", 19, GRAY))
    o.append(text(px + 16 * k + 24, y + 90, "a la derecha y arriba.", 19, GRAY))
    o.append(text(px + 16 * k + 24, y + 118, "Se usa solo a 16 y 32 px.", 19, GRAY))
    o.append("</svg>")
    p = write("lamina-construccion.svg", "\n".join(o))
    render(p, os.path.join(OUT, "lamina-construccion.png"), W, H)


if __name__ == "__main__":
    os.makedirs(TMP, exist_ok=True)
    files()
    lamina_final()
    lamina_construccion()
    for f in os.listdir(TMP):
        os.remove(os.path.join(TMP, f))
    os.rmdir(TMP)
    print("listo")
