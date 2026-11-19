// ─────────────────────────────────────────────────────────────────────────────
// Contrato de perfil · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de perfil y cuenta y su catálogo
// RUTAS_PERFIL, que la API registra en apps/api/src/modulos/perfil (con esquemaDe y urlDe de
// src/compartido) y que CON-001 revisa:
//   PATCH /me, POST y GET /me/survey (10 preguntas, versión y fecha), POST /me/push-tokens,
//   GET /me/export (URL firmada de 15 minutos) y la descarga del ZIP, DELETE /me (borrado lógico,
//   purga a los 30 días), POST y GET /trainer/invitations (código de 6 caracteres que vence en 7
//   días; pedir otro invalida el anterior, P-14), POST /me/trainer/link y DELETE /me/trainer.
// GET /me sigue en cuentas.ts.
// Reglas: los nombres que exportas no pueden repetir los de otro archivo del paquete (index.ts
// los junta con export *); por eso cada esquema lleva el área en el nombre. Campos en
// snake_case, pesos en kilos (*_kg), fechas con esquemaFechaHora. Los cuerpos van con
// z.strictObject (CON-012).
// Tócalo cuando: agregues o cambies una ruta de perfil, una pregunta de la encuesta o la forma
// del código de invitación.
// No lo toques para: rutas de otra área (cada una tiene su archivo en esta carpeta).
// Depende de: zod, ./comun (DefinicionRuta, esquemas base), ./cuentas (esquemaPerfilUsuario,
// esquemaNombrePersona, UNIDADES) y ./reglas (rangos de altura y peso).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { esquemaFechaDia, esquemaFechaHora, esquemaUuid, type CatalogoRutas } from './comun';
import { esquemaNombrePersona, esquemaPerfilUsuario, UNIDADES } from './cuentas';
import { ALTURA_MAX_CM, ALTURA_MIN_CM, PESO_CORPORAL_MAX_KG, PESO_CORPORAL_MIN_KG } from './reglas';

// ── Reglas de los campos ─────────────────────────────────────────────────────
/** §Pantallas, Perfil: el descanso va de 30 s a 5 minutos (INT-020). */
export const DESCANSO_MIN_S = 30;
export const DESCANSO_MAX_S = 300;
/** P-12: versión del cuestionario (no el número de respuesta). */
export const VERSION_ENCUESTA = 1;
/** §Datos: el código dura 7 días. */
export const DURACION_INVITACION_MS = 7 * 86_400_000;
/** P-14: 6 caracteres sin 0, O, 1 ni I (no se confunden al dictarlos). */
export const ALFABETO_INVITACION = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LARGO_INVITACION = 6;
/** SEG-027: la URL del ZIP vence a los 15 minutos. */
export const DURACION_EXPORTACION_MS = 15 * 60_000;
/** §Datos: la cuenta borrada se purga a los 30 días. */
export const DIAS_PURGA_CUENTA = 30;

/** true si el texto es una zona horaria IANA que el motor conoce (`America/Santiago`). */
export function esZonaHorariaValida(zona: string): boolean {
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(zona) && zona !== 'UTC') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/** El código como lo guarda la base: sin espacios y en mayúsculas (`k7p2qx` sirve igual, P-14). */
export const normalizarCodigoInvitacion = (codigo: string) => codigo.replace(/\s+/g, '').toUpperCase();

export const esquemaZonaHoraria = z
  .string({ error: 'La zona horaria va como texto, por ejemplo America/Santiago.' })
  .max(64, { error: 'Esa zona horaria no existe.' })
  .refine(esZonaHorariaValida, { error: 'Esa zona horaria no existe.' });

export const esquemaCodigoInvitacion = z
  .string({ error: 'Escribe el código de tu entrenador.' })
  .transform(normalizarCodigoInvitacion)
  .pipe(z.string().regex(/^[A-Z0-9]{6}$/, { error: 'El código tiene 6 letras y números.' }));

