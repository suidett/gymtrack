#!/usr/bin/env python3
"""Genera las 8 variantes de la ronda 2 (G de renglones) y sus renders."""
import math, os, subprocess, json, sys

OUT = "/Users/suidett/gymtrack/docs/marca/logo/exploracion-2"
REN = os.path.join(OUT, "render")
INK, PAPER, MINT = "#131A17", "#F5F7F5", "#45B392"


def f(n):
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return s if s != "-0" else "0"


def rrect_path(x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    if r <= 0:
        return f"M{f(x)} {f(y)}H{f(x+w)}V{f(y+h)}H{f(x)}Z"
    return (f"M{f(x+r)} {f(y)}H{f(x+w-r)}A{f(r)} {f(r)} 0 0 1 {f(x+w)} {f(y+r)}"
            f"V{f(y+h-r)}A{f(r)} {f(r)} 0 0 1 {f(x+w-r)} {f(y+h)}"
            f"H{f(x+r)}A{f(r)} {f(r)} 0 0 1 {f(x)} {f(y+h-r)}"
            f"V{f(y+r)}A{f(r)} {f(r)} 0 0 1 {f(x+r)} {f(y)}Z")


def bar(x0, x1, y, h, role="ink"):
    return dict(x=x0, y=y, w=x1 - x0, h=h, role=role)


# ---- geometria base (v07) -------------------------------------------------
def rows(y0, h, gap, n):
    return [y0 + i * (h + gap) for i in range(n)]


V = {}

# A · Interlinea fina: barras de 8,5 e interlinea de 2,5
y = rows(11.25, 8.5, 2.5, 4)
V["a"] = dict(rx=2, shapes=[
    bar(12, 48, y[0], 8.5), bar(12, 24, y[1], 8.5), bar(12, 24, y[2], 8.5),
    bar(32, 52, y[2], 8.5, "accent"), bar(12, 52, y[3], 8.5)])

# B · Cinco renglones con espolon
y = rows(10, 6, 3.5, 5)
V["b"] = dict(rx=2, shapes=[
    bar(12, 48, y[0], 6), bar(12, 23, y[1], 6), bar(12, 23, y[2], 6),
    bar(31, 52, y[2], 6, "accent"), bar(12, 23, y[3], 6), bar(41, 52, y[3], 6),
    bar(12, 52, y[4], 6)])

# C · Borde redondo: las puntas de los renglones siguen un circulo
R = 22.5
y = rows(12, 7, 4, 4)
def hw(yy, h=7):
    dy = abs(yy + h / 2 - 32)
    return math.sqrt(R * R - dy * dy)
t, m = hw(y[0]), hw(y[1])
V["c"] = dict(rx=2, shapes=[
    bar(32 - t, 32 + t - 4, y[0], 7), bar(32 - m, 24, y[1], 7),
    bar(32 - m, 24, y[2], 7), bar(33, 32 + m, y[2], 7, "accent"),
    bar(32 - t, 32 + t, y[3], 7)])

# D · Abertura amplia: renglon de arriba mas corto, travesano entra mas
y = rows(12, 7, 4, 4)
V["d"] = dict(rx=2, shapes=[
    bar(12, 40, y[0], 7), bar(12, 24, y[1], 7), bar(12, 24, y[2], 7),
    bar(29, 52, y[2], 7, "accent"), bar(12, 52, y[3], 7)])

# E · Renglon en curso: el acento pasa al renglon de abajo
V["e"] = dict(rx=2, shapes=[
    bar(12, 48, y[0], 7), bar(12, 24, y[1], 7), bar(12, 24, y[2], 7),
    bar(32, 52, y[2], 7), bar(12, 52, y[3], 7, "accent")])

# F · Canto recto
V["f"] = dict(rx=0, shapes=[
    bar(12, 48, y[0], 7), bar(12, 24, y[1], 7), bar(12, 24, y[2], 7),
    bar(32, 52, y[2], 7, "accent"), bar(12, 52, y[3], 7)])

# G · Pagina entera: la G calada en una pagina
yg = rows(16, 6.5, 3.5, 4)
V["g"] = dict(rx=1.5, page=(9, 9, 46, 46, 6), shapes=[
    bar(16, 44, yg[0], 6.5), bar(16, 26, yg[1], 6.5), bar(16, 26, yg[2], 6.5),
    bar(32, 48, yg[2], 6.5, "accent"), bar(16, 48, yg[3], 6.5)])

# H · Ruptura: el trazo que baja (un vertical une travesano y base)
V["h"] = dict(rx=2, shapes=[
    bar(12, 48, y[0], 7), bar(12, 24, y[1], 7), bar(12, 24, y[2], 7),
    dict(x=45, y=y[2] + 3, w=7, h=y[3] + 7 - y[2] - 3, role="ink"),
    bar(32, 52, y[2], 7, "accent"), bar(12, 52, y[3], 7)])

NAMES = {
    "a": "Interlínea fina", "b": "Cinco renglones", "c": "Borde redondo",
    "d": "Abertura amplia", "e": "Renglón en curso", "f": "Canto recto",
    "g": "Página entera", "h": "Ruptura: trazo que baja",
}


def body(key, ink="currentColor", accent=MINT, mono=False, page_fg=None):
    """Devuelve el contenido interno (sin <svg>) de la variante."""
    v = V[key]
    rx = v["rx"]
    acc = ink if mono else accent
    out = []
    if "page" in v:
        px, py, pw, ph, pr = v["page"]
        # pagina en tinta con los renglones calados (evenodd); el acento se pinta encima
        holes = "".join(rrect_path(s["x"], s["y"], s["w"], s["h"], rx) for s in v["shapes"]
                        if s["role"] == "ink" or mono is False or True)
        out.append(f'<path fill="{ink}" fill-rule="evenodd" d="{rrect_path(px, py, pw, ph, pr)}{holes}"/>')
        if not mono:
            for s in v["shapes"]:
                if s["role"] == "accent":
                    out.append(f'<path class="acento" fill="{accent}" d="{rrect_path(s["x"], s["y"], s["w"], s["h"], rx)}"/>')
        return "\n  ".join(out)
    for s in v["shapes"]:
        fill = acc if s["role"] == "accent" else ink
        cls = ' class="acento"' if s["role"] == "accent" else ""
        out.append(f'<path{cls} fill="{fill}" d="{rrect_path(s["x"], s["y"], s["w"], s["h"], rx)}"/>')
    return "\n  ".join(out)


def svg(key, color=INK, mono=False):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" '
            f'fill="none" style="color:{color}">\n  <!-- 07{key.upper()} {NAMES[key]} -->\n  '
            f'{body(key, mono=mono)}\n</svg>\n')


