"""Arma botones.html (autocontenida: solo Google Fonts afuera).

Uso: python3 docs/marca/v2/visto/herramientas/generar_botones.py
Las formas del visto salen de geometria.py, igual que el logo.
"""
from pathlib import Path

from geometria import (
    CENTRO, RADIO, TRAZO, VISTO, VISTO_16, contorno_visto, f, polilinea_d, transformar,
)
from generar_logo import logotipo_horizontal, medidas_palabra
from texto import Fuente

DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- formas
K56 = 28 / RADIO
VISTO_56 = transformar(VISTO, CENTRO, (28, 28), K56)
D_VISTO_56 = polilinea_d(VISTO_56)
TRAZO_56 = TRAZO * K56  # 7 dp: el mismo grosor relativo del símbolo
D_VISTO_16 = polilinea_d(VISTO_16)


def logo_inline(alto, clase="logo"):
    """Logotipo horizontal con colores por variable CSS (cambia con el tema)."""
    m = medidas_palabra()
    D = 1.3 * m["alto_g"]
    sep = D / 2
    fu = Fuente("manrope-700")
    arriba = min(-m["sube"], m["centro_g"] - D / 2)
    abajo = max(m["desc"], m["centro_g"] + D / 2)
    h = abajo - arriba
    base = -arriba
    cy = base + m["centro_g"]
    ancho = D + sep + (m["ancho"] - m["lsb"] - m["rsb"])
    d, _ = fu.trazado("GymTrack", 100, D + sep - m["lsb"], base, -0.015)
    k = D / (2 * RADIO)
    pts = transformar(VISTO, CENTRO, (D / 2, cy), k)
    w = alto * ancho / h
    return (
        f'<svg class="{clase}" viewBox="0 0 {f(ancho)} {f(h)}" width="{f(w)}" height="{alto}" role="img" aria-label="GymTrack">'
        f'<circle cx="{f(D/2)}" cy="{f(cy)}" r="{f(D/2)}" style="fill:var(--accion)"/>'
        f'<path d="{polilinea_d(pts)}" fill="none" style="stroke:var(--sobre-accion)" stroke-width="{f(TRAZO*k)}" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<path d="{d}" style="fill:var(--texto)"/></svg>'
    )


