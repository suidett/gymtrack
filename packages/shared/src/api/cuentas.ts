// ─────────────────────────────────────────────────────────────────────────────
// Contrato de cuentas y perfil · Zona: Contrato
//
// Qué hace: define una sola vez, en Zod, la entrada y la salida de las rutas de cuentas del PRD
// (§API, «Cuentas y perfil»): registro, ingreso, ingreso con Google, refresh, cierre de sesión,
// recuperación de contraseña y GET /me, más /health. La API valida y serializa con estos esquemas y la app los
// usa en el cliente tipado (cliente.ts), así las dos no se desincronizan (CON-001).
// Los campos van en snake_case, como el PRD (P-49); las fechas en ISO 8601 con zona.
// Tócalo cuando: una de estas rutas cambie de forma. Un cambio aquí cambia la API y la app a la
// vez: si quitas o renombras un campo, la app instalada en los teléfonos deja de entenderlo.
// No lo toques para: reglas que necesitan la base (correo repetido, token vencido): eso vive en
// apps/api/src/cuentas. Ni para los códigos de error (errores.ts).
// Depende de: zod y ./errores (el sobre de error de cada respuesta 4xx).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { esquemaSobreError } from './errores';

// ── Reglas de los campos ─────────────────────────────────────────────────────
// §Seguridad: contraseña de 8 a 128 caracteres. El tope corta antes de calcular el hash, así una
// contraseña de 10.000 caracteres no le cuesta nada al servidor (SEG-002).
export const CONTRASENA_MIN = 8;
export const CONTRASENA_MAX = 128;
export const ROLES = ['trainer', 'client'] as const;
export const UNIDADES = ['kg', 'lb'] as const;

/** Correo: se recorta y se pasa a minúsculas antes de validar, así CAMILA@ y camila@ son el mismo. */
export const esquemaEmail = z
  .string({ error: 'Escribe tu correo.' })
  .trim()
  .toLowerCase()
  .max(254, { error: 'El correo es demasiado largo.' })
  .pipe(z.email({ error: 'Revisa el correo: no tiene el formato nombre@dominio.' }));

export const esquemaContrasena = z
  .string({ error: 'Escribe tu contraseña.' })
  .min(CONTRASENA_MIN, { error: `La contraseña necesita al menos ${CONTRASENA_MIN} caracteres.` })
  .max(CONTRASENA_MAX, { error: `La contraseña puede tener hasta ${CONTRASENA_MAX} caracteres.` });

const esquemaNombre = (que: string) =>
  z
    .string({ error: `Escribe tu ${que}.` })
    .trim()
    .min(1, { error: `Escribe tu ${que}.` })
    .max(80, { error: `Tu ${que} puede tener hasta 80 caracteres.` });

const fechaIso = z.iso.datetime({ offset: true });

// ── Entradas ─────────────────────────────────────────────────────────────────
// Todas son estrictas: un campo de más (`owner_id`, `deleted_at`) da 400 (CON-012, SEG-012).
export const esquemaRegistro = z.strictObject({
  rol: z.enum(ROLES, { error: 'Elige si eres entrenador (trainer) o alumno (client).' }),
  nombre: esquemaNombre('nombre'),
  apellido: esquemaNombre('apellido'),
  email: esquemaEmail,
  password: esquemaContrasena,
});

export const esquemaIngreso = z.strictObject({
  email: esquemaEmail,
  // En el ingreso solo se exige que venga algo y que no pase del tope: una contraseña vieja más
  // corta tiene que dar 401, no 400, para no contar nada de la regla.
  password: z.string({ error: 'Escribe tu contraseña.' }).min(1).max(CONTRASENA_MAX),
});

export const esquemaRefresh = z.strictObject({
  refresh_token: z.string().min(1).max(512),
});

export const esquemaCierreSesion = esquemaRefresh;

export const esquemaOlvideContrasena = z.strictObject({
  email: esquemaEmail,
});

export const esquemaRestablecerContrasena = z.strictObject({
  token: z.string().min(1).max(512),
  password: esquemaContrasena,
});

