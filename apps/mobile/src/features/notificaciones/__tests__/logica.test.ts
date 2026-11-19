// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la lógica de la campana · Zona: Notificaciones (app)
//
// Qué hace: prueba en Node las reglas puras de ../logica.ts: la insignia y lo que lee el lector de
// pantalla, «hace cuánto», juntar páginas sin duplicar y sin que una leída vuelva a sin leer,
// marcar en el teléfono, cómo se abre la ruta de cada notificación y el tirón de la app web.
// Ids NOT-090 a NOT-095 (campana en la app), en la línea de los NOT-xx de plan-de-validacion.md.
// Tócalo cuando: cambie una regla de ../logica.ts.
// Depende de: vitest y ../logica.
// ─────────────────────────────────────────────────────────────────────────────
import type { Notificacion } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import {
  comoAbrir, debeRefrescarAlTirar, desmarcarLeida, etiquetaCampana, etiquetaFila, haceCuanto, marcarLeida, marcarTodas, mezclarPrimera,
  mezclarSiguiente, resumenSinLeer, rutaSegunRol, textoContador, TIRON_PARA_REFRESCAR, type Lista,
} from '../logica';

/** Una notificación de prueba: `n(3)` es de las 13:03 del 17-11. */
const n = (min: number, leida = false): Notificacion => ({
  id: `0193${String(min).padStart(4, '0')}-0000-7000-8000-000000000000`,
  tipo: 'consejo', titulo: `T${min}`, cuerpo: 'C', ruta: '/', leida,
  created_at: new Date(Date.UTC(2026, 10, 17, 13, min)).toISOString(),
});
const titulos = (l: Lista) => l.items.map((x) => x.titulo);
const vacia: Lista = { items: [], sinLeer: 0, hayMas: false };

describe('Insignia de la campana', () => {
  it('NOT-090 nada con 0, el número hasta 9 y «9+» desde 10; el lector dice cuántas sin leer', () => {
    expect([0, -1, Number.NaN, 1, 9, 10, 250].map(textoContador)).toEqual([null, null, null, '1', '9', '9+', '9+']);
    expect(etiquetaCampana(0)).toBe('Notificaciones, ninguna sin leer');
    expect(etiquetaCampana(1)).toBe('Notificaciones, 1 sin leer');
    expect(etiquetaCampana(12)).toBe('Notificaciones, 12 sin leer');
    expect([resumenSinLeer(0), resumenSinLeer(1), resumenSinLeer(4)]).toEqual(['Estás al día', '1 sin leer', '4 sin leer']);
    // Cada fila: si está sin leer, el título, el texto y hace cuánto, sin puntos dobles.
    expect(etiquetaFila({ leida: false, titulo: 'Martina dejó una observación', cuerpo: 'Sobre Press de banca. Toca para verla en su ficha.' }, 'ayer'))
      .toBe('Sin leer. Martina dejó una observación. Sobre Press de banca. Toca para verla en su ficha. ayer');
    expect(etiquetaFila({ leida: true, titulo: 'Prueba', cuerpo: '' }, '')).toBe('Prueba');
  });
});

describe('Hace cuánto', () => {
  it('NOT-091 recién, minutos, horas del mismo día y desde ayer como el resto de la app', () => {
    const ahora = new Date(2026, 10, 19, 18, 0);
    const hace = (ms: number) => haceCuanto(new Date(ahora.getTime() - ms).toISOString(), ahora);
    expect(hace(20_000)).toBe('recién');
    expect(hace(5 * 60_000)).toBe('hace 5 min');
    expect(hace(59 * 60_000)).toBe('hace 59 min');
    expect(hace(3 * 3_600_000)).toBe('hace 3 h');
    expect(haceCuanto(new Date(2026, 10, 18, 23, 0).toISOString(), ahora)).toBe('ayer');
    expect(haceCuanto(new Date(2026, 10, 16, 9, 0).toISOString(), ahora)).toBe('hace 3 días');
    // Un reloj del teléfono atrasado no da «hace -2 min».
    expect(hace(-120_000)).toBe('recién');
    expect(haceCuanto('no es fecha', ahora)).toBe('');
  });
});

