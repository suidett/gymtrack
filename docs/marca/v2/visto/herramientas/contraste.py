"""Razones de contraste WCAG 2.x de cada par de la paleta «Visto».

Uso: python3 docs/marca/v2/visto/herramientas/contraste.py
Imprime una tabla en Markdown (la misma que está en notas.md) y falla si un par
obligatorio no llega a su mínimo.
"""
import sys


def lum(hexa):
    hexa = hexa.lstrip("#")
    r, g, b = (int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4))

    def canal(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)


def razon(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# (modo, uso, primer plano, fondo, mínimo)  mínimo: 4.5 texto · 3 componente · 0 informativo/exento
PARES = [
    ("Clara", "Texto sobre fondo", "#131A17", "#F5F7F5", 4.5),
    ("Clara", "Texto sobre superficie", "#131A17", "#FFFFFF", 4.5),
    ("Clara", "Texto secundario sobre fondo", "#56635D", "#F5F7F5", 4.5),
    ("Clara", "Texto secundario sobre superficie", "#56635D", "#FFFFFF", 4.5),
    ("Clara", "Etiqueta tinta sobre primario", "#131A17", "#45B392", 4.5),
    ("Clara", "Etiqueta tinta sobre primario presionado", "#131A17", "#37997C", 4.5),
    ("Clara", "Acento texto sobre superficie", "#1F6B56", "#FFFFFF", 4.5),
    ("Clara", "Acento texto sobre fondo", "#1F6B56", "#F5F7F5", 4.5),
    ("Clara", "Etiqueta secundario sobre tonal", "#1F6B56", "#DDF3EC", 4.5),
    ("Clara", "Etiqueta tinta sobre tonal presionado (secundario y chip elegido)", "#131A17", "#A0D9C8", 4.5),
    ("Clara", "Texto sobre fila hecha / chip elegido", "#131A17", "#DDF3EC", 4.5),
    ("Clara", "Texto secundario sobre fila hecha", "#56635D", "#DDF3EC", 4.5),
    ("Clara", "Texto blanco sobre peligro (contorno presionado y confirmación)", "#FFFFFF", "#B3261E", 4.5),
    ("Clara", "Texto blanco sobre peligro presionado (confirmación)", "#FFFFFF", "#8C1D18", 4.5),
    ("Clara", "Etiqueta del peligro contorno sobre superficie", "#B3261E", "#FFFFFF", 4.5),
    ("Clara", "Etiqueta del peligro contorno sobre fondo", "#B3261E", "#F5F7F5", 4.5),
    ("Clara", "Subrayado de cifra #2F7F68 sobre fondo", "#2F7F68", "#F5F7F5", 3),
    ("Clara", "Borde del primario #2F7F68 sobre fondo", "#2F7F68", "#F5F7F5", 3),
    ("Clara", "Borde del primario #2F7F68 sobre superficie", "#2F7F68", "#FFFFFF", 3),
    ("Clara", "Borde de control sobre superficie", "#7C8983", "#FFFFFF", 3),
    ("Clara", "Borde de control sobre fondo", "#7C8983", "#F5F7F5", 3),
    ("Clara", "Aro de serie pendiente / perilla apagada sobre superficie", "#7C8983", "#FFFFFF", 3),
    ("Clara", "Visto tinta sobre menta (símbolo)", "#131A17", "#45B392", 3),
    ("Clara", "Anillo de foco tinta sobre fondo", "#131A17", "#F5F7F5", 3),
    ("Clara", "Perilla tinta sobre riel menta", "#131A17", "#45B392", 3),
    ("Clara", "Borde del peligro contorno sobre superficie", "#B3261E", "#FFFFFF", 3),
    ("Clara", "Borde del peligro contorno / relleno de confirmación sobre fondo", "#B3261E", "#F5F7F5", 3),
    ("Clara", "Deshabilitado: texto sobre relleno (exento)", "#6F7C76", "#E3E8E5", 0),
    ("Clara", "NUNCA texto: menta sobre superficie", "#45B392", "#FFFFFF", 0),
    ("Clara", "NUNCA texto: menta sobre fondo", "#45B392", "#F5F7F5", 0),
    ("Clara", "Menta sola contra fila hecha (por eso el visto lleva tinta)", "#45B392", "#DDF3EC", 0),
    ("Clara", "Tonal presionado contra tonal en reposo (paso visible)", "#A0D9C8", "#DDF3EC", 0),
    ("Clara", "Tonal presionado contra primario en reposo (ya no son iguales)", "#A0D9C8", "#45B392", 0),
    ("Gimnasio", "Texto sobre fondo", "#ECF2EF", "#0E1412", 4.5),
    ("Gimnasio", "Texto sobre superficie", "#ECF2EF", "#18211D", 4.5),
    ("Gimnasio", "Texto sobre superficie alta", "#ECF2EF", "#222D28", 4.5),
    ("Gimnasio", "Texto secundario sobre fondo", "#9DADA6", "#0E1412", 4.5),
    ("Gimnasio", "Texto secundario sobre superficie", "#9DADA6", "#18211D", 4.5),
    ("Gimnasio", "Etiqueta #0E1412 sobre primario", "#0E1412", "#45B392", 4.5),
    ("Gimnasio", "Etiqueta #0E1412 sobre primario presionado", "#0E1412", "#6FD0B2", 4.5),
    ("Gimnasio", "Acento #6FD0B2 sobre fondo", "#6FD0B2", "#0E1412", 4.5),
    ("Gimnasio", "Acento #6FD0B2 sobre superficie", "#6FD0B2", "#18211D", 4.5),
    ("Gimnasio", "Etiqueta secundario sobre tonal", "#6FD0B2", "#1D3A31", 4.5),
    ("Gimnasio", "Etiqueta #ECF2EF sobre tonal presionado (secundario y chip elegido)", "#ECF2EF", "#295E4E", 4.5),
    ("Gimnasio", "Texto sobre fila hecha / chip elegido", "#ECF2EF", "#1D3A31", 4.5),
    ("Gimnasio", "Texto secundario sobre fila hecha", "#9DADA6", "#1D3A31", 4.5),
    ("Gimnasio", "Etiqueta del peligro contorno sobre fondo", "#FF8A80", "#0E1412", 4.5),
    ("Gimnasio", "Etiqueta del peligro contorno sobre superficie", "#FF8A80", "#18211D", 4.5),
    ("Gimnasio", "Texto #131A17 sobre peligro (contorno presionado y confirmación)", "#131A17", "#FF8A80", 4.5),
    ("Gimnasio", "Texto #131A17 sobre peligro presionado (confirmación)", "#131A17", "#FFB4AB", 4.5),
    ("Gimnasio", "Primario (relleno) sobre fondo", "#45B392", "#0E1412", 3),
    ("Gimnasio", "Primario (relleno) sobre superficie", "#45B392", "#18211D", 3),
    ("Gimnasio", "Borde de control sobre superficie", "#74857E", "#18211D", 3),
    ("Gimnasio", "Borde de control sobre fondo", "#74857E", "#0E1412", 3),
    ("Gimnasio", "Borde del chip elegido #6FD0B2 sobre fondo", "#6FD0B2", "#0E1412", 3),
    ("Gimnasio", "Visto #0E1412 sobre menta (símbolo)", "#0E1412", "#45B392", 3),
    ("Gimnasio", "Anillo de foco #ECF2EF sobre fondo", "#ECF2EF", "#0E1412", 3),
    ("Gimnasio", "Borde del peligro contorno / relleno de confirmación sobre fondo", "#FF8A80", "#0E1412", 3),
    ("Gimnasio", "Borde del peligro contorno sobre superficie", "#FF8A80", "#18211D", 3),
    ("Gimnasio", "Aro punteado de serie bloqueada sobre superficie (exento)", "#74857E", "#18211D", 0),
    ("Gimnasio", "Deshabilitado: texto sobre relleno (exento)", "#74857E", "#222D28", 0),
    ("Gimnasio", "Tonal sin borde contra fondo (lo identifica la etiqueta)", "#1D3A31", "#0E1412", 0),
    ("Gimnasio", "Tonal presionado contra tonal en reposo (paso visible)", "#295E4E", "#1D3A31", 0),
    ("Gimnasio", "Tonal presionado contra primario en reposo (ya no son iguales)", "#295E4E", "#45B392", 0),
]


def main():
    falla = False
    print("| Modo | Par | Primer plano | Fondo | Razón | Mínimo | ¿Cumple? |")
    print("|---|---|---|---|---|---|---|")
    for modo, uso, a, b, minimo in PARES:
        r = razon(a, b)
        if minimo:
            ok = "sí" if r >= minimo else "NO"
            falla |= r < minimo
            mtxt = "4,5 (texto)" if minimo == 4.5 else "3 (componente)"
        else:
            ok = "—"
            mtxt = "no aplica"
        print(f"| {modo} | {uso} | `{a}` | `{b}` | {r:.2f}:1".replace(".", ",") + f" | {mtxt} | {ok} |")
    if falla:
        sys.exit(1)


if __name__ == "__main__":
    main()