// ── Salidas ──────────────────────────────────────────────────────────────────
export const esquemaUsuario = z.object({
  id: z.uuid(),
  email: z.string(),
  rol: z.enum(ROLES),
  nombre: z.string(),
  apellido: z.string(),
  timezone: z.string(),
  unidades: z.enum(UNIDADES),
  descanso_default_s: z.number().int(),
  modo_gimnasio: z.boolean(),
  // Llega cuando exista el vínculo entrenador y alumno (fase 1, trainer_clients). Hoy es null.
  entrenador: z.object({ id: z.uuid(), nombre: z.string(), apellido: z.string() }).nullable(),
  // El alumno sin encuesta va a la Encuesta al ingresar; el entrenador nunca (INT-002).
  encuesta_pendiente: z.boolean(),
  created_at: fechaIso,
});

export const esquemaTokens = z.object({
  token_type: z.literal('Bearer'),
  access_token: z.string(),
  access_vence_at: fechaIso,
  refresh_token: z.string(),
  refresh_vence_at: fechaIso,
});

export const esquemaSesion = z.object({ usuario: esquemaUsuario, tokens: esquemaTokens });
export const esquemaRespuestaRefresh = z.object({ tokens: esquemaTokens });
export const esquemaRespuestaCierre = z.object({ cerrada: z.literal(true) });
export const esquemaRespuestaOlvide = z.object({ mensaje: z.string() });
export const esquemaRespuestaRestablecer = z.object({ restablecida: z.literal(true) });
export const esquemaSalud = z.object({
  estado: z.literal('ok'),
  version: z.string(),
  commit: z.string(),
  base: z.literal('ok'),
});

// ── Ingreso con Google ───────────────────────────────────────────────────────
// La app manda el id_token que le dio Google (expo-auth-session). Si el correo ya tiene cuenta,
// entra. Si no, la API responde `falta_rol` con lo que Google sabe de la persona y la app pide un
// segundo envío con el mismo id_token más rol, nombre y apellido, que crean la cuenta. La cuenta
// nueva no tiene contraseña conocida: para entrar con correo la crea con «olvidé mi contraseña».
/** Tope del id_token: un JWT de Google tiene unos 1.200 caracteres; esto corta basura grande. */
export const ID_TOKEN_GOOGLE_MAX = 4096;
/** Tres tramos base64url separados por punto: la forma de un JWT, sin decir si es válido. */
const FORMA_JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
/** Lo que hace falta para crear la cuenta en el segundo envío: van los tres o ninguno. */
export const CAMPOS_CUENTA_GOOGLE = ['rol', 'nombre', 'apellido'] as const;

export const esquemaIngresoGoogle = z
  .strictObject({
    id_token: z
      .string({ error: 'Falta el token de Google.' })
      .min(1, { error: 'Falta el token de Google.' })
      .max(ID_TOKEN_GOOGLE_MAX, { error: 'El token de Google es demasiado largo.' })
      .regex(FORMA_JWT, { error: 'El token de Google no tiene la forma esperada.' }),
    rol: z.enum(ROLES, { error: 'Elige si eres entrenador (trainer) o alumno (client).' }).optional(),
    nombre: esquemaNombre('nombre').optional(),
    apellido: esquemaNombre('apellido').optional(),
  })
  .superRefine((d, ctx) => {
    // Primer envío: solo el token. Segundo: el token con los tres datos de la cuenta nueva.
    if (!CAMPOS_CUENTA_GOOGLE.some((c) => d[c] !== undefined)) return;
    const mensajes = { rol: 'Elige si eres entrenador (trainer) o alumno (client).', nombre: 'Escribe tu nombre.', apellido: 'Escribe tu apellido.' };
    for (const c of CAMPOS_CUENTA_GOOGLE) {
      if (d[c] === undefined) ctx.addIssue({ code: 'custom', path: [c], message: mensajes[c], input: undefined });
    }
  });

/** Lo que Google dice de la persona, para llenar de antemano el paso de rol de la app. */
export const esquemaPerfilGoogle = z.object({
  email: z.string(),
  nombre: z.string(),
  apellido: z.string(),
});