// ── PATCH /me ────────────────────────────────────────────────────────────────
// El rol y el correo no están: mandarlos da 400 (INT-020, SEG-012). Un cuerpo vacío también: no
// hay nada que cambiar. El esquema de la respuesta (esquemaPerfilUsuario) vive en cuentas.ts
// porque GET /me usa el mismo.
export const esquemaPerfilCambios = z
  .strictObject({
    nombre: esquemaNombrePersona('nombre').optional(),
    apellido: esquemaNombrePersona('apellido').optional(),
    timezone: esquemaZonaHoraria.optional(),
    unidades: z.enum(UNIDADES, { error: 'Las unidades van como kg o lb.' }).optional(),
    descanso_default_s: z
      .number({ error: 'El descanso va en segundos.' })
      .int({ error: 'El descanso va en segundos enteros.' })
      .min(DESCANSO_MIN_S, { error: 'El mínimo es 30 segundos.' })
      .max(DESCANSO_MAX_S, { error: 'El máximo es 5 minutos.' })
      .optional(),
    modo_gimnasio: z.boolean({ error: 'modo_gimnasio va como true o false.' }).optional(),
    /** Solo alumno: recordatorio para entrenar (CU-51). */
    recordatorio_activo: z.boolean({ error: 'recordatorio_activo va como true o false.' }).optional(),
    /** Solo alumno: hora habitual «HH:MM» en su zona; null vuelve al cálculo automático (P-21). */
    recordatorio_hora: z
      .string({ error: 'La hora va como HH:MM.' })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'La hora va como HH:MM, de 00:00 a 23:59.' })
      .nullable()
      .optional(),
  })
  .refine((c) => Object.values(c).some((v) => v !== undefined), { error: 'Manda al menos un campo para cambiar.' });

// ── Encuesta (POST y GET /me/survey) ─────────────────────────────────────────
// §Pantallas, «Las 10 preguntas de la encuesta». Los valores van en snake_case; los textos que se
// muestran los pone la app.
export const OBJETIVOS_ENCUESTA = ['ganar_masa', 'bajar_grasa', 'salud_general', 'mantenerme_activo'] as const;
export const EXPERIENCIAS_ENCUESTA = ['nunca', 'menos_de_un_ano', 'uno_a_tres_anos', 'mas_de_tres_anos'] as const;
export const LUGARES_ENCUESTA = ['gimnasio_completo', 'gimnasio_basico', 'casa_mancuernas', 'peso_corporal'] as const;
export const MINUTOS_ENCUESTA = [30, 45, 60, 90] as const;
export const LESIONES_ENCUESTA = ['hombro', 'rodilla', 'espalda_baja', 'muneca', 'cadera', 'ninguna'] as const;

export const esquemaEncuestaRespuestas = z.strictObject({
  /** 1. Objetivo principal. */
  objetivo: z.enum(OBJETIVOS_ENCUESTA),
  /** 2. Experiencia entrenando. */
  experiencia: z.enum(EXPERIENCIAS_ENCUESTA),
  /** 3. Días por semana: 2, 3, 4 o 5 (5 es «cinco o más»). */
  dias_semana: z
    .number({ error: 'Elige de 2 a 5 días.' })
    .int({ error: 'Elige de 2 a 5 días.' })
    .min(2, { error: 'Elige de 2 a 5 días.' })
    .max(5, { error: 'Elige de 2 a 5 días.' }),
  /** 4. Dónde entrenas. */
  lugar: z.enum(LUGARES_ENCUESTA),
  /** 5. Minutos por sesión. */
  minutos_sesion: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)], { error: 'Elige 30, 45, 60 o 90 minutos.' }),
  /**
   * 6. Fecha de nacimiento (AAAA-MM-DD). La edad (14 a 100 años, P-13) la revisa la API con el
   * día de hoy en la zona del alumno (422, errorFechaNacimiento de reglas.ts).
   */
  fecha_nacimiento: esquemaFechaDia,
  /** 7. Altura en centímetros. Junto con el peso, el IMC tiene que ser posible (422, errorImc). */
  altura_cm: z
    .number({ error: `Escribe un número entre ${ALTURA_MIN_CM} y ${ALTURA_MAX_CM}.` })
    .min(ALTURA_MIN_CM, { error: `Escribe un número entre ${ALTURA_MIN_CM} y ${ALTURA_MAX_CM}.` })
    .max(ALTURA_MAX_CM, { error: `Escribe un número entre ${ALTURA_MIN_CM} y ${ALTURA_MAX_CM}.` }),
  /** 8. Peso actual en kilos: queda como primer registro de peso corporal. */
  peso_kg: z
    .number({ error: `Escribe un número entre ${PESO_CORPORAL_MIN_KG} y ${PESO_CORPORAL_MAX_KG}.` })
    .min(PESO_CORPORAL_MIN_KG, { error: `Escribe un número entre ${PESO_CORPORAL_MIN_KG} y ${PESO_CORPORAL_MAX_KG}.` })
    .max(PESO_CORPORAL_MAX_KG, { error: `Escribe un número entre ${PESO_CORPORAL_MIN_KG} y ${PESO_CORPORAL_MAX_KG}.` }),
  /** 9. Lesiones o molestias: «ninguna» excluye las demás; más un texto libre. */
  lesiones: z
    .strictObject({
      zonas: z
        .array(z.enum(LESIONES_ENCUESTA, { error: 'Esa zona no está en la lista.' }))
        .min(1, { error: 'Elige al menos una opción.' })
        .max(LESIONES_ENCUESTA.length)
        .refine((zonas) => new Set(zonas).size === zonas.length, { error: 'Cada zona va una sola vez.' }),
      texto: z.string().trim().max(500, { error: 'El detalle puede tener hasta 500 caracteres.' }).optional(),
    })
    .refine((l) => !l.zonas.includes('ninguna') || l.zonas.length === 1, {
      error: '«Ninguna» no va con otras lesiones.',
      path: ['zonas'],
    }),
  /** 10. Código de invitación del entrenador, si tiene uno. */
  codigo_entrenador: esquemaCodigoInvitacion.nullable().optional(),
});

