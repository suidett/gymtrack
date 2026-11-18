"""Razón de contraste WCAG 2.x para los pares de la dirección Dupla."""
import json, sys
def lum(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def razon(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)
PARES = [
 # (tema, tipo, uso, primer plano, fondo, mínimo)
 ('clara', 'texto', 'Texto sobre fondo', '#111111', '#F4F4F2', 4.5),
 ('clara', 'texto', 'Texto sobre superficie', '#111111', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Texto sobre fila hecha / fantasma presionado', '#111111', '#E7E7E3', 4.5),
 ('clara', 'texto', 'Texto secundario sobre fondo', '#5C5C58', '#F4F4F2', 4.5),
 ('clara', 'texto', 'Texto secundario sobre superficie', '#5C5C58', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Texto secundario sobre fila hecha', '#5C5C58', '#E7E7E3', 4.5),
 ('clara', 'texto', 'Etiqueta de primario (blanco sobre tinta)', '#FFFFFF', '#111111', 4.5),
 ('clara', 'texto', 'Etiqueta de primario presionado', '#FFFFFF', '#3A3A38', 4.5),
 ('clara', 'texto', 'Acento (enlace, aviso) sobre superficie', '#5A45E0', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Acento sobre fondo', '#5A45E0', '#F4F4F2', 4.5),
 ('clara', 'texto', 'Peligro sobre superficie', '#C0271D', '#FFFFFF', 4.5),
 ('clara', 'texto', 'Peligro sobre fondo', '#C0271D', '#F4F4F2', 4.5),
 ('clara', 'texto', 'Peligro de contorno presionado (sobre relleno suave)', '#C0271D', '#E7E7E3', 4.5),
 ('clara', 'texto', '«Sí, borrar» (blanco sobre peligro)', '#FFFFFF', '#C0271D', 4.5),
 ('clara', 'texto', '«Sí, borrar» presionado (blanco sobre peligro presionado)', '#FFFFFF', '#961E17', 4.5),
 ('clara', 'texto', 'Elegido de chip (blanco sobre tinta)', '#FFFFFF', '#111111', 4.5),
 ('clara', 'informativo', 'Deshabilitado (exento de AA)', '#767671', '#E7E7E3', 0),
 ('clara', 'control', 'Borde gris de chip sobre superficie', '#8A8A85', '#FFFFFF', 3),
 ('clara', 'control', 'Borde gris de chip sobre fondo', '#8A8A85', '#F4F4F2', 3),
 ('clara', 'control', 'Contorno tinta sobre superficie', '#111111', '#FFFFFF', 3),
 ('clara', 'control', 'Contorno tinta sobre fondo', '#111111', '#F4F4F2', 3),
 ('clara', 'control', 'Relleno de acción sobre fondo', '#111111', '#F4F4F2', 3),
 ('clara', 'control', 'Acción presionada sobre fondo', '#3A3A38', '#F4F4F2', 3),
 ('clara', 'control', 'Anillo de foco sobre superficie', '#5A45E0', '#FFFFFF', 3),
 ('clara', 'control', 'Anillo de foco sobre fondo', '#5A45E0', '#F4F4F2', 3),
 ('clara', 'control', 'Contorno de peligro sobre superficie', '#C0271D', '#FFFFFF', 3),
 ('clara', 'control', 'Relleno de «Sí, borrar» presionado sobre superficie', '#961E17', '#FFFFFF', 3),
 ('clara', 'control', 'Disco hecho sobre fila hecha', '#111111', '#E7E7E3', 3),
 ('clara', 'control', 'Visto blanco sobre disco tinta', '#FFFFFF', '#111111', 3),
 ('clara', 'control', 'Perilla blanca sobre riel tinta', '#FFFFFF', '#111111', 3),
 ('clara', 'control', 'Subrayado de edición sobre superficie', '#5A45E0', '#FFFFFF', 3),
 ('gimnasio', 'texto', 'Texto sobre fondo', '#F4F4F2', '#0C0C0C', 4.5),
 ('gimnasio', 'texto', 'Texto sobre superficie', '#F4F4F2', '#1A1A19', 4.5),
 ('gimnasio', 'texto', 'Texto sobre superficie alta / fila hecha', '#F4F4F2', '#2A2A28', 4.5),
 ('gimnasio', 'texto', 'Texto secundario sobre fondo', '#A3A39E', '#0C0C0C', 4.5),
 ('gimnasio', 'texto', 'Texto secundario sobre superficie', '#A3A39E', '#1A1A19', 4.5),
 ('gimnasio', 'texto', 'Texto secundario sobre fila hecha', '#A3A39E', '#2A2A28', 4.5),
 ('gimnasio', 'texto', 'Etiqueta de primario (#111111 sobre hueso)', '#111111', '#F4F4F2', 4.5),
 ('gimnasio', 'texto', 'Etiqueta de primario presionado', '#111111', '#CFCFCB', 4.5),
 ('gimnasio', 'texto', 'Acento sobre superficie', '#A698FF', '#1A1A19', 4.5),
 ('gimnasio', 'texto', 'Acento sobre fondo', '#A698FF', '#0C0C0C', 4.5),
 ('gimnasio', 'texto', 'Peligro sobre superficie', '#FF7A70', '#1A1A19', 4.5),
 ('gimnasio', 'texto', 'Peligro sobre fondo', '#FF7A70', '#0C0C0C', 4.5),
 ('gimnasio', 'texto', 'Peligro de contorno presionado (sobre #2A2A28)', '#FF7A70', '#2A2A28', 4.5),
 ('gimnasio', 'texto', '«Sí, borrar» (#111111 sobre peligro)', '#111111', '#FF7A70', 4.5),
 ('gimnasio', 'texto', '«Sí, borrar» presionado (#111111 sobre peligro presionado)', '#111111', '#D6665E', 4.5),
 ('gimnasio', 'informativo', 'Deshabilitado: #A3A39E sobre #2A2A28 (exento; cambio respecto del encargo)', '#A3A39E', '#2A2A28', 0),
 ('gimnasio', 'informativo', 'Referencia: #7A7A75 sobre #2A2A28 (no se usa como texto)', '#7A7A75', '#2A2A28', 0),
 ('gimnasio', 'control', 'Borde gris de chip sobre superficie', '#7A7A75', '#1A1A19', 3),
 ('gimnasio', 'control', 'Borde gris de chip sobre fondo', '#7A7A75', '#0C0C0C', 3),
 ('gimnasio', 'control', 'Contorno hueso sobre superficie', '#F4F4F2', '#1A1A19', 3),
 ('gimnasio', 'control', 'Contorno hueso sobre fondo', '#F4F4F2', '#0C0C0C', 3),
 ('gimnasio', 'control', 'Relleno de acción sobre fondo', '#F4F4F2', '#0C0C0C', 3),
 ('gimnasio', 'control', 'Acción presionada sobre fondo', '#CFCFCB', '#0C0C0C', 3),
 ('gimnasio', 'control', 'Anillo de foco sobre superficie', '#A698FF', '#1A1A19', 3),
 ('gimnasio', 'control', 'Anillo de foco sobre fondo', '#A698FF', '#0C0C0C', 3),
 ('gimnasio', 'control', 'Contorno de peligro sobre superficie', '#FF7A70', '#1A1A19', 3),
 ('gimnasio', 'control', 'Relleno de «Sí, borrar» presionado sobre superficie', '#D6665E', '#1A1A19', 3),
 ('gimnasio', 'control', 'Disco hecho sobre fila hecha', '#F4F4F2', '#2A2A28', 3),
 ('gimnasio', 'control', 'Visto #111111 sobre disco hueso', '#111111', '#F4F4F2', 3),
 ('gimnasio', 'control', 'Perilla #111111 sobre riel hueso', '#111111', '#F4F4F2', 3),
 ('gimnasio', 'control', 'Subrayado de edición sobre superficie', '#A698FF', '#1A1A19', 3),
 ('gimnasio', 'control', 'Disco presionado de más y menos sobre superficie', '#F4F4F2', '#1A1A19', 3),
]
NUNCA = [('#8A8A85', '#FFFFFF'), ('#8A8A85', '#F4F4F2'), ('#A698FF', '#FFFFFF'), ('#A698FF', '#F4F4F2'), ('#7A7A75', '#1A1A19')]
filas = []
for tema, tipo, uso, a, b, mn in PARES:
    r = razon(a, b)
    filas.append({'tema': tema, 'tipo': tipo, 'uso': uso, 'primer_plano': a, 'fondo': b, 'razon': round(r, 2), 'minimo': mn, 'cumple': r >= mn})
if __name__ == '__main__':
    for x in filas:
        print(f"{x['tema']:9} {x['tipo']:11} {x['razon']:6.2f} {'OK ' if x['cumple'] else 'NO '} {x['primer_plano']} / {x['fondo']}  {x['uso']}")
    print('--- nunca como texto ---')
    for a, b in NUNCA:
        print(a, b, round(razon(a, b), 2))
    json.dump(filas, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1) if len(sys.argv) > 1 else None
