"""Geometría del símbolo «Visto»: círculo menta + visto de un trazo.

Todo sale de aquí: el símbolo, la versión de 16 px, el ícono de app y el botón
de marcar serie usan los mismos tres vértices.
"""
import math

# ---- Paleta (solo hex del encargo) ----
MENTA = "#45B392"
MENTA_PROFUNDA = "#2F7F68"
ACENTO_TEXTO = "#1F6B56"
TINTA = "#131A17"
OSCURO = "#0E1412"
TEXTO_OSCURO = "#ECF2EF"
FONDO = "#F5F7F5"
SUPERFICIE = "#FFFFFF"
SECUNDARIO = "#56635D"
MENTA_SUAVE = "#DDF3EC"
BORDE_CONTROL = "#7C8983"
DESHAB = "#E3E8E5"
SUP_OSCURA = "#18211D"
SUP_OSCURA_ALTA = "#222D28"
SECUNDARIO_OSCURO = "#9DADA6"
ACENTO_OSCURO = "#6FD0B2"

# ---- Grilla de 24 ----
CENTRO = (12.0, 12.0)
RADIO = 11.0
TRAZO = 2.75
# Vértices ajustados ópticamente (el encargo daba 6,75;12,5 → 10,5;16,25 → 17,5;8,5).
# Se subió el visto 0,4 y se acortó el brazo largo para que el centro de la caja
# quede 0,1 sobre el centro y el centroide 0,5 bajo él: así se ve centrado.
VISTO = [(7.0, 12.0), (10.6, 15.6), (17.3, 8.2)]

# ---- Grilla de 16 (versión ajustada a píxel) ----
CENTRO_16 = (8.0, 8.0)
RADIO_16 = 7.5
TRAZO_16 = 2.25          # ≈ 3,375 unidades de la grilla de 24 (el encargo pide ≥ 3,25)
VISTO_16 = [(4.5, 7.5), (7.0, 10.0), (11.5, 5.5)]  # medios píxeles


def f(v):
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def puntos(pts):
    return " ".join(f"{f(x)} {f(y)}" for x, y in pts)


def polilinea_d(pts):
    (x0, y0), *resto = pts
    return f"M{f(x0)} {f(y0)}" + "".join(f"L{f(x)} {f(y)}" for x, y in resto)


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def _add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def _mul(a, k):
    return (a[0] * k, a[1] * k)


def _uni(a):
    n = math.hypot(*a)
    return (a[0] / n, a[1] / n)


def _cruz(a, b):
    return a[0] * b[1] - a[1] * b[0]


def contorno_visto(pts, ancho):
    """Contorno cerrado de una polilínea de 2 tramos con puntas y unión redondas.

    Sirve para calar el visto (versión de un color) con fill-rule evenodd,
    que react-native-svg soporta, sin máscaras.
    """
    A, V, E = pts
    h = ancho / 2
    u1 = _uni(_sub(V, A))
    u2 = _uni(_sub(E, V))
    n1 = (-u1[1], u1[0])
    n2 = (-u2[1], u2[0])
    # lado interior: aquel cuyo normal apunta hacia donde sigue el trazo
    si = 1 if (n1[0] * u2[0] + n1[1] * u2[1]) > 0 else -1
    so = -si
    p_ini = _add(A, _mul(n1, so * h))
    p_v1 = _add(V, _mul(n1, so * h))
    p_v2 = _add(V, _mul(n2, so * h))
    p_e_o = _add(E, _mul(n2, so * h))
    p_e_tip = _add(E, _mul(u2, h))
    p_e_i = _add(E, _mul(n2, si * h))
    # intersección de las paralelas interiores
    a0 = _add(A, _mul(n1, si * h))
    b0 = _add(V, _mul(n2, si * h))
    den = _cruz(u1, u2)
    t = _cruz(_sub(b0, a0), u2) / den
    p_in = _add(a0, _mul(u1, t))
    p_a_i = _add(A, _mul(n1, si * h))
    p_a_tip = _add(A, _mul(u1, -h))

    def arco(c, de, a):
        sweep = 1 if _cruz(_sub(de, c), _sub(a, c)) > 0 else 0
        return f"A{f(h)} {f(h)} 0 0 {sweep} {f(a[0])} {f(a[1])}"

    d = (
        f"M{f(p_ini[0])} {f(p_ini[1])}"
        f"L{f(p_v1[0])} {f(p_v1[1])}"
        + arco(V, p_v1, p_v2)
        + f"L{f(p_e_o[0])} {f(p_e_o[1])}"
        + arco(E, p_e_o, p_e_tip)
        + arco(E, p_e_tip, p_e_i)
        + f"L{f(p_in[0])} {f(p_in[1])}"
        + f"L{f(p_a_i[0])} {f(p_a_i[1])}"
        + arco(A, p_a_i, p_a_tip)
        + arco(A, p_a_tip, p_ini)
        + "Z"
    )
    return d


def circulo_d(cx, cy, r):
    return (
        f"M{f(cx - r)} {f(cy)}"
        f"A{f(r)} {f(r)} 0 1 0 {f(cx + r)} {f(cy)}"
        f"A{f(r)} {f(r)} 0 1 0 {f(cx - r)} {f(cy)}Z"
    )


def transformar(pts, centro_origen, centro_destino, k):
    return [
        (centro_destino[0] + (x - centro_origen[0]) * k, centro_destino[1] + (y - centro_origen[1]) * k)
        for x, y in pts
    ]


def aire_minimo(pts, ancho, centro, radio):
    """Distancia mínima entre el borde del trazo y el borde del círculo."""
    # el punto más lejano del trazo está en un vértice (puntas redondas)
    return min(radio - (math.dist(p, centro) + ancho / 2) for p in pts)


def distancia_maxima(pts, ancho, centro):
    return max(math.dist(p, centro) + ancho / 2 for p in pts)
