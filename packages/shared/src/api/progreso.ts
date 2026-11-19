// ─────────────────────────────────────────────────────────────────────────────
// Contrato de progreso y sugerencias · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de progreso y sugerencias y su
// catálogo RUTAS_PROGRESO, que la API registra en apps/api/src/modulos/progreso (con esquemaDe y
// urlDe de src/compartido) y que CON-001 revisa:
//   GET /me/progress/exercises/:id  1RM estimado y mejor serie por sesión, 26 semanas (EP-46).
//   GET /me/progress/volume         volumen por semana y variación (EP-47).
//   GET /me/prs                     récords vigentes con la diferencia con el anterior (EP-48).
//   GET y POST /me/body-metrics     peso y medidas, uno por día; tendencia desde el 3.º (EP-49, 50).
//   POST, GET y DELETE /me/photos   fotos privadas con URL firmada de 15 minutos (EP-51 a 53),
//                                   más la subida y la descarga con esa URL (/archivo, públicas
//                                   porque las autoriza la firma, como la descarga del ZIP).
//   GET /clients/:id/suggestions    sugerencias sin usar de la rutina activa (EP-54).
//   PATCH /suggestions/:id          sobrescribir peso o rango, o volver a la calculada (EP-55).
// Las rutas `/me/...` de lectura aceptan `?client_id=` para el entrenador (P-02).
// Reglas: los nombres llevan el área (Progreso, Medida, Foto, Sugerencia) porque index.ts junta
// todo con export *. Campos en snake_case, pesos en kilos (*_kg), fechas con esquemaFechaHora y
// días con esquemaFechaDia. Los cuerpos van con z.strictObject (CON-012).
// Tócalo cuando: agregues o cambies una ruta de progreso, fotos o sugerencias.
// No lo toques para: rutas de otra área (cada una tiene su archivo en esta carpeta) ni para cómo
// se calcula una sugerencia (packages/shared/src/progression.ts).
// Reglas de fondo que revisa la API con la zona del alumno: la fecha de una medida o de una foto
// no puede ser futura ni de hace más de un año (errorFechaRegistro de reglas.ts), y las
// repeticiones de una sugerencia siguen el tope del tipo de carga del ejercicio.
// Depende de: zod, ./comun (DefinicionRuta, paginación, esquemas base) y ./reglas (rangos de las
// medidas y topes de kilos y segundos).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import {
  esquemaFechaDia, esquemaFechaHora, esquemaPagina, esquemaPaginacion, esquemaParamsId, esquemaQueryAlumno, esquemaUuid,
  type CatalogoRutas,
} from './comun';
import { PESO_MAX_KG, RANGOS_MEDIDA, SEGUNDOS_MAX, textoRangoMedida, type CampoRangoMedida } from './reglas';

// ── Reglas ───────────────────────────────────────────────────────────────────
/** §API: el progreso por ejercicio mira las últimas 26 semanas (INT-116). */
export const SEMANAS_PROGRESO_EJERCICIO = 26;
/** INT-118: weeks va de 1 a 52; 8 si no viene. */
export const SEMANAS_VOLUMEN_MIN = 1;
export const SEMANAS_VOLUMEN_MAX = 52;
export const SEMANAS_VOLUMEN_POR_DEFECTO = 8;
/** P-30: la tendencia aparece desde el tercer registro y compara contra hace 30 días. */
export const REGISTROS_PARA_TENDENCIA = 3;
export const DIAS_TENDENCIA = 30;
/** §Seguridad: las URLs de las fotos valen 15 minutos. */
export const DURACION_URL_FOTO_MS = 15 * 60_000;
/** La app comprime a 1600 px (§Arquitectura): 10 MB alcanza de sobra. */
export const BYTES_MAX_FOTO = 10 * 1024 * 1024;
export const TIPOS_FOTO = ['frente', 'lado', 'espalda'] as const;
export const CONTENIDOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const TIPOS_MARCA_PROGRESO = ['e1rm', 'reps', 'tiempo'] as const;
export const TIPOS_RECORD_PROGRESO = ['peso_max', 'e1rm', 'reps_con_peso', 'volumen_sesion', 'reps', 'tiempo'] as const;
export const ESTADOS_SUGERENCIA = ['pendiente', 'aplicada', 'sobrescrita'] as const;

