// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la lógica del entrenador · Zona: Entrenador (app)
//
// Qué hace: prueba sin teléfono lo que calculan Clientes, Ficha, Alertas, Ajustar cargas y el
// código de invitación: búsqueda sin tildes y filtros, cuentas del panel, línea de estado de cada
// cliente, código vigente o vencido, orden y textos de las alertas, mensajes de la Ficha y qué
// cuenta como cambio en Ajustar cargas. Los ids son los del plan de pruebas
// (docs/pruebas/plan-de-validacion.md).
// Tócalo cuando: cambie una regla de logica.ts o el contrato que lee (contrato.ts).
// Depende de: vitest, ../logica y ../contrato.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { esquemaAlerta, esquemaClienteLista, esquemaFicha, esquemaPaginaClientes, esquemaSugerencia, type Alerta } from '../contrato';
import {
  accionFicha,
  agruparPorMes,
  ajusteInicial,
  cambiado,
  contarNuevas,
  contarSinGuardar,
  cuentasPanel,
  cuerpoSobrescribir,
  detalleCorto,
  estadoCliente,
  estadoCodigo,
  filtrarClientes,
  fmtCuando,
  leerEncuesta,
  mensajeInvitacion,
  notaResolver,
  ordenarPorRevisar,
  partirCoincidencia,
  segmentosSemana,
  textoDatoAlerta,
  textoDeltaCarga,
  textoDeltaReps,
  validarMensaje,
} from '../logica';

// ── Datos: Camila Rojas y sus clientes, martes 17 de noviembre de 2026 a las 9:41 ──
const HOY = new Date(2026, 10, 17, 9, 41);
const iso = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m, d, h, min).toISOString();

const cliente = (o: Record<string, unknown>) => esquemaClienteLista.parse({ alertas_abiertas: 0, ...o });
const CLIENTES = [
  cliente({
    id: 'mf',
    nombre: 'Martina',
    apellido: 'Fuentes',
    rutina_activa: { id: 'r1', nombre: 'Fuerza 4 días', dias_semana: 4 },
    entrena_hoy: true,
    dia_hoy: 'Pierna A',
    semana: { hechas: 1, perdidas: 0, planificadas: 4 },
    alertas_abiertas: 1,
    alerta_principal: { tipo: 'estancamiento', estado: 'vista', ejercicio: 'Press inclinado con mancuernas', detalle: {} },
  }),
  cliente({
    id: 'jm',
    nombre: 'Josefa',
    apellido: 'Muñoz',
    rutina_activa: { id: 'r2', nombre: 'Fuerza 4 días' },
    semana: { hechas: 1, perdidas: 0, planificadas: 4 },
    alertas_abiertas: 1,
    alerta_principal: { tipo: 'dolor', estado: 'nueva', detalle: { zona: 'rodilla izquierda', intensidad: 7 } },
  }),
  cliente({
    id: 'is',
    nombre: 'Ignacio',
    apellido: 'Soto',
    rutina_activa: { id: 'r3', nombre: 'Hipertrofia 5 días' },
    semana: { hechas: 0, perdidas: 1, planificadas: 5 },
    alertas_abiertas: 1,
    alerta_principal: { tipo: 'sin_sesiones', estado: 'nueva', detalle: { dias: 8 } },
  }),
  cliente({ id: 'sm', nombre: 'Sebastián', apellido: 'Morales', sin_rutina: true, vinculado_at: iso(2026, 10, 16) }),
  cliente({
    id: 'mc',
    nombre: 'Matías',
    apellido: 'Contreras',
    rutina_activa: { id: 'r4', nombre: 'Fuerza 4 días' },
    entrena_hoy: true,
    ultima_sesion_at: iso(2026, 10, 17, 7, 5),
    ultima_sesion_nombre: 'Pierna A',
    semana: { hechas: 1, perdidas: 0, planificadas: 4 },
  }),
];

function alerta(o: Record<string, unknown>): Alerta {
  return esquemaAlerta.parse({ cliente: { id: 'mf', nombre: 'Martina', apellido: 'Fuentes' }, created_at: iso(2026, 10, 17, 3), ...o });
}