export const esquemaRespuestaGoogle = z.discriminatedUnion('resultado', [
  // Entró: la misma sesión que el ingreso normal. `cuenta_nueva` dice si se acaba de crear.
  z.object({ resultado: z.literal('sesion'), cuenta_nueva: z.boolean(), usuario: esquemaUsuario, tokens: esquemaTokens }),
  // El correo no tiene cuenta y el envío no traía rol: falta el segundo envío.
  z.object({ resultado: z.literal('falta_rol'), perfil: esquemaPerfilGoogle }),
]);

export type EntradaRegistro = z.input<typeof esquemaRegistro>;
export type EntradaIngresoGoogle = z.input<typeof esquemaIngresoGoogle>;
export type PerfilGoogle = z.infer<typeof esquemaPerfilGoogle>;
export type RespuestaGoogle = z.infer<typeof esquemaRespuestaGoogle>;
export type EntradaIngreso = z.input<typeof esquemaIngreso>;
export type EntradaRestablecer = z.input<typeof esquemaRestablecerContrasena>;
export type Usuario = z.infer<typeof esquemaUsuario>;
export type Tokens = z.infer<typeof esquemaTokens>;
export type Sesion = z.infer<typeof esquemaSesion>;
export type Salud = z.infer<typeof esquemaSalud>;

// ── Catálogo de rutas ────────────────────────────────────────────────────────
// La API registra cada ruta desde aquí (con el mismo objeto de esquema) y el cliente llama a la
// misma ruta. CON-001 recorre las rutas de Fastify y revisa que todas salgan de este catálogo.
export const RUTAS_CUENTAS = {
  registrar: {
    metodo: 'POST', ruta: '/v1/auth/register', publica: true,
    cuerpo: esquemaRegistro, exito: 201, respuesta: esquemaSesion,
  },
  ingresar: {
    metodo: 'POST', ruta: '/v1/auth/login', publica: true,
    cuerpo: esquemaIngreso, exito: 200, respuesta: esquemaSesion,
  },
  // 200 en los dos resultados (entró o falta el rol), también cuando crea la cuenta: es un ingreso.
  // Errores propios: 401 INVALID_CREDENTIALS (token de Google malo o de otra app), 422
  // BUSINESS_RULE (correo sin verificar en Google), 503 (GOOGLE_CLIENT_IDS sin configurar).
  google: {
    metodo: 'POST', ruta: '/v1/auth/google', publica: true,
    cuerpo: esquemaIngresoGoogle, exito: 200, respuesta: esquemaRespuestaGoogle,
  },
  renovar: {
    metodo: 'POST', ruta: '/v1/auth/refresh', publica: true,
    cuerpo: esquemaRefresh, exito: 200, respuesta: esquemaRespuestaRefresh,
  },
  cerrarSesion: {
    metodo: 'POST', ruta: '/v1/auth/logout', publica: true,
    cuerpo: esquemaCierreSesion, exito: 200, respuesta: esquemaRespuestaCierre,
  },
  olvideContrasena: {
    metodo: 'POST', ruta: '/v1/auth/password/forgot', publica: true,
    cuerpo: esquemaOlvideContrasena, exito: 202, respuesta: esquemaRespuestaOlvide,
  },
  restablecerContrasena: {
    metodo: 'POST', ruta: '/v1/auth/password/reset', publica: true,
    cuerpo: esquemaRestablecerContrasena, exito: 200, respuesta: esquemaRespuestaRestablecer,
  },
  perfil: {
    metodo: 'GET', ruta: '/v1/me', publica: false,
    cuerpo: undefined, exito: 200, respuesta: esquemaUsuario,
  },
  salud: {
    metodo: 'GET', ruta: '/health', publica: true,
    cuerpo: undefined, exito: 200, respuesta: esquemaSalud,
  },
} as const;

export type NombreRutaCuentas = keyof typeof RUTAS_CUENTAS;

/** Respuestas de error que puede dar cualquier ruta (todas con el mismo sobre). */
export const RESPUESTAS_ERROR = {
  400: esquemaSobreError,
  401: esquemaSobreError,
  403: esquemaSobreError,
  404: esquemaSobreError,
  409: esquemaSobreError,
  429: esquemaSobreError,
  500: esquemaSobreError,
  503: esquemaSobreError,
} as const;