// ── Piezas ───────────────────────────────────────────────────────────────────
/**
 * Un campo de medida con su rango posible (RANGOS_MEDIDA). null es «no lo medí»: lo mismo que no
 * mandarlo (la app instalada manda null en lo que no se midió).
 */
const medida = (campo: CampoRangoMedida) =>
  z
    .number({ error: `${RANGOS_MEDIDA[campo].nombre} tiene que ser un número.` })
    .min(RANGOS_MEDIDA[campo].min, { error: textoRangoMedida(campo) })
    .max(RANGOS_MEDIDA[campo].max, { error: textoRangoMedida(campo) })
    .nullable()
    .optional();

/** Query de las lecturas `/me/...` con el `?client_id=` del entrenador (P-02). */
export const esquemaQueryProgreso = esquemaQueryAlumno;

// ── GET /me/progress/exercises/:id ───────────────────────────────────────────
export const esquemaSerieProgreso = z.object({
  peso_kg: z.number(),
  reps: z.number().int(),
  rir: z.number().int().nullable(),
});

export const esquemaPuntoProgreso = z.object({
  session_id: esquemaUuid,
  fecha: esquemaFechaHora,
  /** 1RM estimado con Epley de la mejor serie; null sobre 12 reps, en peso corporal o en tiempo. */
  e1rm: z.number().nullable(),
  /** La marca con que se compara (1RM sin tope, repeticiones o segundos; P-09). */
  marca: z.number(),
  mejor_serie: esquemaSerieProgreso,
  volumen_kg: z.number(),
  series: z.number().int(),
});

export const esquemaProgresoEjercicio = z.object({
  exercise_id: esquemaUuid,
  nombre: z.string(),
  tipo_carga: z.enum(['kg', 'peso_corporal', 'tiempo']),
  tipo_marca: z.enum(TIPOS_MARCA_PROGRESO),
  /** Desde cuándo se cuenta (26 semanas antes de ahora). */
  desde: esquemaFechaHora,
  /** Un punto por sesión cerrada, de la más antigua a la más nueva. */
  puntos: z.array(esquemaPuntoProgreso),
  /** La mejor marca del período, o null sin puntos. */
  mejor: esquemaPuntoProgreso.nullable(),
});

// ── GET /me/progress/volume ──────────────────────────────────────────────────
export const esquemaQueryVolumen = esquemaQueryAlumno.extend({
  weeks: z.coerce
    .number({ error: 'weeks tiene que ser un número.' })
    .int({ error: 'weeks tiene que ser un entero.' })
    .min(SEMANAS_VOLUMEN_MIN, { error: 'weeks va de 1 a 52.' })
    .max(SEMANAS_VOLUMEN_MAX, { error: 'weeks va de 1 a 52.' })
    .default(SEMANAS_VOLUMEN_POR_DEFECTO),
});

export const esquemaSemanaVolumen = z.object({
  /** Lunes de la semana, en la zona del alumno. */
  inicio: esquemaFechaDia,
  /** Domingo de la semana. */
  fin: esquemaFechaDia,
  volumen_kg: z.number(),
  sesiones: z.number().int(),
  /** Porcentaje frente a la semana anterior, a una decimal; null si la anterior fue 0 o es la primera. */
  variacion_pct: z.number().nullable(),
  /** true para la semana que va en curso. */
  en_curso: z.boolean(),
});

export const esquemaVolumenProgreso = z.object({
  timezone: z.string(),
  weeks: z.number().int(),
  /** De la más antigua a la en curso. */
  semanas: z.array(esquemaSemanaVolumen),
});

// ── GET /me/prs ──────────────────────────────────────────────────────────────
export const esquemaRecordProgreso = z.object({
  id: esquemaUuid,
  exercise_id: esquemaUuid,
  nombre: z.string(),
  tipo: z.enum(TIPOS_RECORD_PROGRESO),
  valor: z.number(),
  fecha: esquemaFechaHora,
  session_id: esquemaUuid.nullable(),
  set_id: esquemaUuid.nullable(),
  /** El récord que superó, o null si es el primero. */
  anterior: z.number().nullable(),
  /** valor menos anterior, a una decimal; null sin anterior. */
  diferencia: z.number().nullable(),
});

