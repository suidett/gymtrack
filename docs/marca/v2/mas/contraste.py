"""Razones de contraste WCAG 2.x de cada par usado en la dirección «Más»."""
import json, sys

def lum(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def razon(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

def mezcla(base, capa, alfa):
    b = [int(base[i:i+2], 16) for i in (1, 3, 5)]; c = [int(capa[i:i+2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x * (1 - alfa) + y * alfa):02X}' for x, y in zip(b, c))

PEL_PRES_G = mezcla('#FF6B5E', '#0F1113', 0.16)
PEL_PRES_C = mezcla('#B42318', '#0F1113', 0.16)

# (tema, tipo, uso, primer plano, fondo, mínimo)
PARES = [
 ('gimnasio', 'texto', 'Texto sobre fondo', '#F2F3F4', '#0F1113', 4.5),
 ('gimnasio', 'texto', 'Texto sobre superficie', '#F2F3F4', '#1A1D20', 4.5),
 ('gimnasio', 'texto', 'Texto sobre superficie alta (secundario, más y menos)', '#F2F3F4', '#24282C', 4.5),
 ('gimnasio', 'texto', 'Texto sobre secundario presionado', '#F2F3F4', '#2B3035', 4.5),
 ('gimnasio', 'texto', 'Texto secundario sobre fondo', '#A0A6AD', '#0F1113', 4.5),
 ('gimnasio', 'texto', 'Texto secundario sobre superficie', '#A0A6AD', '#1A1D20', 4.5),
 ('gimnasio', 'texto', 'Texto secundario sobre superficie alta', '#A0A6AD', '#24282C', 4.5),
 ('gimnasio', 'texto', 'Etiqueta del primario sobre ámbar', '#0F1113', '#F5B83D', 4.5),
 ('gimnasio', 'texto', 'Etiqueta del primario presionado', '#0F1113', '#D99A1F', 4.5),
 ('gimnasio', 'texto', 'Acento (fantasma) sobre fondo', '#F5B83D', '#0F1113', 4.5),
 ('gimnasio', 'texto', 'Acento (fantasma) sobre superficie', '#F5B83D', '#1A1D20', 4.5),
 ('gimnasio', 'texto', 'Acento sobre fantasma presionado', '#F5B83D', '#24282C', 4.5),
 ('gimnasio', 'texto', 'Peligro (texto) sobre fondo', '#FF6B5E', '#0F1113', 4.5),
 ('gimnasio', 'texto', 'Peligro (texto) sobre superficie', '#FF6B5E', '#1A1D20', 4.5),
 ('gimnasio', 'texto', 'Peligro (texto) sobre presionado', '#FF6B5E', '#24282C', 4.5),
 ('gimnasio', 'texto', 'Etiqueta sobre peligro relleno', '#0F1113', '#FF6B5E', 4.5),
 ('gimnasio', 'texto', 'Etiqueta sobre peligro relleno presionado (grafito al 16 %)', '#0F1113', PEL_PRES_G, 4.5),
 ('gimnasio', 'texto', 'Chip elegido', '#0F1113', '#F2F3F4', 4.5),
 ('gimnasio', 'texto', 'Texto sobre fila hecha', '#F2F3F4', '#3A2F14', 4.5),
 ('gimnasio', 'texto', 'Texto secundario sobre fila hecha', '#A0A6AD', '#3A2F14', 4.5),
 ('gimnasio', 'texto', 'Cifra sobre campo', '#F2F3F4', '#0F1113', 4.5),
 ('gimnasio', 'control', 'Borde de controles sobre superficie', '#767D85', '#1A1D20', 3),
 ('gimnasio', 'control', 'Borde de controles sobre fondo', '#767D85', '#0F1113', 3),
 ('gimnasio', 'control', 'Relleno ámbar (primario, hecho) sobre fondo', '#F5B83D', '#0F1113', 3),
 ('gimnasio', 'control', 'Relleno ámbar (hecho) sobre fila hecha', '#F5B83D', '#3A2F14', 3),
 ('gimnasio', 'control', 'Visto grafito sobre ámbar', '#0F1113', '#F5B83D', 3),
 ('gimnasio', 'control', 'Borde del cuadrado de serie pendiente sobre la fila', '#767D85', '#1A1D20', 3),
 ('gimnasio', 'control', 'Barra del menos (18 × 4) sobre su botón', '#F2F3F4', '#24282C', 3),
 ('gimnasio', 'control', 'Trazo ámbar del más sobre su botón', '#F5B83D', '#24282C', 3),
 ('gimnasio', 'control', 'Perilla apagada sobre riel', '#A0A6AD', '#24282C', 3),
 ('gimnasio', 'control', 'Perilla encendida sobre riel ámbar', '#0F1113', '#F5B83D', 3),
 ('gimnasio', 'control', 'Borde del campo en edición (ámbar)', '#F5B83D', '#0F1113', 3),
 ('gimnasio', 'control', 'Anillo de foco sobre fondo', '#F2F3F4', '#0F1113', 3),
 ('gimnasio', 'control', 'Peligro (borde) sobre superficie', '#FF6B5E', '#1A1D20', 3),
 ('clara', 'texto', 'Texto sobre fondo', '#0F1113', '#F3F4F5', 4.5),
 ('clara', 'texto', 'Texto sobre superficie', '#0F1113', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Texto sobre presionado (fantasma, secundario)', '#0F1113', '#E4E6E8', 4.5),
 ('clara', 'texto', 'Texto secundario sobre superficie', '#555B62', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Texto secundario sobre fondo', '#555B62', '#F3F4F5', 4.5),
 ('clara', 'texto', 'Etiqueta del primario (blanco sobre grafito)', '#FFFFFF', '#0F1113', 4.5),
 ('clara', 'texto', 'Etiqueta del primario presionado', '#FFFFFF', '#2B3035', 4.5),
 ('clara', 'texto', 'Texto de acento sobre superficie', '#8A5A00', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Texto de acento sobre fondo', '#8A5A00', '#F3F4F5', 4.5),
 ('clara', 'texto', 'Texto de acento sobre fantasma presionado', '#8A5A00', '#E4E6E8', 4.5),
 ('clara', 'texto', 'Peligro (texto) sobre superficie', '#B42318', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Peligro (texto) sobre fondo', '#B42318', '#F3F4F5', 4.5),
 ('clara', 'texto', 'Peligro (texto) sobre presionado', '#B42318', '#E4E6E8', 4.5),
 ('clara', 'texto', 'Etiqueta sobre peligro relleno', '#FFFFFF', '#B42318', 4.5),
 ('clara', 'texto', 'Etiqueta sobre peligro relleno presionado (grafito al 16 %)', '#FFFFFF', PEL_PRES_C, 4.5),
 ('clara', 'texto', 'Chip elegido', '#FFFFFF', '#0F1113', 4.5),
 ('clara', 'texto', 'Texto sobre fila hecha', '#0F1113', '#FCEFC9', 4.5),
 ('clara', 'texto', 'Texto secundario sobre fila hecha', '#555B62', '#FCEFC9', 4.5),
 ('clara', 'texto', 'Contenido grafito sobre relleno ámbar', '#0F1113', '#F5B83D', 4.5),
 ('clara', 'control', 'Borde de controles sobre fondo', '#6F767E', '#F3F4F5', 3),
 ('clara', 'control', 'Borde de controles sobre superficie', '#6F767E', '#FFFFFF', 3),
 ('clara', 'control', 'Borde del secundario (grafito) sobre fondo', '#0F1113', '#F3F4F5', 3),
 ('clara', 'control', 'Borde #8A5A00 del relleno ámbar sobre superficie', '#8A5A00', '#FFFFFF', 3),
 ('clara', 'control', 'Borde #8A5A00 del botón hecho sobre fila hecha', '#8A5A00', '#FCEFC9', 3),
 ('clara', 'control', 'Relleno grafito (primario) sobre fondo', '#0F1113', '#F3F4F5', 3),
 ('clara', 'control', 'Borde del cuadrado de serie pendiente sobre la fila', '#6F767E', '#FFFFFF', 3),
 ('clara', 'control', 'Barra del menos (18 × 4) sobre su botón', '#0F1113', '#FFFFFF', 3),
 ('clara', 'control', 'Perilla apagada sobre riel', '#6F767E', '#FFFFFF', 3),
 ('clara', 'control', 'Borde #8A5A00 del riel encendido sobre superficie', '#8A5A00', '#FFFFFF', 3),
 ('clara', 'control', 'Borde #8A5A00 del riel encendido sobre fondo', '#8A5A00', '#F3F4F5', 3),
 ('clara', 'control', 'Perilla grafito sobre riel ámbar', '#0F1113', '#F5B83D', 3),
 ('clara', 'control', 'Perilla grafito sobre riel ámbar presionado', '#0F1113', '#D99A1F', 3),
 ('clara', 'control', 'Borde del campo en edición (#8A5A00)', '#8A5A00', '#F3F4F5', 3),
 ('clara', 'control', 'Anillo de foco sobre fondo', '#0F1113', '#F3F4F5', 3),
 ('clara', 'nunca', 'Ámbar como texto sobre blanco (prohibido)', '#F5B83D', '#FFFFFF', 4.5),
 ('clara', 'nunca', 'Ámbar como texto sobre fondo claro (prohibido)', '#F5B83D', '#F3F4F5', 4.5),
 # Marca: ícono de app con fondo #1A1D20 (antes #0F1113). No entran en las tablas de botones.html.
 ('marca', 'control', 'Ícono: trazo ámbar sobre fondo #1A1D20', '#F5B83D', '#1A1D20', 3),
 ('marca', 'control', 'Ícono: tramos claros sobre fondo #1A1D20', '#F2F3F4', '#1A1D20', 3),
 ('marca', 'control', 'Ícono anterior: trazo ámbar sobre #0F1113', '#F5B83D', '#0F1113', 3),
 ('marca', 'control', 'Ícono anterior: tramos claros sobre #0F1113', '#F2F3F4', '#0F1113', 3),
]

if __name__ == '__main__':
    filas = []
    for tema, tipo, uso, a, b, m in PARES:
        r = razon(a, b)
        filas.append({'tema': tema, 'tipo': tipo, 'uso': uso, 'primer': a, 'fondo': b, 'razon': round(r, 2), 'minimo': m, 'cumple': r >= m})
        print(f'{tema:9} {tipo:7} {r:5.2f} {"ok " if r >= m else "NO "} {a} / {b}  {uso}')
    print('peligro presionado', PEL_PRES_G, PEL_PRES_C)
    json.dump(filas, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1) if len(sys.argv) > 1 else None
