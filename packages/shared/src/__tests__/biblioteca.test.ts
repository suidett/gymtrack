import { describe, expect, it } from 'vitest';
import { DETALLE_BASE, EJERCICIOS_BASE } from '../index';

// La ficha de cada ejercicio de la biblioteca base muestra su técnica y sus músculos: los 67
// tienen que traerlos (salen de exercises.detalle.ts, generado desde docs/pantallas/3d/ejercicios).
describe('técnica y músculos de la biblioteca base', () => {
  const ids = EJERCICIOS_BASE.map((e) => e.id.replace(/^base-/, ''));

  it('son 67 y DETALLE_BASE trae exactamente los mismos ids', () => {
    expect(EJERCICIOS_BASE).toHaveLength(67);
    expect(Object.keys(DETALLE_BASE).sort()).toEqual([...ids].sort());
  });

  it.each(EJERCICIOS_BASE.map((e) => [e.id, e] as const))('%s tiene al menos 3 pasos y músculos principales', (_id, e) => {
    const pasos = (e.instrucciones ?? '').split('\n').filter((p) => p.trim());
    expect(pasos.length).toBeGreaterThanOrEqual(3);
    const d = DETALLE_BASE[e.id.replace(/^base-/, '')];
    expect(d?.trabajan.length).toBeGreaterThan(0);
    // Las instrucciones son los pasos tal cual, uno por línea.
    expect(e.instrucciones).toBe(d?.pasos.join('\n'));
  });

  it('ningún paso ni músculo viene vacío', () => {
    for (const d of Object.values(DETALLE_BASE)) {
      for (const t of [...d.pasos, ...d.trabajan, ...d.ayudan]) expect(t.trim()).not.toBe('');
    }
  });
});