export const esquemaRecordsProgreso = z.object({ items: z.array(esquemaRecordProgreso) });

// ── GET y POST /me/body-metrics ──────────────────────────────────────────────
export const CAMPOS_MEDIDA = ['peso_kg', 'cintura_cm', 'cadera_cm', 'pecho_cm', 'brazo_cm', 'muslo_cm', 'grasa_pct'] as const;
export type CampoMedida = (typeof CAMPOS_MEDIDA)[number];

export const esquemaMedidaEntrada = z
  .strictObject({
    /** El día del registro. Si no viene, sale de medido_at (o de ahora) en la zona del alumno. */
    fecha: esquemaFechaDia.optional(),
    /** Cuándo se midió (ISO con zona). Decide el día cuando no viene `fecha` (INT-121). */
    medido_at: esquemaFechaHora.optional(),
    peso_kg: medida('peso_kg'),
    cintura_cm: medida('cintura_cm'),
    cadera_cm: medida('cadera_cm'),
    pecho_cm: medida('pecho_cm'),
    brazo_cm: medida('brazo_cm'),
    muslo_cm: medida('muslo_cm'),
    grasa_pct: medida('grasa_pct'),
    nota: z.string().trim().max(500, { error: 'La nota puede tener hasta 500 caracteres.' }).nullable().optional(),
  })
  .refine((m) => CAMPOS_MEDIDA.some((c) => m[c] !== undefined && m[c] !== null), {
    error: 'Escribe al menos el peso o una medida.',
    path: ['peso_kg'],
  });

export const esquemaMedidaCorporal = z.object({
  id: esquemaUuid,
  fecha: esquemaFechaDia,
  peso_kg: z.number().nullable(),
  cintura_cm: z.number().nullable(),
  cadera_cm: z.number().nullable(),
  pecho_cm: z.number().nullable(),
  brazo_cm: z.number().nullable(),
  muslo_cm: z.number().nullable(),
  grasa_pct: z.number().nullable(),
  nota: z.string().nullable(),
  updated_at: esquemaFechaHora,
});

/** Cambio a 30 días de un campo (P-30): el último menos el más cercano a 30 días antes. */
export const esquemaTendenciaCampo = z.object({
  actual: z.number(),
  fecha: esquemaFechaDia,
  referencia: z.number(),
  fecha_referencia: esquemaFechaDia,
  cambio: z.number(),
});

export const esquemaTendenciaMedidas = z.object({
  peso_kg: esquemaTendenciaCampo.nullable(),
  cintura_cm: esquemaTendenciaCampo.nullable(),
  cadera_cm: esquemaTendenciaCampo.nullable(),
  pecho_cm: esquemaTendenciaCampo.nullable(),
  brazo_cm: esquemaTendenciaCampo.nullable(),
  muslo_cm: esquemaTendenciaCampo.nullable(),
  grasa_pct: esquemaTendenciaCampo.nullable(),
});

export const esquemaQueryMedidas = esquemaPaginacion.extend({ client_id: esquemaUuid.optional() });

export const esquemaListaMedidas = esquemaPagina(esquemaMedidaCorporal).extend({
  /** null con menos de 3 registros en todos los campos (P-30, INT-120). */
  tendencia: esquemaTendenciaMedidas.nullable(),
});

// ── Fotos ────────────────────────────────────────────────────────────────────
export const esquemaFotoEntrada = z.strictObject({
  tipo: z.enum(TIPOS_FOTO, { error: 'La foto es de frente, lado o espalda.' }),
  /** El día de la foto; si no viene, hoy en la zona del alumno. */
  fecha: esquemaFechaDia.optional(),
  content_type: z.enum(CONTENIDOS_FOTO, { error: 'La foto va en JPEG, PNG o WebP.' }),
  bytes: z
    .number()
    .int()
    .positive({ error: 'La foto está vacía.' })
    .max(BYTES_MAX_FOTO, { error: 'La foto puede pesar hasta 10 MB.' }),
  /** true la primera vez: el alumno acepta guardar sus fotos (Ley 21.719, P-25). */
  consentimiento_fotos: z.literal(true).optional(),
});

