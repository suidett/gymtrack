// ─────────────────────────────────────────────────────────────────────────────
// Textos de los avisos · Zona: Notificaciones (API)
//
// Qué hace: arma el título, el cuerpo y la pantalla que abre cada push, y el correo de las alertas
// al entrenador, en español de Chile con tuteo. El correo usa el mismo marco con la marca que la
// bienvenida y la recuperación (src/correo/plantillas.ts) y escapa todo lo que viene de un usuario.
// Privacidad (Ley 21.719): el push se ve en la pantalla bloqueada y pasa por Google o Apple, así
// que lo que escribe el alumno (sus observaciones) no va en el push: solo que dejó una y sobre qué.
// Lo que escribe el entrenador sí va, cortado, porque es para el alumno y es lo que quiere leer.
// Tócalo cuando: cambie un texto o la pantalla que abre un aviso.
// No lo toques para: cuándo sale un aviso ni a quién (./eventos.ts).
// Depende de: src/correo/plantillas.ts (marco, botón, escapar) y ./proveedores (MensajePush).
// ─────────────────────────────────────────────────────────────────────────────
import { boton, escaparHtml, marco } from '../../correo/plantillas';
import type { MensajePush } from './proveedores';

export interface Persona {
  nombre: string;
  apellido?: string;
}

export interface AlertaParaAviso {
  tipo: 'estancamiento' | 'baja_rendimiento' | 'sin_sesiones' | 'dolor';
  ejercicio: string | null;
  detalle: Record<string, unknown>;
}

export interface CorreoAviso {
  asunto: string;
  html: string;
  texto: string;
}

const HORA = 3600;
const DIA = 24 * HORA;

