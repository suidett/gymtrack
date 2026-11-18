"""Convierte texto a trazados SVG con las fuentes del proyecto (sin red).

Usa los TTF que ya trae node_modules/@expo-google-fonts (solo lectura) y aplica
el kerning de la tabla GPOS, para que «GymTrack» quede igual que en pantalla.
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parents[5]  # /…/gymtrack
FUENTES = {
    "manrope-500": RAIZ / "node_modules/@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf",
    "manrope-700": RAIZ / "node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf",
    "manrope-800": RAIZ / "node_modules/@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf",
    "plex-600": RAIZ / "node_modules/@expo-google-fonts/ibm-plex-mono/600SemiBold/IBMPlexMono_600SemiBold.ttf",
}


def _num(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Fuente:
    _cache = {}

    def __new__(cls, clave):
        if clave not in cls._cache:
            obj = super().__new__(cls)
            obj._cargar(clave)
            cls._cache[clave] = obj
        return cls._cache[clave]

    def _cargar(self, clave):
        self.font = TTFont(str(FUENTES[clave]))
        self.gs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.upm = self.font["head"].unitsPerEm
        self.hmtx = self.font["hmtx"]
        self._pares = self._leer_kern()

    def _leer_kern(self):
        pares = []
        if "GPOS" not in self.font:
            return pares
        gpos = self.font["GPOS"].table
        indices = set()
        for fr in gpos.FeatureList.FeatureRecord:
            if fr.FeatureTag == "kern":
                indices.update(fr.Feature.LookupListIndex)
        for i in sorted(indices):
            lk = gpos.LookupList.Lookup[i]
            for st in lk.SubTable:
                if lk.LookupType == 9:
                    st = st.ExtSubTable
                if getattr(st, "LookupType", 2) == 2:
                    pares.append(st)
        return pares

    def kern(self, g1, g2):
        for st in self._pares:
            cov = st.Coverage.glyphs
            if g1 not in cov:
                continue
            if st.Format == 1:
                ps = st.PairSet[cov.index(g1)]
                for rec in ps.PairValueRecord:
                    if rec.SecondGlyph == g2:
                        return getattr(rec.Value1, "XAdvance", 0) or 0
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs.get(g1, 0)
                c2 = st.ClassDef2.classDefs.get(g2, 0)
                rec = st.Class1Record[c1].Class2Record[c2]
                v = getattr(rec.Value1, "XAdvance", 0) or 0
                if v:
                    return v
        return 0

    def glifo(self, ch):
        return self.cmap[ord(ch)]

    def bbox_glifo(self, ch):
        from fontTools.pens.boundsPen import BoundsPen

        bp = BoundsPen(self.gs)
        self.gs[self.glifo(ch)].draw(bp)
        return bp.bounds  # xMin, yMin, xMax, yMax en unidades de la fuente

    def ancho(self, texto, tam, espaciado_em=0.0):
        s = tam / self.upm
        x = 0.0
        nombres = [self.glifo(c) for c in texto]
        for i, g in enumerate(nombres):
            x += self.hmtx[g][0] * s
            if i + 1 < len(nombres):
                x += self.kern(g, nombres[i + 1]) * s + espaciado_em * tam
        return x

    def trazado(self, texto, tam, x=0.0, base=0.0, espaciado_em=0.0, ancla="start"):
        """Devuelve (d, ancho). x/base en px; ancla start|middle|end."""
        w = self.ancho(texto, tam, espaciado_em)
        if ancla == "middle":
            x -= w / 2
        elif ancla == "end":
            x -= w
        s = tam / self.upm
        nombres = [self.glifo(c) for c in texto]
        pen = SVGPathPen(self.gs, ntos=_num)
        cx = x
        for i, g in enumerate(nombres):
            tp = TransformPen(pen, (s, 0, 0, -s, cx, base))
            self.gs[g].draw(tp)
            cx += self.hmtx[g][0] * s
            if i + 1 < len(nombres):
                cx += self.kern(g, nombres[i + 1]) * s + espaciado_em * tam
        return pen.getCommands(), w


def texto_svg(texto, clave, tam, x, base, color, ancla="start", espaciado_em=0.0):
    d, w = Fuente(clave).trazado(texto, tam, x, base, espaciado_em, ancla)
    return f'<path fill="{color}" d="{d}"/>', w