export const esquemaUrlFirmadaFoto = z.object({
  url: z.string(),
  metodo: z.enum(['PUT', 'GET']),
  /** Cabeceras que hay que mandar tal cual al subir. */
  headers: z.record(z.string(), z.string()),
  vence_at: esquemaFechaHora,
});

export const esquemaFotoSubida = z.object({
  id: esquemaUuid,
  tipo: z.enum(TIPOS_FOTO),
  fecha: esquemaFechaDia,
  subida: esquemaUrlFirmadaFoto,
  consentimiento_fotos_at: esquemaFechaHora,
});

export const esquemaFoto = z.object({
  id: esquemaUuid,
  tipo: z.enum(TIPOS_FOTO),
  fecha: esquemaFechaDia,
  bytes: z.number().int().nullable(),
  /** URL para verla, vence en 15 minutos o menos (INT-124). */
  url: z.string(),
  vence_at: esquemaFechaHora,
  subida_at: esquemaFechaHora,
});

export const esquemaQueryFotos = esquemaPaginacion.extend({
  client_id: esquemaUuid.optional(),
  tipo: z.enum(TIPOS_FOTO).optional(),
});

/** Sin token o con uno vencido, la API responde 403 (SEG-016), no 400. */
export const esquemaQueryArchivoFoto = z.object({ token: z.string().max(512).optional() });

export const esquemaFotoArchivoConfirmado = z.object({ id: esquemaUuid, bytes: z.number().int(), subida_at: esquemaFechaHora });

export const esquemaFotoBorrada = z.object({ id: esquemaUuid, borrada: z.literal(true) });

// ── Sugerencias ──────────────────────────────────────────────────────────────
export const esquemaValorSugerencia = z.object({
  peso_kg: z.number(),
  reps_min: z.number().int(),
  reps_max: z.number().int(),
  rir: z.number().int().nullable(),
});

export const esquemaValorFinalSugerencia = esquemaValorSugerencia.extend({ nota: z.string().nullable() });

export const esquemaSugerencia = z.object({
  id: esquemaUuid,
  client_id: esquemaUuid,
  routine_exercise_id: esquemaUuid,
  exercise_id: esquemaUuid,
  nombre: z.string(),
  dia: z.object({ id: esquemaUuid, nombre: z.string() }),
  metodo: z.string(),
  estado: z.enum(ESTADOS_SUGERENCIA),
  /** Lo que calculó el motor al cerrar la sesión base. */
  sugerencia: esquemaValorSugerencia,
  texto: z.string(),
  motivo: z.string().nullable(),
  /** Lo que va a precargar la próxima sesión: la sobrescritura o, si no hay, la calculada. */
  vigente: esquemaValorFinalSugerencia,
  valor_final: esquemaValorFinalSugerencia.nullable(),
  sobrescrita_por: z.object({ id: esquemaUuid, nombre: z.string(), apellido: z.string() }).nullable(),
  sobrescrita_at: esquemaFechaHora.nullable(),
  /** Las series de la sesión de la que salió (pantalla 19, «último rendimiento»). */
  ultimo_rendimiento: z
    .object({ session_id: esquemaUuid, fecha: esquemaFechaHora, series: z.array(esquemaSerieProgreso) })
    .nullable(),
  created_at: esquemaFechaHora,
});

export const esquemaListaSugerencias = z.object({ items: z.array(esquemaSugerencia) });

