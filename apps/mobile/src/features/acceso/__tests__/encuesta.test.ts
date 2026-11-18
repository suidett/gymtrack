// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la Encuesta inicial · Zona: Acceso
//
// Qué hace: prueba sin teléfono ni red el reductor de la encuesta y sus llamadas: cabecera y
// barra, Atrás sin perder respuestas, Siguiente deshabilitado sin respuesta, fecha imposible,
// edad mínima, rango de altura, código del entrenador (rechazado, bueno o sin comprobar), el
// consentimiento obligatorio, la falla al guardar con reintento y el cuerpo de POST /me/survey.
// Cada prueba lleva el id del plan (docs/pruebas/plan-de-validacion.md).
// Tócalo cuando: cambie una pregunta o una regla de encuesta.ts o encuestaApi.ts.
// Depende de: vitest, @gymtrack/shared (ErrorDeApi), ../encuesta y ../encuestaApi.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi, esquemaEncuestaEntrada } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import {
  armarCuerpo,
  estadoInicial,
  etiquetaPrincipal,
  FINAL,
  MENSAJE_CODIGO_INVALIDO,
  porcentajeAvance,
  puedeSeguir,
  reducirEncuesta,
  segmentosHechos,
  textoCabecera,
  textoRespuesta,
  PREGUNTAS,
  type AccionEncuesta,
  type EstadoEncuesta,
} from '../encuesta';
import { comprobarCodigo, enviarEncuesta, falloDeEncuesta, RUTA_ENCUESTA, vincular, type Llamador } from '../encuestaApi';

// El martes 17 de noviembre de 2026, como el reloj de las pruebas de la API.
const HOY = new Date(2026, 10, 17, 10, 0, 0);
const correr = (acciones: AccionEncuesta[], s: EstadoEncuesta = estadoInicial(HOY)) => acciones.reduce(reducirEncuesta, s);
const sig: AccionEncuesta = { tipo: 'siguiente' };

/** Las respuestas de Martina hasta antes de la pregunta 10 (índice 9). */
const HASTA_CODIGO: AccionEncuesta[] = [
  { tipo: 'elegir', valor: 'ganar_masa' },
  sig,
  { tipo: 'elegir', valor: 'uno_a_tres_anos' },
  sig,
  { tipo: 'elegir', valor: 4 },
  sig,
  { tipo: 'elegir', valor: 'gimnasio_completo' },
  sig,
  { tipo: 'elegir', valor: 60 },
  sig,
  { tipo: 'escribir', campo: 'd', valor: '12' },
  { tipo: 'pasar', campo: 'm', dir: 1 },
  { tipo: 'pasar', campo: 'm', dir: 1 },
  { tipo: 'pasar', campo: 'm', dir: 1 },
  { tipo: 'escribir', campo: 'a', valor: '1997' },
  sig,
  { tipo: 'escribir', campo: 'altura', valor: '165' },
  sig,
  { tipo: 'escribir', campo: 'peso', valor: '63.4' },
  sig,
  { tipo: 'marcar', valor: 'hombro' },
  { tipo: 'escribir', campo: 'lesionesTexto', valor: 'Hombro derecho, leve.' },
  sig,
];

/** Un gestor falso: responde según la ruta y guarda lo que se le pidió. */
function llamadorFalso(responder: (metodo: string, ruta: string, cuerpo?: unknown) => unknown) {
  const llamadas: { metodo: string; ruta: string; cuerpo?: unknown }[] = [];
  const api: Llamador = {
    llamar: (async (metodo: string, ruta: string, op?: { cuerpo?: unknown }) => {
      llamadas.push({ metodo, ruta, cuerpo: op?.cuerpo });
      return responder(metodo, ruta, op?.cuerpo);
    }) as Llamador['llamar'],
  };
  return { api, llamadas };
}