describe('Juntar páginas', () => {
  it('NOT-092 la primera página va arriba, sin duplicar, y conserva las antiguas que ya se habían cargado', () => {
    // Se veían 4..1 (dos páginas de 2); llega una primera página nueva con 6 y 5.
    const previa: Lista = { items: [n(4), n(3), n(2), n(1)], sinLeer: 4, hayMas: false };
    const r = mezclarPrimera(previa, { items: [n(6), n(5)], sin_leer: 6 }, 2);
    expect(titulos(r)).toEqual(['T6', 'T5', 'T4', 'T3', 'T2', 'T1']);
    expect([r.sinLeer, r.hayMas]).toEqual([6, false]);
    // Una página incompleta es toda la lista: no queda nada más abajo.
    expect(titulos(mezclarPrimera(previa, { items: [n(6)], sin_leer: 1 }, 2))).toEqual(['T6']);
    // Sin nada antes y página llena: puede haber más.
    expect(mezclarPrimera(vacia, { items: [n(2), n(1)], sin_leer: 2 }, 2).hayMas).toBe(true);
    // La siguiente (pedida con antes) va debajo, sin repetir.
    const s = mezclarSiguiente({ items: [n(6), n(5)], sinLeer: 6, hayMas: true }, { items: [n(5), n(4)], sin_leer: 6 }, 2);
    expect(titulos(s)).toEqual(['T6', 'T5', 'T4']);
    expect(mezclarSiguiente(s, { items: [n(3)], sin_leer: 6 }, 2).hayMas).toBe(false);
  });

  it('NOT-093 una que el teléfono ya marcó leída no vuelve a sin leer si la respuesta salió antes, y el contador se corrige', () => {
    const previa = marcarLeida({ items: [n(2), n(1)], sinLeer: 2, hayMas: false }, n(2).id);
    expect(previa.sinLeer).toBe(1);
    const r = mezclarPrimera(previa, { items: [n(3), n(2), n(1)], sin_leer: 3 }, 30);
    expect(r.items.map((x) => [x.titulo, x.leida])).toEqual([['T3', false], ['T2', true], ['T1', false]]);
    expect(r.sinLeer).toBe(2);
  });
});

describe('Marcar en el teléfono', () => {
  it('NOT-094 marcar una baja el contador una vez; desmarcar la devuelve; marcar todas deja 0', () => {
    const l: Lista = { items: [n(3), n(2, true), n(1)], sinLeer: 2, hayMas: false };
    const una = marcarLeida(l, n(3).id);
    expect([una.sinLeer, una.items[0]!.leida]).toEqual([1, true]);
    expect(marcarLeida(una, n(3).id)).toBe(una);
    expect(marcarLeida(l, 'no-esta')).toBe(l);
    expect(desmarcarLeida(una, n(3).id)).toEqual(l);
    const todas = marcarTodas(l);
    expect([todas.sinLeer, todas.items.every((x) => x.leida)]).toEqual([0, true]);
  });
});

describe('Abrir la ruta de una notificación', () => {
  it('NOT-095 las pestañas se muestran volviendo; la ficha y la rutina se abren encima; «/» del entrenador es Clientes', () => {
    expect(['/', '/entrenador/alertas', '/entrenador', '/perfil', '/progreso?x=1'].map(comoAbrir)).toEqual(['volver', 'volver', 'volver', 'volver', 'volver']);
    expect(['/cliente/0193-abc', '/rutina/0193-abc', '/ejercicio/1'].map(comoAbrir)).toEqual(['abrir', 'abrir', 'abrir']);
    expect(['https://ataque.cl', '//ataque.cl', 'javascript:alert(1)', ''].map(comoAbrir)).toEqual(['nada', 'nada', 'nada', 'nada']);
    expect(rutaSegunRol('/', 'entrenador')).toBe('/entrenador');
    expect(rutaSegunRol('/', 'alumno')).toBe('/');
    expect(rutaSegunRol('/entrenador/alertas', 'entrenador')).toBe('/entrenador/alertas');
  });

  it('NOT-096 en la web, tirar hacia abajo desde arriba de la lista refresca; desde más abajo o con poco recorrido, no', () => {
    expect(debeRefrescarAlTirar({ desplazamientoAlEmpezar: 0, yInicio: 100, yAhora: 100 + TIRON_PARA_REFRESCAR })).toBe(true);
    expect(debeRefrescarAlTirar({ desplazamientoAlEmpezar: 0, yInicio: 100, yAhora: 130 })).toBe(false);
    expect(debeRefrescarAlTirar({ desplazamientoAlEmpezar: 240, yInicio: 100, yAhora: 300 })).toBe(false);
    expect(debeRefrescarAlTirar({ desplazamientoAlEmpezar: 0, yInicio: 300, yAhora: 100 })).toBe(false);
  });
});
