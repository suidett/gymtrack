// ─────────────────────────────────────────────────────────────────────────────
// Reglas de validación compartidas · Zona: Contrato
//
// Qué hace: las reglas de forma y de fondo que la app y la API tienen que aplicar igual, escritas
// una sola vez y sin base de datos: nombre y apellido (letras, espacios, guiones y apóstrofos),
// contraseña fácil de adivinar o igual al correo, fecha de nacimiento (no futura, de 14 a 100
// años), altura y peso plausibles y que calcen entre sí (IMC), rangos de las medidas del cuerpo,
// fechas de registro (no futuras ni de hace más de un año), y los topes humanos del
// entrenamiento (kilos por serie, repeticiones o segundos según el tipo de carga, series,
// semanas y descanso de una rutina). Los esquemas Zod de cada módulo (cuentas.ts, perfil.ts,
// rutinas.ts, sesiones.ts, progreso.ts) usan estas constantes y funciones; la API las vuelve a
// aplicar donde la regla necesita un dato guardado (el tipo de carga del ejercicio, la zona del
// alumno), y la app las usa para mostrar el error junto al campo antes de enviar.
// Cada función devuelve el mensaje en español de Chile o null si el valor sirve.
// Tócalo cuando: cambie un tope o un mensaje que tienen que decir lo mismo la app y la API.
// No lo toques para: reglas que necesitan la base (correo repetido, código vencido, alumno
// ajeno): esas viven en apps/api/src. Ni para la forma de una ruta (su archivo en esta carpeta).
// Depende de: nada (funciones puras: corren en Node, en Hermes y en el navegador).
// ─────────────────────────────────────────────────────────────────────────────

// ── Personas ─────────────────────────────────────────────────────────────────
/** §Datos: nombre y apellido de 1 a 80 caracteres. */
export const NOMBRE_PERSONA_MAX = 80;

// Letras latinas con tildes, ñ y diéresis (sin \p{L}, que no todos los motores de la app traen).
const LETRAS = 'A-Za-zÀ-ÖØ-öø-ÿĀ-ɏḀ-ỿ';
const FORMA_NOMBRE = new RegExp(`^[${LETRAS}][${LETRAS}\\u0300-\\u036f'’ .-]*$`);
const UNA_LETRA = new RegExp(`[${LETRAS}]`);

/** true si el texto trae al menos una letra (un nombre de ejercicio no puede ser «!!!» ni «123»). */
export const tieneLetra = (texto: string) => UNA_LETRA.test(texto);

/** El error de un nombre o un apellido, o null. Cuenta sin los espacios de los bordes. */
export function errorNombrePersona(texto: string, que: 'nombre' | 'apellido'): string | null {
  const t = texto.trim();
  if (!t) return `Escribe tu ${que}.`;
  if (t.length > NOMBRE_PERSONA_MAX) return `Tu ${que} puede tener hasta ${NOMBRE_PERSONA_MAX} caracteres.`;
  if (!FORMA_NOMBRE.test(t)) return `Tu ${que} solo puede tener letras, espacios, guiones y apóstrofos.`;
  return null;
}

// ── Contraseñas ──────────────────────────────────────────────────────────────
/** Las que primero prueba quien adivina (en minúsculas). Lista corta a propósito. */
const CONTRASENAS_COMUNES = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11223344', '12341234', '00000000', '11111111',
  'password', 'password1', 'contraseña', 'contrasena', 'qwertyui', 'qwerty123', 'asdfghjk', 'abcdefgh',
  'abc12345', 'iloveyou', 'gymtrack', 'gymtrack1', 'teamo123', 'chile123',
]);

export const TEXTO_CONTRASENA_DEBIL = 'Esa contraseña es muy fácil de adivinar. Usa otra.';
export const TEXTO_CONTRASENA_CORREO = 'La contraseña no puede ser tu correo.';

/**
 * El error de una contraseña nueva que cumple el largo pero es fácil de adivinar: todos los
 * caracteres iguales, de la lista de las más usadas, o igual al correo (o a lo que va antes de la
 * @). null si sirve. El largo lo revisa esquemaContrasena (cuentas.ts).
 */
export function errorContrasenaDebil(clave: string, correo?: string | null): string | null {
  const c = clave.toLowerCase();
  if (/^([\s\S])\1+$/.test(clave) || CONTRASENAS_COMUNES.has(c)) return TEXTO_CONTRASENA_DEBIL;
  const e = correo?.trim().toLowerCase();
  if (e && (c === e || c === e.split('@')[0])) return TEXTO_CONTRASENA_CORREO;
  return null;
}