describe('Encuesta inicial (PAN-04)', () => {
  it('APP-011 · en la pregunta 3 dice «Pregunta 3 de 10», la barra va en 30 % y Siguiente espera una respuesta', () => {
    const s = correr(HASTA_CODIGO.slice(0, 4));
    expect(s.n).toBe(2);
    expect(textoCabecera(s)).toBe('Pregunta 3 de 10');
    expect(porcentajeAvance(s)).toBe(30);
    expect(segmentosHechos(s)).toBe(2);
    expect(puedeSeguir(s)).toBe(false);
    expect(etiquetaPrincipal(s)).toBe('Siguiente');
    // Siguiente sin respuesta no avanza.
    expect(reducirEncuesta(s, sig).n).toBe(2);
  });

  it('APP-011 · Atrás vuelve sin perder lo respondido y la respuesta de la 2 sigue marcada', () => {
    const s = correr([...HASTA_CODIGO.slice(0, 4), { tipo: 'atras' }]);
    expect(s.n).toBe(1);
    expect(s.r.experiencia).toBe('uno_a_tres_anos');
    expect(puedeSeguir(s)).toBe(true);
    expect(reducirEncuesta(s, sig).n).toBe(2);
  });

  it('APP-012 · 31 de febrero da «Revisa el día: febrero de 2001 tiene 28 días.» y no avanza', () => {
    const base = correr(HASTA_CODIGO.slice(0, 10));
    expect(base.n).toBe(5);
    const s = correr(
      [
        { tipo: 'escribir', campo: 'd', valor: '31' },
        { tipo: 'pasar', campo: 'm', dir: 1 },
        { tipo: 'pasar', campo: 'm', dir: 1 },
        { tipo: 'escribir', campo: 'a', valor: '2001' },
        sig,
      ],
      base,
    );
    expect(s.n).toBe(5);
    expect(s.err).toBe('Revisa el día: febrero de 2001 tiene 28 días.');
  });

  it('APP-012 · una fecha que da 13 años muestra la edad mínima (P-13)', () => {
    const base = correr(HASTA_CODIGO.slice(0, 10));
    const s = correr(
      [{ tipo: 'escribir', campo: 'd', valor: '18' }, { tipo: 'pasar', campo: 'm', dir: 1 }, { tipo: 'escribir', campo: 'a', valor: '2013' }, sig],
      base,
    );
    expect(s.err).toBe('Para usar GymTrack necesitas tener 14 años o más.');
    expect(s.n).toBe(5);
  });

  it('APP-012 · una altura de 300 cm da «Escribe un número entre 120 y 230.»; el más se frena en el máximo', () => {
    const base = correr(HASTA_CODIGO.slice(0, 16));
    expect(base.n).toBe(6);
    const s = correr([{ tipo: 'escribir', campo: 'altura', valor: '300' }, sig], base);
    expect(s.err).toBe('Escribe un número entre 120 y 230.');
    expect(s.n).toBe(6);
    const tope = correr([{ tipo: 'escribir', campo: 'altura', valor: '230' }, { tipo: 'pasar', campo: 'altura', dir: 1 }], base);
    expect(tope.r.altura).toBe('230');
    expect(tope.limite).toBe('max');
  });

  it('APP-012 · el peso sube de 0,1 en 0,1 y se escribe con coma', () => {
    const base = correr(HASTA_CODIGO.slice(0, 18));
    expect(base.n).toBe(7);
    const s = correr([{ tipo: 'escribir', campo: 'peso', valor: '62.4' }, { tipo: 'pasar', campo: 'peso', dir: 1 }], base);
    expect(s.r.peso).toBe('62,5');
    // Sin nada escrito, el más arranca en la base de 65.
    expect(correr([{ tipo: 'pasar', campo: 'peso', dir: 1 }], base).r.peso).toBe('65');
  });

  it('CU-09 A3 · «Ninguna» excluye las demás lesiones', () => {
    const base = correr(HASTA_CODIGO.slice(0, 20));
    expect(base.n).toBe(8);
    const s = correr([{ tipo: 'marcar', valor: 'rodilla' }, { tipo: 'marcar', valor: 'hombro' }, { tipo: 'marcar', valor: 'ninguna' }], base);
    expect(s.r.lesiones).toEqual(['ninguna']);
    expect(correr([{ tipo: 'marcar', valor: 'cadera' }], s).r.lesiones).toEqual(['cadera']);
  });

  it('APP-013 · un código que la API rechaza muestra el error y «Seguir sin código»; con K7P2QX se ve a Camila', async () => {
    const base = correr(HASTA_CODIGO);
    expect(base.n).toBe(9);
    expect(etiquetaPrincipal(base)).toBe('Seguir sin código');

    // Vista previa: POST /v1/me/trainer/link { codigo, vista_previa: true } (RUTAS_PERFIL.vincular).
    const { api } = llamadorFalso((_m, _ruta, cuerpo) => {
      const c = cuerpo as { codigo?: string; vista_previa?: boolean } | undefined;
      if (c?.vista_previa && c.codigo === 'K7P2QX') return { entrenador: { id: 'x', nombre: 'Camila', apellido: 'Rojas' }, vinculado: false, aceptado_at: null };
      throw new ErrorDeApi(404, 'INVITATION_NOT_FOUND', 'Ese código no existe o ya venció.');
    });

    let s = correr([{ tipo: 'codigo', valor: 'k7b2qx' }], base);
    expect(s.r.codigo).toBe('K7B2QX');
    expect(s.codigo.tipo).toBe('comprobando');
    expect(puedeSeguir(s)).toBe(false);
    s = reducirEncuesta(s, { tipo: 'codigoComprobado', codigo: 'K7B2QX', resultado: await comprobarCodigo(api, 'K7B2QX') });
    expect(s.codigo).toEqual({ tipo: 'error', mensaje: MENSAJE_CODIGO_INVALIDO });
    expect(MENSAJE_CODIGO_INVALIDO.startsWith('Ese código no existe o ya venció.')).toBe(true);
    expect(etiquetaPrincipal(s)).toBe('Seguir sin código');

    s = correr([{ tipo: 'codigo', valor: 'K7P2QX' }], s);
    s = reducirEncuesta(s, { tipo: 'codigoComprobado', codigo: 'K7P2QX', resultado: await comprobarCodigo(api, 'K7P2QX') });
    expect(s.codigo).toEqual({ tipo: 'valido', entrenador: { nombre: 'Camila', apellido: 'Rojas' } });
    expect(etiquetaPrincipal(s)).toBe('Siguiente');
    expect(textoRespuesta(PREGUNTAS[9], s).map((t) => t.texto).join('')).toBe('Camila Rojas · K7P2QX');
  });

  it('APP-013 · «Seguir sin código» con un código rechazado lo borra; sin la ruta de comprobación, se revisa al terminar', async () => {
    const base = correr([...HASTA_CODIGO, { tipo: 'codigo', valor: 'K7B2QX' }]);
    const malo = reducirEncuesta(base, { tipo: 'codigoComprobado', codigo: 'K7B2QX', resultado: { tipo: 'error', mensaje: MENSAJE_CODIGO_INVALIDO } });
    const fin = reducirEncuesta(malo, sig);
    expect(fin.n).toBe(FINAL);
    expect(fin.r.codigo).toBe('');
    expect(armarCuerpo(fin).respuestas.codigo_entrenador).toBeNull();

    // La API todavía sin la vista previa: 404 NOT_FOUND genérico. El código sigue y va en el cuerpo.
    const { api } = llamadorFalso(() => {
      throw new ErrorDeApi(404, 'NOT_FOUND', 'No encontramos lo que buscas.');
    });
    expect(await comprobarCodigo(api, 'K7P2QX')).toEqual({ tipo: 'sin-comprobar' });
    const sinRed = llamadorFalso(() => {
      throw new TypeError('Network request failed');
    });
    expect(await comprobarCodigo(sinRed.api, 'K7P2QX')).toEqual({ tipo: 'sin-comprobar' });
  });

  it('APP-014 · «Terminar» está deshabilitado sin la casilla; la falla deja las respuestas y el reintento manda las mismas 10', async () => {
    let s = correr([...HASTA_CODIGO, sig]);
    expect(s.n).toBe(FINAL);
    expect(textoCabecera(s)).toBe('Último paso · revisa y termina');
    expect(etiquetaPrincipal(s)).toBe('Terminar');
    expect(puedeSeguir(s)).toBe(false);
    s = reducirEncuesta(s, { tipo: 'consentir' });
    expect(puedeSeguir(s)).toBe(true);

    let falla = true;
    const { api, llamadas } = llamadorFalso((metodo, ruta) => {
      if (metodo === 'POST' && ruta === RUTA_ENCUESTA && falla) throw new TypeError('Network request failed');
      return { id: 'r1' };
    });

    const primero = armarCuerpo(s);
    s = reducirEncuesta(s, { tipo: 'guardando' });
    expect(etiquetaPrincipal(s)).toBe('Guardando…');
    expect(puedeSeguir(s)).toBe(false);
    await enviarEncuesta(api, primero).catch((e) => {
      s = reducirEncuesta(s, falloDeEncuesta(e));
    });
    expect(s.errorGuardar).toBe(true);
    expect(s.guardando).toBe(false);
    expect(etiquetaPrincipal(s)).toBe('Reintentar');
    expect(s.r.experiencia).toBe('uno_a_tres_anos');

    falla = false;
    const segundo = armarCuerpo(s);
    await enviarEncuesta(api, segundo);
    expect(llamadas.map((l) => l.cuerpo)).toEqual([primero, primero]);
    expect(segundo).toEqual(primero);
  });

  it('INT-021 · el cuerpo sigue esquemaEncuestaEntrada: 10 respuestas, consentimiento, política y peso en kilos', () => {
    const s = correr([...HASTA_CODIGO, { tipo: 'codigo', valor: 'k7p2qx' }]);
    const conCodigo = reducirEncuesta(s, {
      tipo: 'codigoComprobado',
      codigo: 'K7P2QX',
      resultado: { tipo: 'valido', entrenador: { nombre: 'Camila', apellido: 'Rojas' } },
    });
    const fin = correr([sig, { tipo: 'consentir' }], conCodigo);
    // CON-012: el cuerpo pasa el esquema estricto de la API tal cual.
    expect(esquemaEncuestaEntrada.safeParse(armarCuerpo(fin)).success).toBe(true);
    expect(armarCuerpo(fin)).toEqual({
      consentimiento_salud: true,
      politica_version: '1',
      respuestas: {
        objetivo: 'ganar_masa',
        experiencia: 'uno_a_tres_anos',
        dias_semana: 4,
        lugar: 'gimnasio_completo',
        minutos_sesion: 60,
        fecha_nacimiento: '1997-03-12',
        altura_cm: 165,
        peso_kg: 63.4,
        lesiones: { zonas: ['hombro'], texto: 'Hombro derecho, leve.' },
        codigo_entrenador: 'K7P2QX',
      },
    });
  });

  it('APP-014 · editar desde el resumen vuelve al resumen con «Listo» y la barra completa', () => {
    const fin = correr([...HASTA_CODIGO, sig]);
    const editando = reducirEncuesta(fin, { tipo: 'editar', i: 2 });
    expect(editando.n).toBe(2);
    expect(etiquetaPrincipal(editando)).toBe('Listo');
    expect(segmentosHechos(editando)).toBe(10);
    const vuelta = correr([{ tipo: 'elegir', valor: 3 }, sig], editando);
    expect(vuelta.n).toBe(FINAL);
    expect(vuelta.r.dias).toBe(3);
  });

  it('INT-022 · si la API rechaza el código al guardar, vuelve a la pregunta 10 con el error', () => {
    const fin = correr([...HASTA_CODIGO, sig, { tipo: 'consentir' }, { tipo: 'guardando' }]);
    const s = reducirEncuesta(fin, falloDeEncuesta(new ErrorDeApi(404, 'INVITATION_NOT_FOUND', 'x')));
    expect(s.n).toBe(9);
    expect(s.codigo).toEqual({ tipo: 'error', mensaje: MENSAJE_CODIGO_INVALIDO });
    expect(s.guardando).toBe(false);
    // Un 422 de edad lleva a la fecha.
    const edad = reducirEncuesta(fin, falloDeEncuesta(new ErrorDeApi(422, 'BUSINESS_RULE', 'x', { campo: 'respuestas.fecha_nacimiento' })));
    expect(edad.n).toBe(5);
    expect(edad.err).toBe('Para usar GymTrack necesitas tener 14 años o más.');
  });

  it('INT-033 · vincular con el código después de guardar; «ya vinculado» cuenta como hecho', async () => {
    const ok = llamadorFalso(() => ({ vinculado: true }));
    expect(await vincular(ok.api, 'K7P2QX')).toBe('vinculado');
    expect(ok.llamadas[0]).toEqual({ metodo: 'POST', ruta: '/v1/me/trainer/link', cuerpo: { codigo: 'K7P2QX' } });
    const ya = llamadorFalso(() => {
      throw new ErrorDeApi(409, 'ALREADY_LINKED', 'x');
    });
    expect(await vincular(ya.api, 'K7P2QX')).toBe('vinculado');
    const usado = llamadorFalso(() => {
      throw new ErrorDeApi(409, 'INVITATION_USED', 'x');
    });
    expect(await vincular(usado.api, 'K7P2QX')).toBe('fallo');
  });

  it('APP-013 · una respuesta vieja de la comprobación no pisa un código nuevo', () => {
    const s = correr([...HASTA_CODIGO, { tipo: 'codigo', valor: 'AAAAAA' }, { tipo: 'codigo', valor: 'K7P2QX' }]);
    const t = reducirEncuesta(s, { tipo: 'codigoComprobado', codigo: 'AAAAAA', resultado: { tipo: 'error', mensaje: 'x' } });
    expect(t.codigo.tipo).toBe('comprobando');
  });
});