// ── Clientes ─────────────────────────────────────────────────────────────────
describe('Clientes: buscar y filtrar', () => {
  it('APP-040: «Revisar» marca a quien tiene alertas abiertas y su filtro los cuenta', () => {
    const k = cuentasPanel(CLIENTES);
    expect(k.revisar).toBe(3);
    expect(filtrarClientes(CLIENTES, 'revisar').map((c) => c.id)).toEqual(['is', 'jm', 'mf']);
    expect(filtrarClientes(CLIENTES, 'sinrutina').map((c) => c.id)).toEqual(['sm']);
    expect(filtrarClientes(CLIENTES, 'hoy').map((c) => c.id)).toEqual(['mf', 'mc']);
  });

  it('APP-040: buscar «zz» no encuentra a nadie y la lista va en orden alfabético', () => {
    expect(filtrarClientes(CLIENTES, 'todos', 'zz')).toEqual([]);
    expect(filtrarClientes(CLIENTES, 'todos').map((c) => c.nombre)).toEqual(['Ignacio', 'Josefa', 'Martina', 'Matías', 'Sebastián']);
  });

  it('E2E-018: la búsqueda no distingue tildes ni mayúsculas y deja una sola fila con «Martina»', () => {
    expect(filtrarClientes(CLIENTES, 'todos', 'Martina').map((c) => c.id)).toEqual(['mf']);
    expect(filtrarClientes(CLIENTES, 'todos', 'sebastian').map((c) => c.id)).toEqual(['sm']);
    expect(filtrarClientes(CLIENTES, 'todos', 'MUNOZ').map((c) => c.id)).toEqual(['jm']);
    expect(partirCoincidencia('Matías Contreras', 'tias')).toEqual(['Ma', 'tías', ' Contreras']);
  });

  it('APP-040: el panel suma la semana de todos y la adherencia es hechas sobre las que ya tocaban', () => {
    const k = cuentasPanel(CLIENTES);
    expect(k).toMatchObject({ activos: 5, hoy: 2, sinrutina: 1, hechas: 3, perdidas: 1, planificadas: 17, adherencia: 75 });
    expect(segmentosSemana({ hechas: 1, perdidas: 1, planificadas: 4 })).toEqual(['si', 'no', '', '']);
    expect(cuentasPanel([]).adherencia).toBeNull();
  });

  it('APP-040: la línea de estado dice lo que más importa de cada cliente', () => {
    const por = (id: string) => estadoCliente(CLIENTES.find((c) => c.id === id)!, HOY);
    expect(por('jm')).toEqual({ texto: 'Dolor en la rodilla izquierda · 7 de 10', peligro: true });
    expect(por('is').texto).toBe('8 días sin entrenar');
    // La alerta de Martina ya está vista: su fila vuelve a decir qué le toca.
    expect(por('mf').texto).toBe('Entrena hoy · Pierna A');
    expect(por('sm').texto).toBe('Sin rutina · se vinculó ayer');
    expect(por('mc').texto).toBe('Entrenó hoy a las 7:05 · Pierna A');
  });

  it('APP-040: una respuesta con menos datos no rompe la lista', () => {
    const p = esquemaPaginaClientes.parse({ items: [{ id: 'x', nombre: 'Ana' }, { id: 'y', semana: 'mal' }, { sin: 'id' }] });
    // El que no trae id se salta; el de la semana mal formada queda sin semana.
    expect(p.items.map((c) => c.id)).toEqual(['x', 'y']);
    expect(p.items[1]?.semana).toBeNull();
    expect(p.items[0]).toMatchObject({ nombre: 'Ana', apellido: '', alertas_abiertas: 0, rutina_activa: null, semana: null });
    expect(p.next_cursor).toBeNull();
  });
});

// ── Código de invitación ─────────────────────────────────────────────────────
describe('Código de invitación', () => {
  it('APP-039: distingue el código vigente del vencido', () => {
    const ahora = HOY.getTime();
    expect(estadoCodigo({ codigo: 'K7P2QX', vence_at: iso(2026, 10, 24) }, ahora)).toBe('vigente');
    expect(estadoCodigo({ codigo: 'H4M9TB', vence_at: iso(2026, 10, 15) }, ahora)).toBe('vencido');
    expect(estadoCodigo(null, ahora)).toBe('ninguno');
  });

  it('APP-039: un código ya usado o reemplazado por otro no se muestra como vigente', () => {
    const ahora = HOY.getTime();
    const vence = iso(2026, 10, 24);
    expect(estadoCodigo({ codigo: 'K7P2QX', vence_at: vence, estado: 'activo', vigente: false }, ahora)).toBe('ninguno');
    expect(estadoCodigo({ codigo: 'K7P2QX', vence_at: vence, estado: 'invitado', vigente: false }, ahora)).toBe('ninguno');
    expect(estadoCodigo({ codigo: 'K7P2QX', vence_at: vence, estado: 'invitado', vigente: true }, ahora)).toBe('vigente');
  });

  it('APP-039: compartir manda el código con su fecha de vencimiento', () => {
    expect(mensajeInvitacion({ codigo: 'K7P2QX', vence_at: iso(2026, 10, 24) })).toBe(
      'Entrena conmigo en GymTrack. Tu código es K7P2QX y vence el mar 24 nov.',
    );
  });
});