// ── Fechas como texto (AAAA-MM-DD) ───────────────────────────────────────────
const diaUtc = (fecha: string) => {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return Date.UTC(a, m - 1, d);
};

/** La fecha `n` días antes de `fecha` (las dos AAAA-MM-DD). */
export const restarDias = (fecha: string, n: number) => new Date(diaUtc(fecha) - n * 86_400_000).toISOString().slice(0, 10);

/** Años cumplidos a la fecha `hoy` (las dos AAAA-MM-DD). */
export function edadCumplida(nacimiento: string, hoy: string): number {
  const [an, mn, dn] = nacimiento.split('-').map(Number) as [number, number, number];
  const [ah, mh, dh] = hoy.split('-').map(Number) as [number, number, number];
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
}

// ── Encuesta: edad, altura y peso ────────────────────────────────────────────
/** P-13: edad mínima para usar la app (la encuesta lo exige). */
export const EDAD_MINIMA_ENCUESTA = 14;
/** Sobre esto la fecha es casi seguro un error de tipeo (1902 en vez de 2002). */
export const EDAD_MAXIMA_ENCUESTA = 100;
/** Altura sin zapatillas, en centímetros (pregunta 7). */
export const ALTURA_MIN_CM = 120;
export const ALTURA_MAX_CM = 230;
/** Peso corporal en kilos: la pregunta 8, «Registrar peso» y las medidas. */
export const PESO_CORPORAL_MIN_KG = 30;
export const PESO_CORPORAL_MAX_KG = 300;
/** Índice de masa corporal posible: fuera de esto la altura o el peso están mal escritos. */
export const IMC_MIN = 12;
export const IMC_MAX = 70;

export const textoEdadMinima = () => `Para usar GymTrack necesitas tener ${EDAD_MINIMA_ENCUESTA} años o más.`;

/** El error de la fecha de nacimiento (AAAA-MM-DD) a la fecha `hoy` en la zona de la persona. */
export function errorFechaNacimiento(nacimiento: string, hoy: string): string | null {
  if (nacimiento > hoy) return 'La fecha de nacimiento no puede ser futura.';
  const edad = edadCumplida(nacimiento, hoy);
  if (edad < EDAD_MINIMA_ENCUESTA) return textoEdadMinima();
  if (edad > EDAD_MAXIMA_ENCUESTA) return `Revisa el año: la edad máxima es ${EDAD_MAXIMA_ENCUESTA} años.`;
  return null;
}

/** IMC a una decimal: peso / altura² (altura en metros). */
export const imc = (alturaCm: number, pesoKg: number) => Math.round((pesoKg / (alturaCm / 100) ** 2) * 10) / 10;

/** El error si la altura y el peso, juntos, no pueden ser de una persona (IMC fuera de 12 a 70). */
export function errorImc(alturaCm: number, pesoKg: number): string | null {
  const v = imc(alturaCm, pesoKg);
  if (v < IMC_MIN || v > IMC_MAX) return 'Revisa tu altura y tu peso: juntos no calzan.';
  return null;
}

// ── Peso y medidas del cuerpo ────────────────────────────────────────────────
/** Rango posible de cada campo de POST /me/body-metrics, con su nombre y unidad para el mensaje. */
export const RANGOS_MEDIDA = {
  peso_kg: { min: PESO_CORPORAL_MIN_KG, max: PESO_CORPORAL_MAX_KG, nombre: 'El peso', unidad: 'kg' },
  cintura_cm: { min: 40, max: 250, nombre: 'La cintura', unidad: 'cm' },
  cadera_cm: { min: 50, max: 250, nombre: 'La cadera', unidad: 'cm' },
  pecho_cm: { min: 50, max: 250, nombre: 'El pecho', unidad: 'cm' },
  brazo_cm: { min: 15, max: 80, nombre: 'El brazo', unidad: 'cm' },
  muslo_cm: { min: 25, max: 120, nombre: 'El muslo', unidad: 'cm' },
  grasa_pct: { min: 3, max: 70, nombre: 'La grasa', unidad: '%' },
} as const;

export type CampoRangoMedida = keyof typeof RANGOS_MEDIDA;