export const esquemaEncuestaEntrada = z.strictObject({
  respuestas: esquemaEncuestaRespuestas,
  /** Casilla propia de consentimiento expreso para datos de salud. Falso o ausente: 422 CONSENT_REQUIRED. */
  consentimiento_salud: z.boolean().optional(),
  /** Versión de la política de privacidad que aceptó (P-25). */
  politica_version: z.string().trim().min(1).max(20).default('1'),
});

export const esquemaEntrenadorResumen = z.object({ id: esquemaUuid, nombre: z.string(), apellido: z.string() });

export const esquemaEncuesta = z.object({
  id: esquemaUuid,
  version: z.number().int(),
  respuestas: esquemaEncuestaRespuestas.omit({ codigo_entrenador: true }),
  completada_at: esquemaFechaHora,
  consentimiento_salud_at: esquemaFechaHora.nullable(),
  politica_version: z.string().nullable(),
  /** El entrenador con vínculo activo después de guardar (por el código de la pregunta 10 o de antes). */
  entrenador: esquemaEntrenadorResumen.nullable(),
});

// ── Push (POST /me/push-tokens) ──────────────────────────────────────────────
export const PLATAFORMAS_PUSH = ['android', 'ios'] as const;

export const esquemaPushTokenEntrada = z.strictObject({
  /** Token de Expo: `ExponentPushToken[...]` o `ExpoPushToken[...]`. */
  token: z
    .string()
    .trim()
    .max(200)
    .regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,}\]$/, { error: 'El token de Expo no tiene el formato esperado.' }),
  plataforma: z.enum(PLATAFORMAS_PUSH),
});

export const esquemaPushToken = z.object({
  id: esquemaUuid,
  plataforma: z.enum(PLATAFORMAS_PUSH),
  created_at: esquemaFechaHora,
});

// ── Exportar (GET /me/export) ────────────────────────────────────────────────
export const NOMBRE_ARCHIVO_EXPORTACION = 'gymtrack-mis-datos.zip' as const;

export const esquemaExportacion = z.object({
  /** URL firmada de un solo archivo ZIP; vence a los 15 minutos (SEG-027). */
  url: z.string(),
  vence_at: esquemaFechaHora,
  nombre_archivo: z.literal(NOMBRE_ARCHIVO_EXPORTACION),
  /** Los CSV que trae el ZIP. */
  archivos: z.array(z.string()),
});

export const esquemaExportacionDescargaQuery = z.object({ token: z.string().min(10).max(512) });
/** La descarga responde el ZIP en binario (`application/zip`); el esquema solo documenta la ruta. */
export const esquemaExportacionDescarga = z.unknown();

// ── Borrar la cuenta (DELETE /me) ────────────────────────────────────────────
export const esquemaCuentaBorrada = z.object({
  borrada: z.literal(true),
  deleted_at: esquemaFechaHora,
  /** Desde esta fecha el worker purga los datos y las fotos. */
  purga_at: esquemaFechaHora,
});