// ── Alertas ──────────────────────────────────────────────────────────────────
describe('Alertas', () => {
  const lista = [
    alerta({ id: 'a6', tipo: 'estancamiento', estado: 'vista', created_at: iso(2026, 10, 12) }),
    alerta({ id: 'a1', tipo: 'dolor', estado: 'nueva', created_at: iso(2026, 10, 16, 19, 20), detalle: { intensidad: 7, zona: 'rodilla izquierda', serie_n: 2, series_total: 3 } }),
    alerta({ id: 'a2', tipo: 'estancamiento', estado: 'nueva', ejercicio: { id: 'e', nombre: 'Press de banca' }, detalle: { mejor_e1rm: 84, mejor_fecha: '2026-11-05', sesiones: 3 } }),
    alerta({ id: 'a9', tipo: 'sin_sesiones', estado: 'resuelta', resuelta_at: iso(2026, 9, 27) }),
  ];

  it('APP-042: por revisar van las nuevas primero y las resueltas quedan fuera', () => {
    expect(ordenarPorRevisar(lista).map((a) => a.id)).toEqual(['a2', 'a1', 'a6']);
    expect(contarNuevas(lista)).toBe(2);
  });

  it('APP-042: las resueltas se agrupan por mes', () => {
    const g = agruparPorMes([lista[3]!, { ...lista[0]!, estado: 'resuelta', resuelta_at: iso(2026, 10, 13) }]);
    expect(g.map((x) => [x.mes, x.items.length])).toEqual([
      ['Noviembre', 1],
      ['Octubre', 1],
    ]);
  });

  it('APP-042: cada alerta dice el dato que la disparó', () => {
    expect(textoDatoAlerta(lista[2]!)).toBe('Su mejor 1RM estimado es 84 kg, del 5 de noviembre. No lo supera en sus 3 últimas sesiones.');
    expect(textoDatoAlerta(lista[1]!)).toBe('Dolor 7 de 10 en la rodilla izquierda. Serie 2 de 3.');
    expect(detalleCorto(lista[1]!)).toBe('Rodilla izquierda · 7 de 10');
    expect(detalleCorto(lista[2]!)).toBe('Press de banca · 3 sesiones iguales');
    const baja = alerta({ id: 'a4', tipo: 'baja_rendimiento', detalle: { medida: 'volumen', valor: 6200, promedio: 7600 } });
    expect(textoDatoAlerta(baja)).toBe('El volumen de la sesión cayó 18 % frente a su promedio de las 4 semanas anteriores.');
  });

  it('APP-042: resolver sin marcar nada no manda nota; con varias, las junta', () => {
    expect(notaResolver([])).toBeUndefined();
    expect(notaResolver(['consejo', 'cargas'])).toBe('Ajustaste las cargas · Le escribiste un consejo');
  });

  it('APP-042: las fechas van como en la maqueta', () => {
    expect(fmtCuando(iso(2026, 10, 17, 3, 0), HOY)).toBe('hoy 3:00');
    expect(fmtCuando(iso(2026, 10, 16, 19, 20), HOY)).toBe('ayer 19:20');
    expect(fmtCuando(iso(2026, 10, 14, 10), HOY)).toBe('sáb 14 nov');
    expect(fmtCuando(iso(2026, 10, 16, 19, 20), HOY, false)).toBe('ayer');
  });
});