/** «La cintura va de 40 a 250 cm.» */
export function textoRangoMedida(campo: CampoRangoMedida): string {
  const r = RANGOS_MEDIDA[campo];
  return `${r.nombre} va de ${r.min} a ${r.max} ${r.unidad}.`;
}

/** El error de un valor de medida, o null si está dentro de su rango. */
export function errorMedida(campo: CampoRangoMedida, valor: number): string | null {
  const r = RANGOS_MEDIDA[campo];
  return Number.isFinite(valor) && valor >= r.min && valor <= r.max ? null : textoRangoMedida(campo);
}

/** Peso, medidas y fotos se registran hasta un año atrás. */
export const DIAS_ATRAS_REGISTRO = 365;

/** El error de la fecha de un registro (AAAA-MM-DD) frente a `hoy` en la zona del alumno. */
export function errorFechaRegistro(fecha: string, hoy: string): string | null {
  if (fecha > hoy) return 'La fecha no puede ser futura.';
  if (fecha < restarDias(hoy, DIAS_ATRAS_REGISTRO)) return 'La fecha puede ser de hasta un año atrás.';
  return null;
}

// ── Entrenamiento ────────────────────────────────────────────────────────────
/** Kilos de una serie, de la carga inicial de una rutina o de una sugerencia (incluye prensa). */
export const PESO_MAX_KG = 500;
/** Repeticiones de una serie o del objetivo de una rutina, en ejercicios con carga o con el cuerpo. */
export const REPS_MAX = 60;
/** En los ejercicios de tiempo la «repetición» son segundos: hasta 10 minutos. */
export const SEGUNDOS_MAX = 600;
/** Series de un ejercicio en una rutina. */
export const SERIES_MAX = 10;
/** Cuánto dura una rutina antes de cambiarla. */
export const SEMANAS_MAX = 24;
/** Descanso entre series que se puede fijar en una rutina (10 minutos). */
export const DESCANSO_RUTINA_MAX_S = 600;
/** Días de una rutina y ejercicios por día. */
export const DIAS_RUTINA_MAX = 14;
export const EJERCICIOS_POR_DIA_MAX = 30;
/** Largo del nombre de un día («Pierna A»). */
export const NOMBRE_DIA_MAX = 40;

/** El tope de la «repetición» según cómo se registra el ejercicio. */
export const maxRepsSegun = (tipoCarga: string) => (tipoCarga === 'tiempo' ? SEGUNDOS_MAX : REPS_MAX);

/** El error de unas repeticiones (o segundos) para ese tipo de carga, o null. */
export function errorRepsSegun(tipoCarga: string, reps: number): string | null {
  if (tipoCarga === 'tiempo') return reps > SEGUNDOS_MAX ? `Un ejercicio de tiempo va hasta ${SEGUNDOS_MAX} segundos.` : null;
  return reps > REPS_MAX ? `Las repeticiones van hasta ${REPS_MAX} por serie.` : null;
}

/** Nombre de día o de ejercicio comparable: sin tildes, sin mayúsculas y sin espacios de más. */
export const claveTexto = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Nombres de los días de la semana ISO (1 lunes a 7 domingo), para los mensajes. */
export const NOMBRES_DIA_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

/**
 * Los problemas de los días de una rutina que no necesitan la base: dos días con el mismo nombre
 * o fijados al mismo día de la semana. Devuelve la posición del día repetido (el segundo), el
 * campo y el mensaje. La API lo revisa en el esquema (400) y la app antes de guardar.
 */
export function erroresDiasRutina(
  dias: readonly { nombre: string; dia_semana?: number | null }[],
): { dia: number; campo: 'nombre' | 'dia_semana'; mensaje: string }[] {
  const errores: { dia: number; campo: 'nombre' | 'dia_semana'; mensaje: string }[] = [];
  const nombres = new Map<string, number>();
  const semana = new Map<number, number>();
  dias.forEach((d, i) => {
    const clave = claveTexto(d.nombre);
    if (clave) {
      if (nombres.has(clave)) errores.push({ dia: i, campo: 'nombre', mensaje: 'Ya hay otro día con ese nombre.' });
      else nombres.set(clave, i);
    }
    if (typeof d.dia_semana === 'number') {
      if (semana.has(d.dia_semana)) {
        errores.push({ dia: i, campo: 'dia_semana', mensaje: `Ya hay otro día el ${NOMBRES_DIA_SEMANA[d.dia_semana - 1] ?? 'mismo día'}.` });
      } else semana.set(d.dia_semana, i);
    }
  });
  return errores;
}