export const esquemaSugerenciaCambio = z.union([
  z.strictObject({
    /** Vuelve a la calculada: estado pendiente, sin valor final (INT-131). */
    restaurar: z.literal(true),
  }),
  z.strictObject({
    peso_kg: z
      .number({ error: 'El peso tiene que ser un número.' })
      .min(0, { error: 'El peso no puede ser negativo.' })
      .max(PESO_MAX_KG, { error: `El peso va hasta ${PESO_MAX_KG} kg.` })
      .optional(),
    /** Repeticiones, o segundos si el ejercicio es de tiempo: la API baja el tope a 60 si no lo es. */
    reps_min: z
      .number({ error: 'Las repeticiones tienen que ser un número.' })
      .int({ error: 'Las repeticiones van enteras.' })
      .min(1, { error: 'Las repeticiones van desde 1.' })
      .max(SEGUNDOS_MAX, { error: `Las repeticiones van hasta ${SEGUNDOS_MAX}.` })
      .optional(),
    reps_max: z
      .number({ error: 'Las repeticiones tienen que ser un número.' })
      .int({ error: 'Las repeticiones van enteras.' })
      .min(1, { error: 'Las repeticiones van desde 1.' })
      .max(SEGUNDOS_MAX, { error: `Las repeticiones van hasta ${SEGUNDOS_MAX}.` })
      .optional(),
    rir: z
      .number({ error: 'El RIR tiene que ser un número.' })
      .int({ error: 'El RIR va entero.' })
      .min(0, { error: 'El RIR va de 0 a 10.' })
      .max(10, { error: 'El RIR va de 0 a 10.' })
      .nullable()
      .optional(),
    nota: z.string().trim().max(300, { error: 'La nota puede tener hasta 300 caracteres.' }).nullable().optional(),
  }),
], { error: 'Manda restaurar: true o los valores que cambias.' });

// ── Catálogo de rutas ────────────────────────────────────────────────────────
export const RUTAS_PROGRESO = {
  progresoEjercicio: {
    metodo: 'GET', ruta: '/v1/me/progress/exercises/:id', publica: false,
    params: esquemaParamsId, query: esquemaQueryProgreso, exito: 200, respuesta: esquemaProgresoEjercicio,
  },
  volumen: {
    metodo: 'GET', ruta: '/v1/me/progress/volume', publica: false,
    query: esquemaQueryVolumen, exito: 200, respuesta: esquemaVolumenProgreso,
  },
  records: {
    metodo: 'GET', ruta: '/v1/me/prs', publica: false,
    query: esquemaQueryProgreso, exito: 200, respuesta: esquemaRecordsProgreso,
  },
  listarMedidas: {
    metodo: 'GET', ruta: '/v1/me/body-metrics', publica: false,
    query: esquemaQueryMedidas, exito: 200, respuesta: esquemaListaMedidas,
  },
  registrarMedida: {
    metodo: 'POST', ruta: '/v1/me/body-metrics', publica: false,
    cuerpo: esquemaMedidaEntrada, exito: 201, respuesta: esquemaMedidaCorporal,
  },
  pedirSubidaFoto: {
    metodo: 'POST', ruta: '/v1/me/photos', publica: false,
    cuerpo: esquemaFotoEntrada, exito: 201, respuesta: esquemaFotoSubida,
  },
  listarFotos: {
    metodo: 'GET', ruta: '/v1/me/photos', publica: false,
    query: esquemaQueryFotos, exito: 200, respuesta: esquemaPagina(esquemaFoto),
  },
  borrarFoto: {
    metodo: 'DELETE', ruta: '/v1/me/photos/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaFotoBorrada,
  },
  /** La subida con la URL firmada (adaptador de disco). El cuerpo es la imagen, sin JSON. */
  subirArchivoFoto: {
    metodo: 'PUT', ruta: '/v1/me/photos/:id/archivo', publica: true,
    params: esquemaParamsId, query: esquemaQueryArchivoFoto, exito: 200, respuesta: esquemaFotoArchivoConfirmado,
  },
  /** La descarga con la URL firmada (adaptador de disco). Responde la imagen. */
  descargarArchivoFoto: {
    metodo: 'GET', ruta: '/v1/me/photos/:id/archivo', publica: true,
    params: esquemaParamsId, query: esquemaQueryArchivoFoto, exito: 200, respuesta: z.any(),
  },
  listarSugerencias: {
    metodo: 'GET', ruta: '/v1/clients/:id/suggestions', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaListaSugerencias,
  },
  cambiarSugerencia: {
    metodo: 'PATCH', ruta: '/v1/suggestions/:id', publica: false,
    params: esquemaParamsId, cuerpo: esquemaSugerenciaCambio, exito: 200, respuesta: esquemaSugerencia,
  },
} as const satisfies CatalogoRutas;
