#!/usr/bin/env python3
"""Convierte «GymTrack» (o cualquier texto) en Manrope a trazos SVG, con el kerning real.

El kerning y los avances salen de HarfBuzz (`hb-shape`, aplica la tabla GPOS «kern» de la fuente).
Los contornos salen de fontTools. Todo queda en coordenadas absolutas, sin transformaciones.

Unidades: las de la grilla de 64 del símbolo (caja del símbolo x12-52, y12-52).
"""
import json, os, subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = "/Users/suidett/gymtrack/node_modules/@expo-google-fonts/manrope"
PESOS = {400: "400Regular/Manrope_400Regular.ttf", 500: "500Medium/Manrope_500Medium.ttf",
         600: "600SemiBold/Manrope_600SemiBold.ttf", 700: "700Bold/Manrope_700Bold.ttf",
         800: "800ExtraBold/Manrope_800ExtraBold.ttf"}

_cache = {}


def fuente(peso):
    if peso not in _cache:
        path = os.path.join(ROOT, PESOS[peso])
        f = TTFont(path)
        _cache[peso] = (path, f, f.getGlyphSet())
    return _cache[peso]


def shape(texto, peso):
    """Devuelve [(glifo, avance_con_kerning)] en unidades de la fuente."""
    path = fuente(peso)[0]
    out = subprocess.run(["hb-shape", "--output-format=json", path, texto],
                         check=True, capture_output=True, text=True).stdout
    return [(g["g"], g["ax"], g["dx"], g["dy"]) for g in json.loads(out)]


def cap_height(peso):
    f = fuente(peso)[1]
    return f["OS/2"].sCapHeight / f["head"].unitsPerEm


def x_height(peso):
    f = fuente(peso)[1]
    return f["OS/2"].sxHeight / f["head"].unitsPerEm


class Palabra:
    """Palabra en trazos. `cap` es la altura de mayúscula en unidades de grilla.
    `espaciado` es la fracción del cuerpo que se suma entre letras (−0,01 = −1 %).
    Se ubica con la tinta izquierda en `x` y la línea base en `base`."""

    def __init__(self, texto, peso=700, espaciado=-0.01, cap=29.0):
        self.texto, self.peso, self.espaciado, self.cap = texto, peso, espaciado, cap
        _, f, gs = fuente(peso)
        self.upm = f["head"].unitsPerEm
        self.cuerpo = cap / cap_height(peso)          # tamaño de letra en unidades de grilla
        self.s = self.cuerpo / self.upm
        track = espaciado * self.upm
        self.glifos = []                              # (nombre, x_origen en unidades de fuente)
        pen_x = 0.0
        sh = shape(texto, peso)
        for i, (g, ax, dx, dy) in enumerate(sh):
            self.glifos.append((g, pen_x + dx))
            pen_x += ax + (track if i < len(sh) - 1 else 0)
        # caja de tinta en unidades de fuente
        xs, ys = [], []
        for g, ox in self.glifos:
            b = BoundsPen(gs)
            gs[g].draw(b)
            if b.bounds:
                xs += [ox + b.bounds[0], ox + b.bounds[2]]
                ys += [b.bounds[1], b.bounds[3]]
        self.ink = (min(xs), min(ys), max(xs), max(ys))

    def ancho(self):
        return (self.ink[2] - self.ink[0]) * self.s

    def caja(self, x, base):
        """Caja de tinta (x0, y0, x1, y1) en grilla, con la tinta izquierda en x."""
        s = self.s
        return (x, base - self.ink[3] * s, x + self.ancho(), base - self.ink[1] * s)

    def d(self, x, base, dec=3):
        """Atributo d del path, con la tinta izquierda en x y la línea base en `base`."""
        _, _, gs = fuente(self.peso)
        s = self.s
        x0 = x - self.ink[0] * s
        partes = []
        for g, ox in self.glifos:
            pen = SVGPathPen(gs, ntos=lambda v: _num(v, dec))
            tp = TransformPen(pen, (s, 0, 0, -s, x0 + ox * s, base))
            gs[g].draw(tp)
            partes.append(pen.getCommands())
        return "".join(partes)


def _num(v, dec):
    t = f"{v:.{dec}f}".rstrip("0").rstrip(".")
    return "0" if t in ("-0", "") else t