// ── Invitación del entrenador (POST y GET /trainer/invitations) ──────────────
export const esquemaInvitacion = z.object({
  codigo: z.string().length(LARGO_INVITACION),
  vence_at: esquemaFechaHora,
  estado: z.enum(['invitado', 'activo', 'terminado']),
  /** false si ya venció, se usó o se pidió otro. */
  vigente: z.boolean(),
  created_at: esquemaFechaHora,
});

/** El último código que pidió el entrenador (vigente o no), o null si nunca pidió uno. */
export const esquemaInvitacionActual = z.object({ invitacion: esquemaInvitacion.nullable() });

// ── Vínculo del alumno (POST /me/trainer/link y DELETE /me/trainer) ──────────
export const esquemaVinculoEntrada = z.strictObject({
  codigo: esquemaCodigoInvitacion,
  /** true: solo revisa el código y devuelve el entrenador, sin vincular («Vincularme con Camila»). */
  vista_previa: z.boolean().optional(),
});

export const esquemaVinculoResultado = z.object({
  entrenador: esquemaEntrenadorResumen,
  vinculado: z.boolean(),
  aceptado_at: esquemaFechaHora.nullable(),
});

export const esquemaDesvinculo = z.object({
  desvinculado: z.literal(true),
  terminado_at: esquemaFechaHora,
});

export type PerfilCambios = z.input<typeof esquemaPerfilCambios>;
export type PerfilUsuario = z.infer<typeof esquemaPerfilUsuario>;
export type EncuestaEntrada = z.input<typeof esquemaEncuestaEntrada>;
export type EncuestaRespuestas = z.infer<typeof esquemaEncuestaRespuestas>;
export type Encuesta = z.infer<typeof esquemaEncuesta>;
export type Invitacion = z.infer<typeof esquemaInvitacion>;
export type VinculoResultado = z.infer<typeof esquemaVinculoResultado>;
export type Exportacion = z.infer<typeof esquemaExportacion>;
export type CuentaBorrada = z.infer<typeof esquemaCuentaBorrada>;

// ── Catálogo de rutas ────────────────────────────────────────────────────────
export const RUTAS_PERFIL = {
  actualizar: {
    metodo: 'PATCH', ruta: '/v1/me', publica: false,
    cuerpo: esquemaPerfilCambios, exito: 200, respuesta: esquemaPerfilUsuario,
  },
  borrarCuenta: {
    metodo: 'DELETE', ruta: '/v1/me', publica: false,
    exito: 200, respuesta: esquemaCuentaBorrada,
  },
  responderEncuesta: {
    metodo: 'POST', ruta: '/v1/me/survey', publica: false,
    cuerpo: esquemaEncuestaEntrada, exito: 201, respuesta: esquemaEncuesta,
  },
  verEncuesta: {
    metodo: 'GET', ruta: '/v1/me/survey', publica: false,
    exito: 200, respuesta: esquemaEncuesta,
  },
  registrarPush: {
    // 201 si es nuevo; 200 si el mismo token ya estaba (no se duplica, INT-028).
    metodo: 'POST', ruta: '/v1/me/push-tokens', publica: false,
    cuerpo: esquemaPushTokenEntrada, exito: 201, respuesta: esquemaPushToken,
  },
  exportar: {
    metodo: 'GET', ruta: '/v1/me/export', publica: false,
    exito: 200, respuesta: esquemaExportacion,
  },
  descargarExportacion: {
    // Pública: la firma del token es la autorización (como una URL firmada de un bucket).
    metodo: 'GET', ruta: '/v1/me/export/archivo', publica: true,
    query: esquemaExportacionDescargaQuery, exito: 200, respuesta: esquemaExportacionDescarga,
  },
  crearInvitacion: {
    metodo: 'POST', ruta: '/v1/trainer/invitations', publica: false,
    exito: 201, respuesta: esquemaInvitacion,
  },
  verInvitacion: {
    metodo: 'GET', ruta: '/v1/trainer/invitations', publica: false,
    exito: 200, respuesta: esquemaInvitacionActual,
  },
  vincular: {
    metodo: 'POST', ruta: '/v1/me/trainer/link', publica: false,
    cuerpo: esquemaVinculoEntrada, exito: 200, respuesta: esquemaVinculoResultado,
  },
  desvincular: {
    metodo: 'DELETE', ruta: '/v1/me/trainer', publica: false,
    exito: 200, respuesta: esquemaDesvinculo,
  },
} as const satisfies CatalogoRutas;