def simbolo_inline(tam):
    k = (tam / 2) / RADIO
    pts = transformar(VISTO, CENTRO, (tam / 2, tam / 2), k)
    return (
        f'<svg class="simbolo" viewBox="0 0 {tam} {tam}" width="{tam}" height="{tam}" aria-hidden="true">'
        f'<circle cx="{tam/2}" cy="{tam/2}" r="{tam/2}" style="fill:var(--accion)"/>'
        f'<path d="{polilinea_d(pts)}" fill="none" style="stroke:var(--sobre-accion)" stroke-width="{f(TRAZO*k)}" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    )


# íconos de 24 dp, trazo 2 dp, puntas redondas (se pintan con currentColor)
ICONOS = {
    "mas": '<path d="M12 5v14M5 12h14"/>',
    "menos": '<path d="M5 12h14"/>',
    "cerrar": '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    "cronometro": '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 3.5h4M12 3.5v3"/>',
    "persona": '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    "historial": '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v3.5h3.5M12 8v4.5l3 2"/>',
}


def icono(nombre, clase="ico", trazo=2):
    return (
        f'<svg class="{clase}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" '
        f'stroke-width="{trazo}" stroke-linecap="round" stroke-linejoin="round">{ICONOS[nombre]}</svg>'
    )


ARO = (
    '<svg class="aro" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">'
    '<circle cx="10" cy="10" r="8.75" fill="none" stroke="currentColor" stroke-width="2.5" '
    'stroke-linecap="round" pathLength="100" stroke-dasharray="68 100"/></svg>'
)


def btn(etq, var="primario", estado="", ico=None, alto=48, carga="Guardando…", extra="", attrs=""):
    clases = f"btn btn-{var}" + (" btn-56" if alto == 56 else "")
    if estado == "pres":
        clases += " es-pres"
    elif estado == "foco":
        clases += " es-foco"
    elif estado == "carga":
        clases += " cargando"
    dis = " disabled" if estado == "deshab" else ""
    busy = ' aria-busy="true"' if estado == "carga" else ""
    i = icono(ico) if ico else ""
    return (
        f'<button type="button" class="{clases} {extra}"{dis}{busy} {attrs}>'
        f'<span class="btn-etq">{i}<span>{etq}</span></span>'
        f'<span class="btn-carga" aria-hidden="true">{ARO}<span class="btn-carga-txt">{carga}</span></span></button>'
    )


def btn_icono(nombre, etq, tam=48, estado="", attrs=""):
    clases = "btn-icono" + (" g56" if tam == 56 else "")
    if estado == "pres":
        clases += " es-pres"
    elif estado == "foco":
        clases += " es-foco"
    dis = " disabled" if estado == "deshab" else ""
    return f'<button type="button" class="{clases}" aria-label="{etq}"{dis} {attrs}>{icono(nombre)}</button>'


def paso(valor, unidad, nombre, estado="", ancho=112, attrs=""):
    """Fila [−] cifra [+] de 56 dp."""
    pres_mas = " es-pres" if estado == "pres" else ""
    foco_mas = " es-foco" if estado == "foco" else ""
    dis = " disabled" if estado == "deshab" else ""
    edit = " editando" if estado == "edit" else ""
    cls_dis = " deshab" if estado == "deshab" else ""
    return (
        f'<div class="paso{cls_dis}" role="group" aria-label="{nombre}" {attrs}>'
        f'<button type="button" class="btn-icono g56 paso-btn" data-dir="-1" aria-label="Restar"{dis}>{icono("menos", "ico", 2.5)}</button>'
        f'<button type="button" class="cifra{edit}" style="width:{ancho}px" aria-label="{nombre}: {valor} {unidad}. Toca para escribir"{dis}>'
        f'<span class="cifra-in"><span class="num-pila"><span class="num">{valor}</span></span><span class="unidad">{unidad}</span></span></button>'
        f'<button type="button" class="btn-icono g56 paso-btn{pres_mas}{foco_mas}" data-dir="1" aria-label="Sumar"{dis}>{icono("mas", "ico", 2.5)}</button>'
        f"</div>"
    )


def boton_visto(estado="", etq="Marcar serie como hecha"):
    clases = "visto-btn"
    if estado == "pres":
        clases += " es-pres"
    elif estado == "foco":
        clases += " es-foco"
    dis = " disabled" if estado == "deshab" else ""
    hecho = "true" if estado == "hecha" else "false"
    return (
        f'<button type="button" class="{clases}" aria-pressed="{hecho}" aria-label="{etq}"{dis}>'
        f'<svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">'
        f'<circle class="vb-aro" cx="28" cy="28" r="27"/>'
        f'<circle class="vb-disco" cx="28" cy="28" r="28"/>'
        f'<path class="vb-visto" d="{D_VISTO_56}" stroke-width="{f(TRAZO_56)}" pathLength="1"/>'
        f"</svg></button>"
    )


def fila_serie(n, kg, reps, estado="", attrs=""):
    hecha = " hecha" if estado == "hecha" else ""
    dis = " deshab" if estado == "deshab" else ""
    return (
        f'<div class="fila{hecha}{dis}" {attrs}>'
        f'<span class="fila-n"><span class="fila-n-etq">Serie</span><span class="mono">{n}</span></span>'
        f'<span class="fila-datos mono"><span class="f-kg">{kg}</span><span class="u">kg</span>'
        f'<span class="x">×</span><span class="f-reps">{reps}</span><span class="u">reps</span></span>'
        + boton_visto(estado, f"Marcar serie {n} como hecha")
        + "</div>"
    )


def chip(etq, estado="", elegido=False, attrs=""):
    clases = "chip"
    if estado == "pres":
        clases += " es-pres"
    elif estado == "foco":
        clases += " es-foco"
    dis = " disabled" if estado == "deshab" else ""
    return (
        f'<button type="button" class="{clases}" aria-pressed="{str(elegido).lower()}"{dis} {attrs}>'
        f'<span class="chip-cara"><svg class="chip-visto" viewBox="0 0 16 16" aria-hidden="true">'
        f'<path d="{D_VISTO_16}"/></svg><span>{etq}</span></span></button>'
    )


def interruptor(etq, encendido=False, estado="", attrs=""):
    clases = "interruptor"
    if estado == "pres":
        clases += " es-pres"
    elif estado == "foco":
        clases += " es-foco"
    dis = " disabled" if estado == "deshab" else ""
    return (
        f'<button type="button" role="switch" class="{clases}" aria-checked="{str(encendido).lower()}"{dis} {attrs}>'
        f'<span class="int-etq">{etq}</span><span class="riel"><span class="perilla"></span></span></button>'
    )


def confirmacion(attrs="", attrs_no="", attrs_si="", estado_si=""):
    """Tarjeta de confirmación de una acción destructiva: el único lugar con peligro relleno."""
    return (
        f'<div class="confirmar" role="group" aria-label="Confirmar borrado" {attrs}>'
        '<p class="confirmar-t">¿Borrar «Piernas A»?</p><p class="confirmar-sec">No se puede deshacer.</p>'
        f'<div class="fila-btns">{btn("Cancelar", "borde", attrs=attrs_no)}'
        f'{btn("Sí, borrar", "peligro-confirmar", estado_si, carga="Borrando…", attrs=attrs_si)}</div></div>'
    )


def empezar(estado="", attrs=""):
    return btn("Empezar entrenamiento", "primario", estado, None, 48, "Preparando…", "btn-empezar", attrs)


# ---------------------------------------------------------------- lámina estática
def celda(contenido, rotulo, ancho="1"):
    cl = "estado" + (" ancho" if ancho == "todo" else "")
    return f'<figure class="{cl}"><div class="estado-pieza">{contenido}</div><figcaption>{rotulo}</figcaption></figure>'


def marco_estados(tema, celdas, cols=2):
    nombre = "Clara" if tema == "clara" else "Modo gimnasio"
    return (
        f'<div class="marco" data-tema="{tema}"><div class="marco-tit"><span>{nombre}</span><span class="mono">412 dp</span></div>'
        f'<div class="estados c{cols}" inert>{"".join(celdas)}</div></div>'
    )


def pieza(titulo, spec, celdas_fn, cols=2, ident=""):
    return (
        f'<article class="pieza" id="{ident}"><div class="pieza-info"><h3>{titulo}</h3>{spec}</div>'
        + marco_estados("clara", celdas_fn(), cols)
        + marco_estados("gimnasio", celdas_fn(), cols)
        + "</article>"
    )


def piezas():
    out = []
    E5 = [("", "Reposo"), ("pres", "Presionado"), ("foco", "Foco"), ("deshab", "Deshabilitado"), ("carga", "Cargando")]

    out.append(pieza(
        "Primario",
        "<p>Alto 48 dp (56 en entrenamiento) · radio 16 · relleno lateral 20 · Manrope 700 de 16 sp.</p>"
        "<p>Clara: menta <code>#45B392</code> con borde interior de 1,5 dp <code>#2F7F68</code> y texto tinta. "
        "Gimnasio: mismo relleno, sin borde, texto <code>#0E1412</code>.</p>"
        "<p class='vib'>Vibra al presionar: <code>impactAsync(Light)</code></p>",
        lambda: [celda(btn("Guardar rutina", "primario", e), r) for e, r in E5]
        + [celda(btn("Siguiente ejercicio", "primario", "", None, 56), "Alto 56 · entrenamiento", "todo")],
        2, "primario"))

    out.append(pieza(
        "Secundario tonal",
        "<p>Relleno <code>#DDF3EC</code>, borde 1,5 dp <code>#2F7F68</code>, texto <code>#1F6B56</code>. "
        "Gimnasio: relleno <code>#1D3A31</code>, texto <code>#6FD0B2</code>, sin borde.</p>"
        "<p>Al presionar baja a un tono intermedio: <code>#A0D9C8</code> (<code>#295E4E</code> en gimnasio) y la etiqueta pasa al color de texto. "
        "Queda a medio camino entre el tonal y el primario, y ya no se confunde con el primario en reposo.</p><p class='vib'>Sin vibración al presionar.</p>",
        lambda: [celda(btn("Agregar serie", "secundario", e), r) for e, r in E5]
        + [celda(btn("Agregar ejercicio", "secundario", "", "mas"), "Con ícono de 20 dp y 8 de separación", "todo")],
        2, "secundario"))

    E4 = [("", "Reposo"), ("pres", "Presionado"), ("foco", "Foco"), ("deshab", "Deshabilitado")]
    out.append(pieza(
        "Borde y fantasma",
        "<p>Borde: transparente, borde 1,5 dp <code>#7C8983</code> (<code>#74857E</code> en gimnasio), texto tinta.</p>"
        "<p>Fantasma: sin borde, texto <code>#1F6B56</code> (<code>#6FD0B2</code>). Presionados toman el fondo menta suave.</p>",
        lambda: [celda(btn("Ver historial", "borde", e), "Borde · " + r.lower()) for e, r in E4]
        + [celda(btn("Omitir", "fantasma", e), "Fantasma · " + r.lower()) for e, r in E4],
        2, "borde"))

    out.append(pieza(
        "Peligro",
        "<p><strong>Contorno</strong> en los dos modos: fondo transparente, borde 1,5 dp y texto en el rojo del modo, "
        "<code>#B3261E</code> en clara y <code>#FF8A80</code> en gimnasio. Así «Borrar rutina» nunca es lo más llamativo de la pantalla. "
        "Al presionarlo se llena de rojo.</p>"
        "<p><strong>Relleno</strong> solo en la confirmación («Sí, borrar»): <code>#B3261E</code> con texto blanco en clara; "
        "<code>#FF8A80</code> con texto <code>#131A17</code> en gimnasio. Presionado: <code>#8C1D18</code> / <code>#FFB4AB</code>, "
        "tokens de la paleta. La carga («Borrando…») ocurre en la confirmación.</p>",
        lambda: [celda(btn("Borrar rutina", "peligro", e), "Contorno · " + r.lower()) for e, r in E4]
        + [celda(confirmacion(), "Confirmación: el único lugar con relleno", "todo"),
           celda(btn("Sí, borrar", "peligro-confirmar", "pres"), "Relleno · presionado"),
           celda(btn("Sí, borrar", "peligro-confirmar", "carga", carga="Borrando…"), "Relleno · cargando")],
        2, "peligro"))

    out.append(pieza(
        "Botón de ícono",
        "<p>Círculo de 48 o 56 dp, superficie, borde 1,5 dp <code>#7C8983</code>, ícono de 24 dp con trazo de 2 dp y puntas redondas.</p>"
        "<p>Siempre con nombre accesible: «Descanso», «Cerrar».</p>",
        lambda: [
            celda(btn_icono("cronometro", "Descanso"), "48 · reposo"),
            celda(btn_icono("mas", "Agregar serie", 56), "56 · reposo"),
            celda(btn_icono("cerrar", "Cerrar", 48, "pres"), "Presionado"),
            celda(btn_icono("cerrar", "Cerrar", 48, "foco"), "Foco"),
            celda(btn_icono("cerrar", "Cerrar", 48, "deshab"), "Deshabilitado"),
        ],
        3, "icono"))

    out.append(pieza(
        "Más y menos con cifra",
        "<p>Fila de 56 dp: dos círculos de 56 y la cifra en IBM Plex Mono 600 de 28 sp; unidad en Manrope 500 de 13 sp. "
        "Ancho de la cifra 112 dp (mínimo 96) para que «102,5» no mueva los botones.</p>"
        "<p>Toca la cifra para escribirla (subrayado de 2 dp). Mantén presionado: repite a los 400 ms y luego cada 90 ms.</p>"
        "<p class='vib'>Por paso: <code>selectionAsync()</code> · en el límite: <code>notificationAsync(Warning)</code></p>",
        lambda: [
            celda(paso("80", "kg", "Kilos"), "Reposo", "todo"),
            celda(paso("82,5", "kg", "Kilos", "pres"), "Presionando +", "todo"),
            celda(paso("10", "reps", "Repeticiones", "foco"), "Foco en +", "todo"),
            celda(paso("82,5", "kg", "Kilos", "edit"), "Escribiendo la cifra", "todo"),
            celda(paso("80", "kg", "Kilos", "deshab"), "Deshabilitado", "todo"),
        ],
        1, "paso"))

    out.append(pieza(
        "Marcar serie",
        "<p>Círculo de 56 dp al borde derecho de la fila. Pendiente: aro vacío, superficie con borde 2 dp <code>#7C8983</code> y nada adentro.</p>"
        "<p>Hecha: exactamente el símbolo (disco menta lleno con visto tinta) y <strong>toda la fila</strong> pasa a <code>#DDF3EC</code> "
        "(<code>#1D3A31</code> en gimnasio). Pendiente y hecha cambian de forma, no solo de color: aro vacío contra disco lleno con visto.</p>"
        "<p class='vib'>Marcar: <code>notificationAsync(Success)</code> · desmarcar: <code>selectionAsync()</code></p>",
        lambda: [
            celda(fila_serie(2, "80", "10"), "Pendiente", "todo"),
            celda(fila_serie(2, "80", "10", "pres"), "Presionado", "todo"),
            celda(fila_serie(2, "80", "10", "foco"), "Foco", "todo"),
            celda(fila_serie(1, "80", "10", "hecha"), "Hecha", "todo"),
            celda(fila_serie(3, "80", "10", "deshab"), "Deshabilitada (serie bloqueada): aro punteado", "todo"),
        ],
        1, "serie"))

    out.append(pieza(
        "Chip o selector",
        "<p>Pastilla de 40 dp visible con zona de toque de 48. Sin elegir: superficie, borde 1,5 dp <code>#7C8983</code>, texto 500.</p>"
        "<p>Elegido: <code>#DDF3EC</code>, borde <code>#2F7F68</code>, texto 700 y un visto de 16 dp. Elegido y presionado: tonal presionado <code>#A0D9C8</code> / <code>#295E4E</code>.</p>"
        "<p>Van en una sola fila que se desliza de lado; el último chip queda cortado en el borde para avisar que hay más.</p>"
        "<p class='vib'>Al cambiar: <code>selectionAsync()</code></p>",
        lambda: [
            celda(chip("Piernas"), "Sin elegir"),
            celda(chip("Piernas", "pres"), "Presionado"),
            celda(chip("Piernas", "foco"), "Foco"),
            celda(chip("Piernas", "", True), "Elegido"),
            celda(chip("Piernas", "deshab"), "Deshabilitado"),
            celda(chip("Piernas", "foco", True), "Elegido con foco"),
            celda(chip("Piernas", "pres", True), "Elegido · presionado"),
        ],
        3, "chip"))

    out.append(pieza(
        "Interruptor",
        "<p>Riel de 52 × 32 dp dentro de una fila de 48. Apagado: riel de superficie, borde 2 dp y perilla de 20 dp gris. "
        "Encendido: riel menta con borde 1,5 dp <code>#2F7F68</code> y perilla de 24 dp en tinta.</p>"
        "<p>La perilla cambia de lugar y de tamaño: el estado no depende del color.</p>",
        lambda: [
            celda(interruptor("Descanso automático"), "Apagado", "todo"),
            celda(interruptor("Descanso automático", True), "Encendido", "todo"),
            celda(interruptor("Descanso automático", False, "pres"), "Presionado", "todo"),
            celda(interruptor("Descanso automático", True, "foco"), "Foco", "todo"),
            celda(interruptor("Descanso automático", False, "deshab"), "Deshabilitado", "todo"),
        ],
        1, "interruptor"))

    out.append(pieza(
        "Empezar entrenamiento",
        "<p>64 dp de alto, ancho completo con márgenes de 16, radio 20, menta con texto tinta en Manrope 800 de 18 sp. "
        "Sin ícono de play ni flecha.</p><p class='vib'>Vibra al presionar: <code>impactAsync(Light)</code></p>",
        lambda: [celda(empezar(e), r, "todo") for e, r in E5],
        1, "empezar"))
    return "".join(out)


# ---------------------------------------------------------------- tabla de movimiento
MOV = [
    ("Presionar", "t-presionar", "90 ms", "suave", "Escala 1 → 0,97 y el relleno pasa al color presionado.",
     "<code>impactAsync(Light)</code> solo en primario y «Empezar entrenamiento»; el resto, nada.",
     "Sin escala. El color cambia en 0 ms.", "presionar"),
    ("Soltar", "t-soltar", "180 ms", "suave", "Vuelve a escala 1.", "Ninguna.", "Sin escala. Color en 0 ms.", "presionar"),
    ("Marcar serie", "t-disco", "200 ms", "suave",
     "El disco menta crece desde el centro (0,6 → 1 y opacidad 0 → 1). El visto se dibuja en <b>160 ms</b> con <b>60 ms</b> de retraso, "
     "<code>cubic-bezier(0.4, 0, 0.2, 1)</code>. El fondo de la fila cambia en <b>240 ms</b> con la curva estándar.",
     "<code>notificationAsync(Success)</code>; Android: <code>performAndroidHapticsAsync(Confirm)</code>.",
     "Disco, visto y fila aparecen con un fundido de 80 ms. Sin escala ni dibujo.", "serie"),
    ("Desmarcar", "t-desmarcar", "120 ms", "estandar", "Lo mismo a la inversa y sin retraso: el visto se borra, el disco se achica a 0,6 y la fila vuelve a la superficie.",
     "<code>selectionAsync()</code>; Android: <code>Toggle_Off</code>.", "Fundido de 80 ms.", "serie"),
    ("Más y menos", "t-paso", "120 ms", "suave",
     "La cifra vieja sale 6 dp y se desvanece; la nueva entra: hacia arriba al sumar, hacia abajo al restar.",
     "<code>selectionAsync()</code> por paso; Android: <code>Clock_Tick</code>.",
     "La cifra se reemplaza sin deslizar.", "paso"),
    ("Mantener presionado", "t-repetir-inicio", "400 ms, luego cada 90 ms", None,
     "Primer repetido a los 400 ms; después un paso cada 90 ms, cada uno con su animación de cifra.",
     "<code>selectionAsync()</code> en cada paso.", "Igual (no es movimiento); la cifra no se desliza.", None),
    ("Llegar al límite", None, "—", None, "Sin movimiento.",
     "<code>notificationAsync(Warning)</code>; Android: <code>Reject</code>.", "Igual.", None),
    ("Cargar", "t-vuelta", "aparece tras 150 ms · 1 vuelta cada 900 ms", "lineal",
     "El botón conserva su ancho; la etiqueta se cambia por un aro de 20 dp (trazo 2,5) que gira. No responde a toques.",
     "Ninguna al empezar; al terminar bien, <code>notificationAsync(Success)</code>.",
     "En vez del aro, el texto fijo «Guardando…».", "carga"),
    ("Cambio de estado (chip, interruptor, habilitar)", "t-estado", "160 ms", "estandar",
     "Colores y borde en 160 ms; la perilla recorre el riel en 160 ms y crece de 20 a 24 dp.",
     "<code>selectionAsync()</code>; Android: <code>Toggle_On</code> / <code>Toggle_Off</code>.",
     "La perilla salta; colores con fundido de 80 ms.", "estado"),
]
CURVAS = {
    "suave": "cubic-bezier(0.2, 0, 0, 1)",
    "estandar": "cubic-bezier(0.4, 0, 0.2, 1)",
    "lineal": "linear",
}


def demo(tipo):
    if tipo == "presionar":
        return btn("Guardar", "primario", "", attrs='data-bucle="presionar" tabindex="-1" aria-hidden="true"')
    if tipo == "serie":
        return f'<div data-bucle="serie" aria-hidden="true">{boton_visto("", "Demostración")}</div>'
    if tipo == "paso":
        return f'<div class="demo-cifra" data-bucle="paso" aria-hidden="true"><span class="cifra-in"><span class="num-pila"><span class="num">80</span></span><span class="unidad">kg</span></span></div>'
    if tipo == "carga":
        return btn("Guardar", "primario", "carga", attrs='tabindex="-1" aria-hidden="true"')
    if tipo == "estado":
        return f'<div class="demo-estado" data-bucle="estado" aria-hidden="true">{interruptor("", False, attrs="tabindex=-1")}</div>'
    return ""


def tabla_mov():
    filas = []
    for ev, var, dur, curva, que, vib, red, dem in MOV:
        dur_html = f'<span class="mono" data-token="{var}">{dur}</span>' if var else f'<span class="mono">{dur}</span>'
        cur = f'<code>{CURVAS[curva]}</code>' if curva else "—"
        filas.append(
            f"<tr><th scope='row'>{ev}</th><td>{dur_html}</td><td>{cur}</td><td>{que}</td><td>{vib}</td><td>{red}</td>"
            f"<td class='td-demo'>{demo(dem) if dem else ''}</td></tr>"
        )
    return (
        "<table class='mov'><thead><tr><th>Evento</th><th>Duración</th><th>Curva</th><th>Qué se mueve</th>"
        "<th>Vibración (expo-haptics)</th><th>Con «reducir movimiento»</th><th>Míralo</th></tr></thead><tbody>"
        + "".join(filas) + "</tbody></table>"
    )


# ---------------------------------------------------------------- zona de prueba y teléfono
def zona_prueba():
    return f"""
<div class="marco marco-prueba" data-tematico>
  <div class="marco-tit"><span>Zona de prueba · tema elegido</span><span class="mono">412 dp</span></div>
  <div class="prueba">
    <p class="grupo-tit">Botones</p>
    <div class="pila">
      {btn("Guardar rutina", "primario", attrs='id="b-guardar"')}
      {btn("Agregar ejercicio", "secundario", ico="mas", attrs='id="b-agregar"')}
      <div class="fila-btns">{btn("Ver historial", "borde", ico="historial")}{btn("Omitir", "fantasma")}</div>
      {btn("Borrar rutina", "peligro", attrs='id="b-borrar" aria-expanded="false" aria-controls="confirmar"')}
      {confirmacion('id="confirmar" hidden', 'id="b-cancelar"', 'id="b-si-borrar"')}
      {btn("Siguiente ejercicio", "primario", alto=56, extra="ancho-completo")}
    </div>

    <p class="grupo-tit">Botones de ícono</p>
    <div class="fila-btns">{btn_icono("cronometro", "Descanso")}{btn_icono("cerrar", "Cerrar")}{btn_icono("mas", "Agregar serie", 56)}{btn_icono("historial", "Historial", 56)}</div>

    <p class="grupo-tit">Serie en curso · Sentadilla</p>
    <div class="paso-fila"><span class="paso-etq">Kilos</span>{paso("80", "kg", "Kilos", attrs='data-paso="2.5" data-min="0" data-max="300" data-valor="80" data-destino="f-kg"')}</div>
    <div class="paso-fila"><span class="paso-etq">Reps</span>{paso("10", "reps", "Repeticiones", ancho=112, attrs='data-paso="1" data-min="1" data-max="50" data-valor="10" data-destino="f-reps"')}</div>
    <p class="ayuda">Mantén presionado + para sumar seguido. Toca la cifra para escribirla.</p>
    <div class="pila filas">
      {fila_serie(1, "80", "10", "hecha")}
      {fila_serie(2, "80", "10", attrs='data-activa')}
    </div>

    <p class="grupo-tit">Chips · una fila, desliza de lado</p>
    <div class="chips chips-carril" role="group" aria-label="Grupo muscular">{chip("Pecho")}{chip("Espalda")}{chip("Piernas", elegido=True)}{chip("Hombros")}{chip("Brazos")}{chip("Glúteos")}{chip("Abdomen")}</div>

    <p class="grupo-tit">Interruptores</p>
    {interruptor("Descanso automático", True)}
    {interruptor("Sonido al terminar el descanso", False)}

    <div class="sep"></div>
    {empezar(attrs='id="b-empezar"')}
  </div>
</div>"""


def telefono():
    ejercicios = [("Sentadilla", "4 × 8"), ("Peso muerto rumano", "3 × 10"), ("Prensa", "3 × 12"),
                  ("Zancada", "3 × 10"), ("Gemelos de pie", "4 × 15")]
    lista = "".join(
        f'<li><span class="ej-n mono">{i+1}</span><span class="ej-nom">{n}</span><span class="ej-s mono">{s}</span></li>'
        for i, (n, s) in enumerate(ejercicios)
    )
    return f"""
<div class="telefono-caja">
  <div class="marco-tit"><span>Contexto · pantalla «Hoy»</span><span class="mono">412 × 892 dp</span></div>
  <div class="telefono" data-tematico>
    <div class="pantalla">
      <div class="barra-estado"><span class="mono">9:41</span><span class="estado-ico" aria-hidden="true"><i></i><i></i><i></i><b></b></span></div>
      <header class="app-barra">{logo_inline(28)}{btn_icono("persona", "Tu perfil")}</header>
      <div class="hoy">
        <h2>Hoy</h2>
        <p class="sec">Martes 17 de noviembre</p>
      </div>
      <div class="chips hoy-chips" role="radiogroup" aria-label="Cómo entrenas hoy">{chip("Solo", elegido=True, attrs='data-radio="como"')}{chip("Con mi profe", attrs='data-radio="como"')}</div>
      <section class="rutina">
        <p class="sobre">Rutina del día · de tu profe Paula</p>
        <h3>Piernas A</h3>
        <p class="sec"><span class="mono">5</span> ejercicios · <span class="mono">50</span> min aprox.</p>
        <ol class="ejercicios">{lista}</ol>
      </section>
      <div class="ultima">{simbolo_inline(32)}<div><p class="ult-t">Última vez: Empuje B</p><p class="sec">Jueves · <span class="mono">18</span> series hechas</p></div></div>
      <div class="pie">{empezar(attrs='id="b-empezar-tel"')}</div>
      <div class="gestos" aria-hidden="true"><span></span></div>
    </div>
  </div>
</div>"""


PALETA = [
    ("Fondo", "#F5F7F5", "#0E1412", ""),
    ("Superficie", "#FFFFFF", "#18211D", ""),
    ("Texto", "#131A17", "#ECF2EF", "16,4 · 16,4"),
    ("Texto secundario", "#56635D", "#9DADA6", "5,8 · 7,0"),
    ("Acción (relleno)", "#45B392", "#45B392", "etiqueta 6,8 · 7,2"),
    ("Acción presionada", "#37997C", "#6FD0B2", "etiqueta 5,1 · 10,1"),
    ("Acento texto", "#1F6B56", "#6FD0B2", "6,4 · 10,1"),
    ("Acento borde", "#2F7F68", "#6FD0B2", "4,5 · 10,1"),
    ("Tonal y fila hecha", "#DDF3EC", "#1D3A31", ""),
    ("Tonal presionado", "#A0D9C8", "#295E4E", "texto 11,2 · 6,6"),
    ("Borde de control", "#7C8983", "#74857E", "3,6 · 4,2"),
    ("Peligro", "#B3261E", "#FF8A80", "6,5 · 7,7"),
    ("Peligro presionado", "#8C1D18", "#FFB4AB", "solo confirmación · 9,1 · 10,4"),
    ("Deshabilitado", "#E3E8E5", "#222D28", "texto #6F7C76 · #74857E"),
]


def paleta_panel():
    filas = "".join(
        f'<li><span class="pp-n">{n}</span>'
        f'<span class="pp-c"><i style="background:{c}"></i><code>{c}</code></span>'
        f'<span class="pp-c"><i style="background:{g}"></i><code>{g}</code></span>'
        f'<span class="pp-r">{r}</span></li>'
        for n, c, g, r in PALETA
    )
    return (
        '<aside class="paleta"><div class="marco-tit"><span>Paleta</span><span>clara · gimnasio</span></div>'
        f'<ul>{filas}</ul>'
        '<p class="pp-nota"><strong>Nunca como texto:</strong> la menta <code>#45B392</code> sobre claro (2,6:1). '
        'Por eso el primario claro lleva borde interior de 1,5 dp <code>#2F7F68</code> y el acento de texto es <code>#1F6B56</code>.</p>'
        '<p class="pp-nota">Razón de contraste calculada (WCAG) contra la superficie o la acción; detalle en <code>notas.md</code>.</p>'
        "</aside>"
    )


# ---------------------------------------------------------------- página
CSS = r"""
:root{
  /* Movimiento: valores del encargo. La tabla de abajo los lee de aquí. */
  --t-presionar:90ms; --t-soltar:180ms; --t-disco:200ms; --t-visto:160ms; --t-visto-retraso:60ms;
  --t-fila:240ms; --t-desmarcar:120ms; --t-paso:120ms; --t-estado:160ms; --t-vuelta:900ms;
  --t-espera-carga:150ms; --t-repetir-inicio:400ms; --t-repetir-cada:90ms; --t-fundido:80ms;
  --curva-suave:cubic-bezier(0.2, 0, 0, 1); --curva-estandar:cubic-bezier(0.4, 0, 0.2, 1);
  --escala-presion:0.97; --desplaz-paso:6px;
  /* Valores efectivos (los cambia «reducir movimiento») */
  --d-presionar:var(--t-presionar); --d-soltar:var(--t-soltar); --d-disco:var(--t-disco);
  --d-desmarcar:var(--t-desmarcar); --d-fila:var(--t-fila); --d-estado:var(--t-estado); --d-perilla:var(--t-estado);
  --escala:var(--escala-presion); --disco-ini:0.6;
  --v-off:1; --v-dash-in:var(--t-visto); --v-dash-ret:var(--t-visto-retraso); --v-dash-out:var(--t-desmarcar);
  --v-op-in:0ms; --v-op-ret-in:var(--t-visto-retraso); --v-op-out:0ms; --v-op-ret-out:var(--t-desmarcar);
}
:root.reducir{
  --d-presionar:0ms; --d-soltar:0ms; --d-disco:var(--t-fundido); --d-desmarcar:var(--t-fundido);
  --d-fila:var(--t-fundido); --d-estado:var(--t-fundido); --d-perilla:0ms; --escala:1; --disco-ini:1;
  --v-off:0; --v-dash-in:0ms; --v-dash-ret:0ms; --v-dash-out:0ms;
  --v-op-in:var(--t-fundido); --v-op-ret-in:0ms; --v-op-out:var(--t-fundido); --v-op-ret-out:0ms;
}
@media (prefers-reduced-motion: reduce){
  :root:not(.mover){
    --d-presionar:0ms; --d-soltar:0ms; --d-disco:var(--t-fundido); --d-desmarcar:var(--t-fundido);
    --d-fila:var(--t-fundido); --d-estado:var(--t-fundido); --d-perilla:0ms; --escala:1; --disco-ini:1;
    --v-off:0; --v-dash-in:0ms; --v-dash-ret:0ms; --v-dash-out:0ms;
    --v-op-in:var(--t-fundido); --v-op-ret-in:0ms; --v-op-out:var(--t-fundido); --v-op-ret-out:0ms;
  }
  :root:not(.mover) .aro{display:none}
  :root:not(.mover) .btn-carga-txt{display:inline}
}

/* Temas: solo colores de la paleta del encargo */
[data-tema="clara"]{
  --fondo:#F5F7F5; --superficie:#FFFFFF; --superficie-alta:#FFFFFF; --texto:#131A17; --texto-2:#56635D;
  --accion:#45B392; --accion-pres:#37997C; --sobre-accion:#131A17; --accion-borde:#2F7F68;
  --acento-texto:#1F6B56; --acento-borde:#2F7F68; --tonal:#DDF3EC; --tonal-texto:#1F6B56; --tonal-borde:#2F7F68; --tonal-pres:#A0D9C8;
  --fila-hecha:#DDF3EC; --pres-superficie:#DDF3EC; --borde-control:#7C8983;
  --peligro:#B3261E; --peligro-pres:#8C1D18; --sobre-peligro:#FFFFFF;
  --deshab:#E3E8E5; --deshab-texto:#6F7C76; --foco:#131A17; --linea:#E3E8E5; --bisel:#131A17;
}
[data-tema="gimnasio"]{
  --fondo:#0E1412; --superficie:#18211D; --superficie-alta:#222D28; --texto:#ECF2EF; --texto-2:#9DADA6;
  --accion:#45B392; --accion-pres:#6FD0B2; --sobre-accion:#0E1412; --accion-borde:transparent;
  --acento-texto:#6FD0B2; --acento-borde:#6FD0B2; --tonal:#1D3A31; --tonal-texto:#6FD0B2; --tonal-borde:transparent; --tonal-pres:#295E4E;
  --fila-hecha:#1D3A31; --pres-superficie:#1D3A31; --borde-control:#74857E;
  --peligro:#FF8A80; --peligro-pres:#FFB4AB; --sobre-peligro:#131A17;
  --deshab:#222D28; --deshab-texto:#74857E; --foco:#ECF2EF; --linea:#222D28; --bisel:#222D28;
}

*{box-sizing:border-box}
html,body{margin:0}
body{font:500 16px/1.45 Manrope, system-ui, sans-serif; background:var(--fondo); color:var(--texto);
  -webkit-font-smoothing:antialiased; transition:background-color var(--d-estado) var(--curva-estandar)}
.mono{font-family:"IBM Plex Mono", ui-monospace, monospace; font-weight:600; font-variant-numeric:tabular-nums}
code{font:600 0.86em/1 "IBM Plex Mono", ui-monospace, monospace; color:var(--texto)}
h1,h2,h3,p{margin:0}
.pagina{max-width:1300px; margin:0 auto; padding:32px 0 64px}

/* Cabecera de la lámina */
.cabecera{display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:24px;
  padding-bottom:24px; border-bottom:2px solid var(--linea)}
.cab-izq{display:flex; flex-direction:column; gap:12px; max-width:640px}
.cab-izq h1{font:800 32px/1.15 Manrope; letter-spacing:-0.01em}
.cab-izq p{color:var(--texto-2)}
.controles{display:flex; flex-direction:column; gap:4px; align-items:stretch; min-width:360px}
.control-fila{display:flex; align-items:center; justify-content:space-between; gap:16px}
.control-etq{color:var(--texto-2); font-size:14px}
.vibracion{font-size:13px; color:var(--texto-2); min-height:40px; padding:10px 14px; border-radius:12px;
  background:var(--superficie); border:1.5px solid var(--linea); margin-top:8px}
.vibracion code{color:var(--acento-texto)}

section{margin-top:48px}
.sec-tit{display:flex; align-items:baseline; gap:16px; margin-bottom:20px}
.sec-tit h2{font:800 24px/1.2 Manrope}
.sec-tit p{color:var(--texto-2)}

.prueba-grid{display:flex; flex-wrap:wrap; gap:32px; align-items:flex-start}

/* Marco de 412 dp */
.marco{width:412px; flex:none; background:var(--fondo); color:var(--texto); border-radius:20px;
  border:1.5px solid var(--linea); overflow:hidden}
.marco-tit{display:flex; justify-content:space-between; align-items:center; padding:12px 16px;
  font:700 13px/1 Manrope; color:var(--texto-2); border-bottom:1.5px solid var(--linea); background:var(--superficie)}
.marco-tit .mono{font-size:12px; font-weight:600}

/* Botón base */
.btn{appearance:none; -webkit-appearance:none; margin:0; font:700 16px/1 Manrope, sans-serif; height:48px; padding:0 20px;
  border-radius:16px; border:1.5px solid transparent; display:inline-flex; align-items:center; justify-content:center;
  white-space:nowrap; cursor:pointer; position:relative; transform:scale(1); -webkit-tap-highlight-color:transparent;
  transition:transform var(--d-soltar) var(--curva-suave), background-color var(--d-soltar) var(--curva-suave),
    color var(--d-soltar) var(--curva-suave), border-color var(--d-soltar) var(--curva-suave)}
.btn-etq{display:inline-flex; align-items:center; gap:8px}
.btn .ico{width:20px; height:20px}
.btn-56{height:56px}
.btn:active:not(:disabled), .btn.es-pres{transform:scale(var(--escala)); transition-duration:var(--d-presionar)}
.btn:focus-visible, .btn.es-foco{outline:2px solid var(--foco); outline-offset:2px}
.btn-primario{background:var(--accion); color:var(--sobre-accion); border-color:var(--accion-borde)}
.btn-primario:active:not(:disabled), .btn-primario.es-pres{background:var(--accion-pres)}
.btn-secundario{background:var(--tonal); color:var(--tonal-texto); border-color:var(--tonal-borde)}
.btn-secundario:active:not(:disabled), .btn-secundario.es-pres{background:var(--tonal-pres); color:var(--texto)}
.btn-borde{background:transparent; color:var(--texto); border-color:var(--borde-control)}
.btn-fantasma{background:transparent; color:var(--acento-texto)}
.btn-borde:active:not(:disabled), .btn-borde.es-pres,
.btn-fantasma:active:not(:disabled), .btn-fantasma.es-pres{background:var(--pres-superficie)}
/* Peligro: contorno siempre; el relleno queda solo para la confirmación */
.btn-peligro{background:transparent; color:var(--peligro); border-color:var(--peligro)}
.btn-peligro:active:not(:disabled), .btn-peligro.es-pres{background:var(--peligro); color:var(--sobre-peligro)}
.btn-peligro-confirmar{background:var(--peligro); color:var(--sobre-peligro); border-color:var(--peligro)}
.btn-peligro-confirmar:active:not(:disabled), .btn-peligro-confirmar.es-pres{background:var(--peligro-pres); border-color:var(--peligro-pres)}
.btn:disabled{background:var(--deshab); color:var(--deshab-texto); border-color:transparent; cursor:not-allowed}
/* Tarjeta de confirmación: el único lugar donde el peligro va relleno */
.confirmar{width:100%; padding:16px; border-radius:20px; background:var(--superficie); border:1.5px solid var(--linea);
  display:flex; flex-direction:column; gap:12px}
.confirmar[hidden]{display:none}
.confirmar-t{font:700 16px/1.3 Manrope}
.confirmar-sec{font-size:14px; color:var(--texto-2); margin-top:-8px}
.confirmar .fila-btns{justify-content:flex-end; gap:8px}
.btn-empezar{height:64px; width:100%; border-radius:20px; font:800 18px/1 Manrope, sans-serif}
.ancho-completo{width:100%}

/* Cargando: conserva el ancho; aro de 20 dp o texto fijo */
.btn-carga{position:absolute; inset:0; display:none; align-items:center; justify-content:center}
.cargando{pointer-events:none}
.cargando .btn-etq{visibility:hidden}
.cargando .btn-carga{display:flex}
.btn-carga-txt{display:none}
.aro{animation:girar var(--t-vuelta) linear infinite}
@keyframes girar{to{transform:rotate(360deg)}}
:root.reducir .aro{display:none}
:root.reducir .btn-carga-txt{display:inline}

/* Botón de ícono */
.btn-icono{appearance:none; margin:0; padding:0; width:48px; height:48px; border-radius:50%; flex:none;
  background:var(--superficie); border:1.5px solid var(--borde-control); color:var(--texto);
  display:inline-grid; place-items:center; cursor:pointer; transform:scale(1);
  transition:transform var(--d-soltar) var(--curva-suave), background-color var(--d-soltar) var(--curva-suave)}
.btn-icono.g56{width:56px; height:56px}
.btn-icono .ico{width:24px; height:24px}
.btn-icono:active:not(:disabled), .btn-icono.es-pres{transform:scale(var(--escala)); background:var(--pres-superficie);
  transition-duration:var(--d-presionar)}
.btn-icono:focus-visible, .btn-icono.es-foco{outline:2px solid var(--foco); outline-offset:2px}
.btn-icono:disabled{background:var(--deshab); color:var(--deshab-texto); border-color:transparent; cursor:not-allowed}

/* Más y menos */
.paso{display:flex; align-items:center; gap:8px; height:56px}
.cifra{appearance:none; margin:0; padding:0; height:56px; background:transparent; border:0; color:var(--texto);
  display:flex; align-items:center; justify-content:center; cursor:text; position:relative; border-radius:12px}
.cifra:focus-visible{outline:2px solid var(--foco); outline-offset:2px}
.cifra-in{display:inline-flex; align-items:baseline; gap:4px}
.num-pila{display:inline-grid; justify-items:end}
.num-pila > .num{grid-area:1/1; font:600 28px/1 "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric:tabular-nums}
.unidad{font:500 13px/1 Manrope, sans-serif; color:var(--texto-2)}
.cifra.editando::after{content:""; position:absolute; left:12px; right:12px; bottom:6px; height:2px; background:var(--acento-borde)}
.cifra input{width:72px; font:600 28px/1 "IBM Plex Mono", ui-monospace, monospace; color:var(--texto); background:transparent;
  border:0; padding:0; text-align:right; outline:none; caret-color:var(--acento-borde)}
.paso.deshab .cifra{color:var(--deshab-texto); cursor:not-allowed}
.paso.deshab .unidad{color:var(--deshab-texto)}
.paso-fila{display:flex; align-items:center; justify-content:space-between; height:64px}
.paso-etq{font:700 16px/1 Manrope; color:var(--texto)}

/* Fila de serie y botón de visto */
.fila{display:flex; align-items:center; gap:12px; min-height:72px; padding:8px 8px 8px 16px; border-radius:16px;
  background:var(--superficie); transition:background-color var(--d-desmarcar) var(--curva-estandar)}
.fila.hecha{background:var(--fila-hecha); transition-duration:var(--d-fila)}
.fila-n{display:flex; flex-direction:column; gap:2px; min-width:44px}
.fila-n-etq{font:500 13px/1 Manrope; color:var(--texto-2)}
.fila-n .mono{font-size:20px; line-height:1}
.fila-datos{display:flex; align-items:baseline; gap:4px; font-size:20px; flex:1}
.fila-datos .u{font:500 13px/1 Manrope; color:var(--texto-2)}
.fila-datos .x{font:500 16px/1 Manrope; color:var(--texto-2); margin:0 4px}
.fila.deshab .fila-datos, .fila.deshab .fila-n .mono{color:var(--deshab-texto)}
.visto-btn{appearance:none; margin:0 0 0 auto; padding:0; width:56px; height:56px; border:0; border-radius:50%;
  background:transparent; cursor:pointer; flex:none; transform:scale(1);
  transition:transform var(--d-soltar) var(--curva-suave)}
.visto-btn svg{display:block; overflow:visible}
.vb-aro{fill:var(--superficie); stroke:var(--borde-control); stroke-width:2;
  transition:fill var(--d-soltar) var(--curva-suave)}
.vb-disco{fill:var(--accion); transform-box:fill-box; transform-origin:center; transform:scale(var(--disco-ini)); opacity:0;
  transition:transform var(--d-desmarcar) var(--curva-estandar), opacity var(--d-desmarcar) var(--curva-estandar)}
.vb-visto{fill:none; stroke:var(--sobre-accion); stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:1 2;
  stroke-dashoffset:var(--v-off); opacity:0;
  transition:stroke-dashoffset var(--v-dash-out) var(--curva-estandar), opacity var(--v-op-out) linear var(--v-op-ret-out)}
.hecha .vb-disco, [aria-pressed="true"] .vb-disco{transform:scale(1); opacity:1;
  transition:transform var(--d-disco) var(--curva-suave), opacity var(--d-disco) var(--curva-suave)}
.hecha .vb-visto, [aria-pressed="true"] .vb-visto{stroke-dashoffset:0; opacity:1;
  transition:stroke-dashoffset var(--v-dash-in) var(--curva-estandar) var(--v-dash-ret), opacity var(--v-op-in) linear var(--v-op-ret-in)}
.visto-btn:active:not(:disabled), .visto-btn.es-pres{transform:scale(var(--escala)); transition-duration:var(--d-presionar)}
.visto-btn:active:not(:disabled) .vb-aro, .visto-btn.es-pres .vb-aro{fill:var(--pres-superficie); transition-duration:var(--d-presionar)}
.visto-btn:focus-visible, .visto-btn.es-foco{outline:2px solid var(--foco); outline-offset:2px}
.visto-btn:disabled{cursor:not-allowed}
/* Bloqueada: aro punteado (otra forma que el aro continuo de pendiente), así se ve también en gimnasio */
.visto-btn:disabled .vb-aro{fill:var(--deshab); stroke:var(--deshab-texto); stroke-width:2; stroke-dasharray:4 5}

/* Chip */
.chip{appearance:none; margin:0; padding:4px 0; height:48px; background:none; border:0; cursor:pointer;
  display:inline-flex; align-items:center; font:inherit; color:var(--texto)}
.chip-cara{height:40px; padding:0 16px; border-radius:999px; display:inline-flex; align-items:center; gap:6px;
  background:var(--superficie); border:1.5px solid var(--borde-control); color:var(--texto); font:500 16px/1 Manrope, sans-serif;
  white-space:nowrap; transform:scale(1);
  transition:transform var(--d-soltar) var(--curva-suave), background-color var(--d-estado) var(--curva-estandar),
    border-color var(--d-estado) var(--curva-estandar), color var(--d-estado) var(--curva-estandar)}
.chip-visto{width:16px; height:16px; display:none; fill:none; stroke:currentColor; stroke-width:2.25;
  stroke-linecap:round; stroke-linejoin:round}
.chip[aria-pressed="true"] .chip-cara{background:var(--tonal); border-color:var(--acento-borde); font-weight:700; padding-left:12px}
.chip[aria-pressed="true"] .chip-visto{display:block}
.chip:active:not(:disabled) .chip-cara, .chip.es-pres .chip-cara{transform:scale(var(--escala)); background:var(--pres-superficie);
  transition-duration:var(--d-presionar)}
.chip[aria-pressed="true"]:active:not(:disabled) .chip-cara, .chip[aria-pressed="true"].es-pres .chip-cara{background:var(--tonal-pres); color:var(--texto)}
.chip:focus-visible .chip-cara, .chip.es-foco .chip-cara{outline:2px solid var(--foco); outline-offset:2px}
.chip:focus-visible{outline:none}
.chip:disabled{cursor:not-allowed}
.chip:disabled .chip-cara{background:var(--deshab); color:var(--deshab-texto); border-color:transparent}
.chips{display:flex; flex-wrap:wrap; column-gap:8px}
/* Fila única que se desliza de lado (en React Native: ScrollView horizontal sin indicador).
   Llega hasta el borde del marco para que el último chip se vea cortado: eso avisa que hay más. */
.chips-carril{flex-wrap:nowrap; overflow-x:auto; overscroll-behavior-x:contain; margin:0 -16px; padding:0 16px;
  scrollbar-width:none; scroll-padding:0 16px}
.chips-carril::-webkit-scrollbar{display:none}
.chips-carril .chip{flex:none}

/* Interruptor */
.interruptor{appearance:none; margin:0; padding:0; width:100%; height:48px; background:none; border:0; cursor:pointer;
  display:flex; align-items:center; justify-content:space-between; gap:12px; font:500 16px/1.2 Manrope, sans-serif;
  color:var(--texto); text-align:left}
.riel{position:relative; width:52px; height:32px; flex:none; border-radius:16px; background:var(--superficie);
  transform:scale(1); transition:background-color var(--d-estado) var(--curva-estandar), transform var(--d-soltar) var(--curva-suave)}
.riel::before{content:""; position:absolute; inset:0; border-radius:16px; border:2px solid var(--borde-control);
  transition:border-color var(--d-estado) var(--curva-estandar)}
.perilla{position:absolute; left:0; top:4px; width:24px; height:24px; border-radius:50%; background:var(--borde-control);
  transform:translateX(4px) scale(0.8333);
  transition:transform var(--d-perilla) var(--curva-estandar), background-color var(--d-estado) var(--curva-estandar)}
.interruptor[aria-checked="true"] .riel{background:var(--accion)}
.interruptor[aria-checked="true"] .riel::before{border-width:1.5px; border-color:var(--accion-borde)}
.interruptor[aria-checked="true"] .perilla{transform:translateX(24px) scale(1); background:var(--sobre-accion)}
.interruptor:active:not(:disabled) .riel, .interruptor.es-pres .riel{transform:scale(var(--escala)); background:var(--pres-superficie);
  transition-duration:var(--d-presionar)}
.interruptor[aria-checked="true"]:active:not(:disabled) .riel{background:var(--accion-pres)}
.interruptor:focus-visible{outline:none}
.interruptor:focus-visible .riel, .interruptor.es-foco .riel{outline:2px solid var(--foco); outline-offset:2px}
.interruptor:disabled{cursor:not-allowed; color:var(--deshab-texto)}
.interruptor:disabled .riel{background:var(--deshab)}
.interruptor:disabled .riel::before{border-color:transparent}
.interruptor:disabled .perilla{background:var(--deshab-texto)}
.controles .interruptor{width:auto}

/* Lámina de estados */
.pieza{display:grid; grid-template-columns:minmax(0,1fr) 412px 412px; gap:32px; align-items:start;
  padding:32px 0; border-top:1.5px solid var(--linea)}
.pieza-info{display:flex; flex-direction:column; gap:10px; padding-top:4px}
.pieza-info h3{font:800 20px/1.2 Manrope}
.pieza-info p{font-size:14px; color:var(--texto-2)}
.pieza-info .vib{color:var(--texto)}
.estados{display:grid; gap:16px 12px; padding:20px 16px}
.estados.c1{grid-template-columns:1fr}
.estados.c2{grid-template-columns:1fr 1fr}
.estados.c3{grid-template-columns:1fr 1fr 1fr}
.estado{margin:0; display:flex; flex-direction:column; gap:8px; align-items:flex-start; min-width:0}
.estado.ancho{grid-column:1/-1}
.c3 .estado-pieza{min-height:56px}
.estado-pieza{min-height:48px; display:flex; align-items:center; width:100%}
.estado.ancho .estado-pieza > .fila, .estado.ancho .estado-pieza > .btn-empezar{width:100%}
.estado.ancho .estado-pieza > .fila{flex:1}
.estado figcaption{font:500 12px/1 Manrope; color:var(--texto-2)}

/* Zona de prueba */
.prueba{padding:8px 16px 24px}
.grupo-tit{font:700 13px/1 Manrope; color:var(--texto-2); margin:24px 0 12px}
.pila{display:flex; flex-direction:column; gap:12px; align-items:flex-start}
.pila.filas{align-items:stretch; gap:8px}
.fila-btns{display:flex; gap:12px; align-items:center; flex-wrap:wrap}
.ayuda{font-size:13px; color:var(--texto-2); margin:4px 0 12px}
.sep{height:24px}

/* Teléfono */
.telefono-caja{display:flex; flex-direction:column; gap:12px}
.telefono-caja > .marco-tit{border:1.5px solid var(--linea); border-radius:12px}
.telefono{width:436px; padding:12px; border-radius:48px; background:var(--bisel)}
.pantalla{width:412px; height:892px; border-radius:36px; overflow:hidden; background:var(--fondo); color:var(--texto);
  display:flex; flex-direction:column; position:relative}
.barra-estado{height:32px; padding:0 24px; display:flex; align-items:center; justify-content:space-between; font-size:14px}
.estado-ico{display:flex; gap:3px; align-items:flex-end}
.estado-ico i{display:block; width:4px; background:var(--texto); border-radius:1px}
.estado-ico i:nth-child(1){height:6px}.estado-ico i:nth-child(2){height:9px}.estado-ico i:nth-child(3){height:12px}
.estado-ico b{display:block; width:22px; height:11px; border:2px solid var(--texto); border-radius:3px; margin-left:6px}
.app-barra{height:64px; padding:0 16px; display:flex; align-items:center; justify-content:space-between}
.hoy{padding:8px 16px 0}
.hoy h2{font:800 32px/1.15 Manrope; letter-spacing:-0.01em}
.sec{color:var(--texto-2); font-size:14px}
.hoy-chips{padding:8px 16px 4px}
.rutina{margin:8px 16px 0; padding:20px; border-radius:20px; background:var(--superficie)}
.rutina .sobre{font:700 13px/1.3 Manrope; color:var(--acento-texto)}
.rutina h3{font:800 22px/1.2 Manrope; margin:6px 0 2px}
.ejercicios{list-style:none; margin:16px 0 0; padding:0}
.ejercicios li{display:flex; align-items:center; gap:12px; height:48px; border-top:1.5px solid var(--linea)}
.ej-n{width:20px; color:var(--texto-2); font-size:14px}
.ej-nom{flex:1; font-weight:500}
.ej-s{font-size:16px}
.ultima{margin:12px 16px 0; padding:12px 16px; border-radius:16px; background:var(--fila-hecha); display:flex; gap:12px; align-items:center}
.ult-t{font-weight:700}
.pie{margin-top:auto; padding:16px}
.gestos{height:24px; display:flex; justify-content:center; align-items:center}
.gestos span{width:108px; height:4px; border-radius:2px; background:var(--texto); opacity:.5}

/* Tabla de movimiento */
.mov{width:100%; border-collapse:collapse; font-size:14px; background:var(--superficie); border-radius:16px; overflow:hidden}
.mov th, .mov td{text-align:left; vertical-align:top; padding:14px 12px; border-top:1.5px solid var(--linea)}
.mov thead th{font:700 13px/1.2 Manrope; color:var(--texto-2); border-top:0}
.mov tbody th{font:700 15px/1.3 Manrope; width:140px}
.mov td:nth-child(2){width:130px}
.mov td:nth-child(3){width:220px}
.mov td:nth-child(3) code{white-space:nowrap}
.mov td.td-demo{width:124px; vertical-align:middle}
.mov .btn{height:48px}
.demo-cifra{height:56px; display:flex; align-items:center}
.demo-estado .interruptor{width:auto}
.nota-pie{margin-top:16px; font-size:14px; color:var(--texto-2)}
.chip-tema .chip-cara{font-size:15px}
.paleta{flex:1; min-width:300px; background:var(--superficie); border:1.5px solid var(--linea); border-radius:20px; overflow:hidden}
.paleta ul{list-style:none; margin:0; padding:8px 16px}
.paleta li{display:grid; grid-template-columns:1fr auto auto; grid-template-rows:auto auto; column-gap:12px; row-gap:2px;
  padding:8px 0; border-top:1.5px solid var(--linea)}
.paleta li:first-child{border-top:0}
.pp-n{font:700 13px/1.3 Manrope; grid-column:1; grid-row:1}
.pp-r{font-size:12px; color:var(--texto-2); grid-column:1; grid-row:2}
.pp-c{display:flex; align-items:center; gap:6px; grid-row:1 / span 2}
.pp-c i{display:block; width:20px; height:20px; border-radius:6px; border:1px solid #7C8983}
.pp-c code{font-size:12px}
.pp-nota{font-size:13px; color:var(--texto-2); padding:0 16px 14px}
"""

JS = r"""
(() => {
  const raiz = document.documentElement;
  const css = getComputedStyle(raiz);
  const ms = (v) => parseFloat(css.getPropertyValue(v)) || 0;
  const T = { paso: ms('--t-paso'), desplaz: parseFloat(css.getPropertyValue('--desplaz-paso')) || 6,
    espera: ms('--t-espera-carga'), repIni: ms('--t-repetir-inicio'), repCada: ms('--t-repetir-cada') };
  const SUAVE = css.getPropertyValue('--curva-suave').trim();

  // ---- reducir movimiento: sigue al sistema hasta que tocas el interruptor
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let preferencia = location.hash.includes('reducir') ? true : null;
  const swReducir = document.getElementById('sw-reducir');
  const reducido = () => (preferencia ?? mq.matches);
  function aplicarMovimiento() {
    const r = reducido();
    raiz.classList.toggle('reducir', r);
    raiz.classList.toggle('mover', !r);
    swReducir.setAttribute('aria-checked', String(r));
  }
  mq.addEventListener('change', aplicarMovimiento);
  swReducir.addEventListener('click', () => { preferencia = !reducido(); aplicarMovimiento(); });
  aplicarMovimiento();

  // ---- tema
  const temas = document.querySelectorAll('[data-tematico]');
  const chipsTema = document.querySelectorAll('[data-tema-btn]');
  function aplicarTema(t) {
    document.body.dataset.tema = t;
    temas.forEach((el) => (el.dataset.tema = t));
    chipsTema.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.temaBtn === t)));
  }
  chipsTema.forEach((c) => c.addEventListener('click', () => aplicarTema(c.dataset.temaBtn)));
  aplicarTema(location.hash.includes('gimnasio') ? 'gimnasio' : 'clara');

  // ---- registro de vibración (lo que haría expo-haptics)
  const log = document.getElementById('vibracion');
  function vibrar(api, android) {
    log.innerHTML = 'Última vibración: <code>Haptics.' + api + '</code>' +
      (android ? ' · Android: <code>performAndroidHapticsAsync(AndroidHaptics.' + android + ')</code>' : '');
  }

  // presionar primario y «Empezar entrenamiento»: impacto liviano
  document.querySelectorAll('[data-tematico] .btn-primario').forEach((b) =>
    b.addEventListener('pointerdown', () => vibrar('impactAsync(ImpactFeedbackStyle.Light)', 'Virtual_Key')));

  // ---- cargando: el aro aparece solo si la espera pasa de 150 ms
  function conCarga(boton, duracion, alTerminar) {
    if (!boton) return;
    boton.addEventListener('click', () => {
      if (boton.dataset.ocupado) return;
      boton.dataset.ocupado = '1';
      boton.style.width = boton.offsetWidth + 'px';
      const t = setTimeout(() => { boton.classList.add('cargando'); boton.setAttribute('aria-busy', 'true'); }, T.espera);
      setTimeout(() => {
        clearTimeout(t);
        boton.classList.remove('cargando');
        boton.removeAttribute('aria-busy');
        boton.style.width = '';
        delete boton.dataset.ocupado;
        vibrar('notificationAsync(NotificationFeedbackType.Success)', 'Confirm');
        if (alTerminar) alTerminar();
      }, duracion);
    });
  }
  ['b-guardar', 'b-empezar', 'b-empezar-tel'].forEach((id) => conCarga(document.getElementById(id), 1600));

  // ---- peligro: «Borrar rutina» (contorno) abre la confirmación; solo «Sí, borrar» va relleno
  const bBorrar = document.getElementById('b-borrar');
  const confirmar = document.getElementById('confirmar');
  const abrirConfirmar = (abrir) => {
    confirmar.hidden = !abrir;
    bBorrar.setAttribute('aria-expanded', String(abrir));
    (abrir ? document.getElementById('b-cancelar') : bBorrar).focus();
  };
  bBorrar.addEventListener('click', () => abrirConfirmar(confirmar.hidden));
  document.getElementById('b-cancelar').addEventListener('click', () => abrirConfirmar(false));
  conCarga(document.getElementById('b-si-borrar'), 1600, () => abrirConfirmar(false));

  // ---- marcar serie
  document.querySelectorAll('[data-tematico] .visto-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const fila = b.closest('.fila');
      const hecha = !fila.classList.contains('hecha');
      fila.classList.toggle('hecha', hecha);
      b.setAttribute('aria-pressed', String(hecha));
      if (hecha) vibrar('notificationAsync(NotificationFeedbackType.Success)', 'Confirm');
      else vibrar('selectionAsync()', 'Toggle_Off');
    });
  });

  // ---- cifra que cambia: la vieja sale 6 dp, la nueva entra
  function cambiarCifra(cont, texto, dir) {
    const pila = cont.querySelector('.num-pila');
    pila.querySelectorAll('.saliendo').forEach((n) => n.remove());
    const viejo = pila.querySelector('.num');
    if (reducido()) { viejo.textContent = texto; return; }
    const nuevo = viejo.cloneNode(false);
    nuevo.textContent = texto;
    viejo.classList.add('saliendo');
    pila.appendChild(nuevo);
    const d = T.desplaz * dir;
    viejo.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-d}px)`, opacity: 0 }],
      { duration: T.paso, easing: SUAVE, fill: 'forwards' }).onfinish = () => viejo.remove();
    nuevo.animate([{ transform: `translateY(${d}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: T.paso, easing: SUAVE });
  }
  const formato = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');

  document.querySelectorAll('[data-tematico] .paso[data-paso]').forEach((p) => {
    const paso = parseFloat(p.dataset.paso), min = parseFloat(p.dataset.min), max = parseFloat(p.dataset.max);
    const cifra = p.querySelector('.cifra');
    const destino = p.dataset.destino;
    const actualizarFila = () => {
      const fila = document.querySelector('[data-tematico] .fila[data-activa] .' + destino);
      if (fila) fila.textContent = formato(parseFloat(p.dataset.valor));
    };
    function dar(dir) {
      const v = parseFloat(p.dataset.valor);
      const n = Math.round((v + dir * paso) * 10) / 10;
      if (n < min || n > max) { vibrar('notificationAsync(NotificationFeedbackType.Warning)', 'Reject'); return false; }
      p.dataset.valor = n;
      cambiarCifra(cifra, formato(n), dir);
      cifra.setAttribute('aria-label', p.getAttribute('aria-label') + ': ' + formato(n));
      vibrar('selectionAsync()', 'Clock_Tick');
      actualizarFila();
      return true;
    }
    p.querySelectorAll('.paso-btn').forEach((b) => {
      const dir = parseInt(b.dataset.dir, 10);
      let t1 = null, t2 = null, porPuntero = false;
      const parar = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        porPuntero = true;
        dar(dir);
        t1 = setTimeout(() => { t2 = setInterval(() => { if (!dar(dir)) parar(); }, T.repCada); }, T.repIni);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, parar));
      b.addEventListener('click', () => { if (!porPuntero) dar(dir); porPuntero = false; });
    });
    // tocar la cifra para escribirla
    cifra.addEventListener('click', () => {
      if (cifra.querySelector('input')) return;
      const pila = cifra.querySelector('.num-pila');
      const viejo = formato(parseFloat(p.dataset.valor));
      const inp = document.createElement('input');
      inp.type = 'text'; inp.inputMode = 'decimal'; inp.value = viejo;
      inp.setAttribute('aria-label', p.getAttribute('aria-label'));
      pila.hidden = true; cifra.classList.add('editando'); cifra.querySelector('.cifra-in').prepend(inp);
      inp.focus(); inp.select();
      const cerrar = (guardar) => {
        let n = parseFloat(inp.value.replace(',', '.'));
        if (guardar && !isNaN(n)) {
          n = Math.min(max, Math.max(min, n));
          p.dataset.valor = n;
          pila.querySelector('.num').textContent = formato(n);
          actualizarFila();
        }
        inp.remove(); pila.hidden = false; cifra.classList.remove('editando');
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') cerrar(true); if (e.key === 'Escape') cerrar(false); });
      inp.addEventListener('blur', () => cerrar(true));
    });
  });

  // ---- chips (varios) y chips de radio (uno)
  document.querySelectorAll('[data-tematico] .chip').forEach((c) => {
    c.addEventListener('click', () => {
      const grupo = c.dataset.radio;
      if (grupo) {
        if (c.getAttribute('aria-pressed') === 'true') return;
        document.querySelectorAll(`[data-tematico] .chip[data-radio="${grupo}"]`).forEach((o) => o.setAttribute('aria-pressed', 'false'));
        c.setAttribute('aria-pressed', 'true');
        vibrar('selectionAsync()', 'Toggle_On');
        return;
      }
      const on = c.getAttribute('aria-pressed') !== 'true';
      c.setAttribute('aria-pressed', String(on));
      vibrar('selectionAsync()', on ? 'Toggle_On' : 'Toggle_Off');
    });
  });

  // ---- interruptores
  document.querySelectorAll('[data-tematico] .interruptor').forEach((s) => {
    s.addEventListener('click', () => {
      const on = s.getAttribute('aria-checked') !== 'true';
      s.setAttribute('aria-checked', String(on));
      vibrar('selectionAsync()', on ? 'Toggle_On' : 'Toggle_Off');
    });
  });

  // ---- demostraciones en bucle de la tabla (no vibran)
  let vuelta = 0;
  const bucle = () => {
    vuelta++;
    document.querySelectorAll('[data-bucle="presionar"]').forEach((b) => {
      b.classList.add('es-pres'); setTimeout(() => b.classList.remove('es-pres'), 420);
    });
    document.querySelectorAll('[data-bucle="serie"] .visto-btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(vuelta % 2 === 1)));
    document.querySelectorAll('[data-bucle="paso"]').forEach((c) => {
      const dir = vuelta % 4 < 2 ? 1 : -1;
      const n = (parseFloat(c.dataset.v || '80') + dir * 2.5);
      c.dataset.v = n; cambiarCifra(c, formato(n), dir);
    });
    document.querySelectorAll('[data-bucle="estado"] .interruptor').forEach((s) =>
      s.setAttribute('aria-checked', String(vuelta % 2 === 1)));
  };
  setInterval(bucle, 1400);
})();
"""


def pagina():
    controles = (
        '<div class="controles">'
        '<div class="control-fila"><span class="control-etq">Tema</span><div class="chips chips-tema" role="group" aria-label="Tema">'
        '<button type="button" class="chip chip-tema" data-tema-btn="clara" aria-pressed="true"><span class="chip-cara">'
        f'<svg class="chip-visto" viewBox="0 0 16 16" aria-hidden="true"><path d="{D_VISTO_16}"/></svg><span>Clara</span></span></button>'
        '<button type="button" class="chip chip-tema" data-tema-btn="gimnasio" aria-pressed="false"><span class="chip-cara">'
        f'<svg class="chip-visto" viewBox="0 0 16 16" aria-hidden="true"><path d="{D_VISTO_16}"/></svg><span>Modo gimnasio</span></span></button>'
        "</div></div>"
        '<div class="control-fila">'
        '<button type="button" role="switch" id="sw-reducir" class="interruptor" aria-checked="false">'
        '<span class="int-etq">Reducir movimiento</span><span class="riel"><span class="perilla"></span></span></button></div>'
        '<p class="vibracion" id="vibracion" aria-live="polite">Última vibración: ninguna todavía. Toca algo.</p>'
        "</div>"
    )
    return f"""<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GymTrack · Botones Visto</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body data-tema="clara">
<main class="pagina">
  <header class="cabecera">
    <div class="cab-izq">
      {logo_inline(36)}
      <h1>Botones · dirección «Visto»</h1>
      <p>El logo es el botón que tocas al terminar una serie. Todo está en dp reales (1 dp = 1 px en esta página), dentro de marcos de 412 dp, el ancho base del teléfono.</p>
    </div>
    {controles}
  </header>

  <section>
    <div class="sec-tit"><h2>Pruébalo</h2><p>Toca, mantén presionado y escribe. Todo anima de verdad y respeta «reducir movimiento».</p></div>
    <div class="prueba-grid">
      {zona_prueba()}
      {telefono()}
      {paleta_panel()}
    </div>
  </section>

  <section>
    <div class="sec-tit"><h2>Piezas y estados</h2><p>En clara y en modo gimnasio. El estado nunca depende solo del color: cambia la escala, aparece un anillo, un visto o un aro.</p></div>
    {piezas()}
  </section>

  <section>
    <div class="sec-tit"><h2>Movimiento</h2><p>Suave y se asienta, sin sobrepaso. Nada pasa de 250 ms salvo la vuelta del aro de carga.</p></div>
    {tabla_mov()}
    <p class="nota-pie">Curvas: suave <code>cubic-bezier(0.2, 0, 0, 1)</code> · estándar <code>cubic-bezier(0.4, 0, 0.2, 1)</code>.
    Solo se animan transformaciones, opacidad y color: todo pasa directo a Reanimated con <code>withTiming</code> y <code>Easing.bezier</code>.
    Sin sombras, desenfoques, mezclas ni degradados.</p>
  </section>
</main>
<script>{JS}</script>
</body>
</html>
"""


if __name__ == "__main__":
    (DIR / "botones.html").write_text(pagina(), encoding="utf-8")
    print("ok", DIR / "botones.html")