/** Corta en la última palabra que cabe y agrega «...». */
export function cortar(texto: string, maximo: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo - 3);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > maximo / 2 ? corte.slice(0, espacio) : corte).trimEnd()}...`;
}

const ZONAS: Record<string, string> = { espalda_baja: 'espalda baja', muneca: 'muñeca' };
export const zonaLegible = (zona: unknown) => (typeof zona === 'string' && zona ? ZONAS[zona] ?? zona.replace(/_/g, ' ') : null);

const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pct = (v: unknown) => {
  const n = numero(v);
  return n === null ? null : `${String(Math.round(n * 10) / 10).replace('.', ',')} %`;
};

/** Una línea por alerta, para el push y el correo. */
export function describirAlerta(a: AlertaParaAviso): string {
  const sobre = a.ejercicio ? ` en ${a.ejercicio}` : '';
  switch (a.tipo) {
    case 'estancamiento': {
      const n = Array.isArray(a.detalle.sesiones) ? a.detalle.sesiones.length : null;
      return `Estancamiento${sobre}${n ? `: ${n} sesiones sin superar su mejor marca` : ''}.`;
    }
    case 'baja_rendimiento': {
      const caida = pct(a.detalle.caida_pct);
      const que = a.detalle.medida === 'volumen' ? 'El volumen de la sesión' : `Su marca${sobre}`;
      return `${a.ejercicio || a.detalle.medida === 'volumen' ? que : 'Su rendimiento'} bajó${caida ? ` ${caida}` : ''} frente a las 4 semanas anteriores.`;
    }
    case 'dolor': {
      const zona = zonaLegible(a.detalle.zona);
      const intensidad = numero(a.detalle.intensidad);
      return `Dolor${intensidad ? ` ${intensidad} de 10` : ' fuerte'}${zona ? ` en ${zona}` : ''}${sobre}.`;
    }
    case 'sin_sesiones': {
      const dias = numero(a.detalle.dias);
      return `Lleva ${dias ?? 'varios'} días sin entrenar.`;
    }
  }
}

function correoDeAlertas(entrenador: Persona, alumnos: { alumno: Persona; alertas: AlertaParaAviso[] }[], urlApp: string | null, asunto: string): CorreoAviso {
  const bloquesTexto = alumnos.flatMap(({ alumno, alertas }) => [
    `${alumno.nombre} ${alumno.apellido ?? ''}`.trim(),
    ...alertas.map((a) => `- ${describirAlerta(a)}`),
    '',
  ]);
  const enlace = urlApp ? `${urlApp}/entrenador/alertas` : null;
  const texto = [
    `Hola, ${entrenador.nombre}:`,
    '',
    ...bloquesTexto,
    enlace ? `Revísalas en Alertas: ${enlace}` : 'Revísalas en Alertas, en la app.',
    '',
    'Para no llenarte de avisos, el celular recibe hasta 2 al día; los demás quedan en Alertas.',
    '',
    'El equipo de GymTrack',
  ].join('\n');
  const bloquesHtml = alumnos.map(({ alumno, alertas }) => `
          <p style="margin:16px 0 6px 0;font-weight:700;">${escaparHtml(`${alumno.nombre} ${alumno.apellido ?? ''}`.trim())}</p>
          <ul style="margin:0 0 8px 0;padding-left:20px;">${alertas.map((a) => `<li>${escaparHtml(describirAlerta(a))}</li>`).join('')}</ul>`).join('');
  const html = marco(asunto, `
          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px 0;">Hola, ${escaparHtml(entrenador.nombre)}</h1>
          ${bloquesHtml}
          ${enlace ? boton('Abrir Alertas', enlace) : '<p style="margin:16px 0 0 0;">Revísalas en Alertas, en la app.</p>'}
          <p style="margin:16px 0 0 0;font-size:14px;">Para no llenarte de avisos, el celular recibe hasta 2 al día; los demás quedan en Alertas.</p>`);
  return { asunto, html, texto };
}

// ── Al entrenador ────────────────────────────────────────────────────────────
/** Lo que dejó el cierre de una sesión (estancamiento, baja, dolor general) o un dolor fuerte. */
export function avisoAlertas(d: { entrenador: Persona; alumno: Persona; alumnoId: string; alertas: AlertaParaAviso[]; urlApp: string | null }) {
  const [primera] = d.alertas;
  const hayDolor = d.alertas.some((a) => a.tipo === 'dolor');
  let titulo: string;
  if (d.alertas.length > 1) titulo = `${d.alumno.nombre} tiene ${d.alertas.length} alertas nuevas`;
  else if (primera!.tipo === 'dolor') titulo = `Dolor fuerte de ${d.alumno.nombre}`;
  else if (primera!.tipo === 'estancamiento') titulo = `${d.alumno.nombre} se estancó${primera!.ejercicio ? ` en ${primera!.ejercicio}` : ''}`;
  else if (primera!.tipo === 'baja_rendimiento') titulo = `${d.alumno.nombre} bajó su rendimiento`;
  else titulo = `${d.alumno.nombre} lleva días sin entrenar`;
  const cuerpo = d.alertas.length > 1
    ? cortar(d.alertas.map(describirAlerta).join(' '), 160)
    : `${describirAlerta(primera!)} Toca para revisarla.`;
  const push: MensajePush = {
    titulo, cuerpo, datos: { tipo: hayDolor ? 'dolor' : 'alerta', url: '/entrenador/alertas' }, vigenciaS: DIA, urgente: hayDolor,
  };
  const asunto = hayDolor ? `${d.alumno.nombre} reportó un dolor fuerte` : d.alertas.length > 1 ? titulo : `${d.alumno.nombre} tiene una alerta nueva`;
  return { push, correo: correoDeAlertas(d.entrenador, [{ alumno: d.alumno, alertas: d.alertas }], d.urlApp, asunto) };
}

/** El resumen de la corrida de la noche: un solo correo por entrenador con todo lo nuevo. */
export function correoAlertasDeLaNoche(entrenador: Persona, alumnos: { alumno: Persona; alertas: AlertaParaAviso[] }[], urlApp: string | null): CorreoAviso {
  const total = alumnos.reduce((n, a) => n + a.alertas.length, 0);
  const asunto = total === 1 ? `${alumnos[0]!.alumno.nombre} tiene una alerta nueva` : `Tienes ${total} alertas nuevas de tus alumnos`;
  return correoDeAlertas(entrenador, alumnos, urlApp, asunto);
}

/** El alumno dejó una observación (no un dolor fuerte): solo push, sin el texto (INT-150). */
export function avisoObservacionDelAlumno(d: { alumno: Persona; alumnoId: string; sobre: string | null }): MensajePush {
  return {
    titulo: `${d.alumno.nombre} dejó una observación`,
    cuerpo: d.sobre ? `Sobre ${d.sobre}. Toca para verla en su ficha.` : 'Toca para verla en su ficha.',
    datos: { tipo: 'observacion', url: `/cliente/${d.alumnoId}` },
    vigenciaS: DIA,
    urgente: false,
  };
}

// ── Al alumno ────────────────────────────────────────────────────────────────
/** El entrenador le respondió o le dejó un consejo (P-41). */
export function avisoObservacionDelEntrenador(d: { entrenador: Persona; tipo: 'observacion' | 'consejo' | 'dolor'; texto: string; sobre: string | null }): MensajePush {
  const titulo = d.tipo === 'consejo'
    ? `${d.entrenador.nombre} te dejó un consejo`
    : `${d.entrenador.nombre} te respondió${d.sobre ? ` sobre ${d.sobre}` : ''}`;
  return { titulo, cuerpo: cortar(d.texto, 140), datos: { tipo: d.tipo === 'consejo' ? 'consejo' : 'observacion', url: '/' }, vigenciaS: 3 * DIA, urgente: false };
}

export function avisoRutina(d: { entrenador: Persona; rutina: string; rutinaId: string; accion: 'asignada' | 'activada' | 'asignada_activa' }): MensajePush {
  const nombre = `«${cortar(d.rutina, 60)}»`;
  const titulo = d.accion === 'activada' ? `Tu rutina ${nombre} quedó activa` : `${d.entrenador.nombre} te asignó una rutina`;
  const cuerpo = d.accion === 'asignada'
    ? `${nombre} ya está en Rutinas. Cuando quede activa, aparece en Hoy.`
    : d.accion === 'asignada_activa'
      ? `${nombre} ya está activa: la ves en Hoy.`
      : `${d.entrenador.nombre} la activó: la ves en Hoy.`;
  return { titulo, cuerpo, datos: { tipo: 'rutina', url: d.accion === 'asignada' ? `/rutina/${d.rutinaId}` : '/' }, vigenciaS: 3 * DIA, urgente: false };
}

/** 30 minutos antes de la hora habitual (P-21). Vale media hora: después ya no sirve. */
export function avisoRecordatorio(d: { hora: string; dia: string | null }): MensajePush {
  return {
    titulo: d.dia ? `Hoy toca ${cortar(d.dia, 60)}` : 'Hoy toca entrenar',
    cuerpo: `Tu hora habitual es a las ${d.hora}: quedan 30 minutos.`,
    datos: { tipo: 'recordatorio', url: '/' },
    vigenciaS: 30 * 60,
    urgente: false,
  };
}

// ── Prueba ───────────────────────────────────────────────────────────────────
export function avisoPrueba(): MensajePush {
  return {
    titulo: 'Prueba de avisos',
    cuerpo: 'Si ves esto, los avisos de GymTrack llegan a este teléfono.',
    datos: { tipo: 'prueba', url: '/' },
    vigenciaS: HORA,
    urgente: true,
  };
}

export function correoPrueba(persona: Persona, urlApp: string | null): CorreoAviso {
  const asunto = 'Prueba de avisos de GymTrack';
  const texto = [
    `Hola, ${persona.nombre}:`,
    '',
    'Este es el correo de prueba de los avisos. Si te llegó, el envío por correo funciona.',
    urlApp ? `La app: ${urlApp}` : '',
    '',
    'El equipo de GymTrack',
  ].filter((l, i, t) => l !== '' || t[i - 1] !== '').join('\n');
  const html = marco(asunto, `
          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px 0;">Hola, ${escaparHtml(persona.nombre)}</h1>
          <p style="margin:0 0 12px 0;">Este es el correo de prueba de los avisos. Si te llegó, el envío por correo funciona.</p>
          ${urlApp ? boton('Abrir GymTrack', urlApp) : ''}`);
  return { asunto, html, texto };
}