// ── Ficha ────────────────────────────────────────────────────────────────────
describe('Ficha del cliente', () => {
  const base = { cliente: { id: 'mf', nombre: 'Martina', apellido: 'Fuentes' } };

  it('APP-041: responder o aconsejar vacío pide escribir antes de enviar', () => {
    expect(validarMensaje('   ', true)).toBe('Escribe la respuesta antes de enviarla.');
    expect(validarMensaje('', false)).toBe('Escribe el consejo antes de enviarlo.');
    expect(validarMensaje('Baja a 37,5.', true)).toBeNull();
  });

  it('APP-041: la acción de abajo sigue a lo que más importa', () => {
    expect(accionFicha(esquemaFicha.parse(base))).toBe('asignar');
    const conRutina = { ...base, rutina_activa: { id: 'r1', nombre: 'Fuerza 4 días', metodo_progresion: 'doble_progresion' } };
    expect(accionFicha(esquemaFicha.parse(conRutina))).toBe('consejo');
    const conDolor = { ...conRutina, observaciones: [{ id: 'o1', tipo: 'dolor', texto: 'Me molestó el hombro.', created_at: iso(2026, 10, 16), dolor_intensidad: 7 }] };
    expect(accionFicha(esquemaFicha.parse(conDolor))).toBe('responder');
    const respondido = { ...conRutina, observaciones: [{ ...conDolor.observaciones[0], respuesta: { texto: 'Baja el peso.', created_at: iso(2026, 10, 17) } }] };
    expect(accionFicha(esquemaFicha.parse(respondido))).toBe('consejo');
  });

  it('E2E-022: el punto de partida muestra las respuestas de la encuesta en palabras', () => {
    const r = {
      objetivo: 'ganar_masa',
      experiencia: 'uno_a_tres_anos',
      dias_semana: 4,
      lugar: 'gimnasio_completo',
      minutos_sesion: 60,
      fecha_nacimiento: '1998-03-02',
      altura_cm: 164,
      peso_kg: 64,
      lesiones: { zonas: ['rodilla'], texto: 'Molestia en la rodilla derecha al bajar en sentadilla profunda.' },
    };
    const { filas, escribio } = leerEncuesta(r, null, HOY);
    expect(filas).toEqual([
      ['Objetivo', 'Ganar masa muscular'],
      ['Experiencia', 'De uno a tres años'],
      ['Días', '4 por semana'],
      ['Tiempo', '60 por sesión'],
      ['Dónde entrena', 'Gimnasio completo'],
      ['Edad y altura', '28 años · 164 cm'],
      ['Peso al empezar', '64 kg'],
      ['Lesiones', 'Rodilla'],
    ]);
    expect(escribio).toBe('Molestia en la rodilla derecha al bajar en sentadilla profunda.');
  });
});

// ── Ajustar cargas ───────────────────────────────────────────────────────────
describe('Ajustar cargas', () => {
  const press = esquemaSugerencia.parse({
    id: 's1',
    nombre: 'Press de banca',
    incremento_kg: 2.5,
    sugerencia: { peso_kg: 42.5, reps_min: 6, reps_max: 8 },
    ultima: { fecha: '2026-11-12', peso_kg: 40, reps: [8, 8, 8, 8], rir: 2 },
  });

  it('APP-043: sin cambios no hay nada que guardar', () => {
    const a = ajusteInicial(press);
    expect(contarSinGuardar([press], {})).toBe(0);
    expect(contarSinGuardar([press], { s1: a })).toBe(0);
    expect(cambiado(press, a)).toBe(false);
  });

  it('APP-043: cambiar la carga habilita Guardar y dice cuánto se aleja de la sugerencia', () => {
    const a = { ...ajusteInicial(press), peso_kg: 37.5, reps_min: 8, reps_max: 10 };
    expect(contarSinGuardar([press], { s1: a })).toBe(1);
    expect(textoDeltaCarga(press, a)).toBe('5 kg menos que la sugerencia.');
    expect(textoDeltaReps(press, a)).toBe('La app sugiere 6–8.');
  });

  it('APP-043: volver a la sugerencia deja «Igual que la sugerencia.»', () => {
    const vuelta = { ...ajusteInicial(press), peso_kg: 42.5 };
    expect(textoDeltaCarga(press, vuelta)).toBe('Igual que la sugerencia.');
    expect(textoDeltaReps(press, vuelta)).toBe('');
  });

  it('APP-043: lo ya sobrescrito se abre con el valor del entrenador y solo se manda lo nuevo', () => {
    const fijada = esquemaSugerencia.parse({ ...press, estado: 'sobrescrita', valor_final: { peso_kg: 40, reps_min: 8, reps_max: 10 }, nota: 'Baja lento' });
    const a = ajusteInicial(fijada);
    expect(a).toEqual({ peso_kg: 40, reps_min: 8, reps_max: 10, nota: 'Baja lento' });
    expect(cambiado(fijada, a)).toBe(true);
    expect(contarSinGuardar([fijada], { s1: a })).toBe(0);
    expect(cuerpoSobrescribir({ ...a, nota: '  ' })).toEqual({ peso_kg: 40, reps_min: 8, reps_max: 10 });
  });
});