def render(src, dst, size, bg=None):
    cmd = ["rsvg-convert", "-w", str(size), "-h", str(size)]
    if bg:
        cmd += ["-b", bg]
    subprocess.run(cmd + [src, "-o", dst], check=True)


if __name__ == "__main__":
    from PIL import Image
    tmp = os.path.join(REN, "_tmp")
    os.makedirs(tmp, exist_ok=True)
    report = {}
    for k in sorted(V):
        p = os.path.join(OUT, f"v07{k}.svg")
        open(p, "w").write(svg(k))
        mono = os.path.join(tmp, f"v07{k}-mono.svg")
        open(mono, "w").write(svg(k, mono=True))
        inv = os.path.join(tmp, f"v07{k}-inv.svg")
        open(inv, "w").write(svg(k, color=PAPER))
        render(p, os.path.join(REN, f"v07{k}-256.png"), 256, PAPER)
        render(inv, os.path.join(REN, f"v07{k}-256-tinta.png"), 256, INK)
        for s in (64, 32, 16):
            render(mono, os.path.join(REN, f"v07{k}-{s}.png"), s, PAPER)
        # radio maximo ocupado (sobre 64) medido en un render de 512 sin fondo
        big = os.path.join(tmp, f"{k}-512.png")
        render(mono, big, 512)
        im = Image.open(big).split()[-1]
        px = im.load()
        rmax = 0
        for yy in range(512):
            for xx in range(512):
                if px[xx, yy] > 40:
                    d = math.hypot(xx + 0.5 - 256, yy + 0.5 - 256)
                    rmax = max(rmax, d)
        report[k] = round(rmax / 8, 2)
    print(json.dumps(report))
