// ─────────────────────────────────────────────────────────────────────────────
// Códigos de error de la API · Zona: Contrato
//
// Qué hace: la lista cerrada de códigos que la API puede devolver dentro del sobre
// `{ error: { code, message, details } }` (§API del PRD), cada uno con su estado HTTP. La API
// arma sus errores desde aquí y las pruebas comparan contra estas constantes, nunca contra el
// texto de `message` (plan de validación, regla 4 y P-40).
// Tócalo cuando: una ruta nueva necesite un código que no existe. Agrégalo con su estado y su
// mensaje por defecto; la prueba CON-005 revisa que el estado calce con la tabla de §API.
// No lo toques para: cambiar la forma del sobre (eso es esquemaSobreError, más abajo, y rompe la
// app), ni para decidir cuándo se usa un código (eso vive en cada ruta de apps/api).
// Depende de: zod.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// ── Catálogo ─────────────────────────────────────────────────────────────────
// Los nombres son provisionales (P-40) pero estables: la app decide qué mostrar según el código.
export const CODIGOS_ERROR = {
  // 400: la entrada no pasa el esquema; `details` trae el campo y el motivo.
  VALIDATION_ERROR: { estado: 400, mensaje: 'Revisa los datos enviados.' },
  // 400: enlace de recuperación vencido, ya usado o inventado (los tres responden igual).
  RESET_TOKEN_INVALID: { estado: 400, mensaje: 'El enlace ya no sirve. Pide otro.' },
  // 401: sin token, token vencido o refresh reutilizado.
  UNAUTHENTICATED: { estado: 401, mensaje: 'Tienes que ingresar.' },
  TOKEN_INVALID: { estado: 401, mensaje: 'Tu sesión no es válida. Ingresa de nuevo.' },
  TOKEN_EXPIRED: { estado: 401, mensaje: 'Tu sesión venció. Renueva el token.' },
  INVALID_CREDENTIALS: { estado: 401, mensaje: 'El correo o la contraseña no coinciden.' },
  ACCOUNT_DELETED: { estado: 401, mensaje: 'Esta cuenta está marcada para borrarse.' },
  REFRESH_INVALID: { estado: 401, mensaje: 'Tu sesión no es válida. Ingresa de nuevo.' },
  REFRESH_EXPIRED: { estado: 401, mensaje: 'Tu sesión venció. Ingresa de nuevo.' },
  REFRESH_REUSED: { estado: 401, mensaje: 'Cerramos todas tus sesiones por seguridad. Ingresa de nuevo.' },
  // 403: tu rol no permite la acción sobre algo que sí ves (supuesto de P-01).
  FORBIDDEN: { estado: 403, mensaje: 'No puedes hacer esto con tu cuenta.' },
  // 404: no existe o no es tuyo (mismo cuerpo en los dos casos).
  NOT_FOUND: { estado: 404, mensaje: 'No encontramos lo que buscas.' },
  // 409: estado que no permite la acción.
  EMAIL_TAKEN: { estado: 409, mensaje: 'Ya hay una cuenta con este correo.' },
  // 429: límite de intentos; la respuesta trae Retry-After en segundos (P-42).
  RATE_LIMITED: { estado: 429, mensaje: 'Demasiados intentos. Espera un momento.' },
  // 5xx.
  INTERNAL_ERROR: { estado: 500, mensaje: 'Algo falló de nuestro lado. Intenta de nuevo.' },
  SERVICE_UNAVAILABLE: { estado: 503, mensaje: 'El servicio no está disponible ahora.' },
} as const satisfies Record<string, { estado: number; mensaje: string }>;

export type CodigoError = keyof typeof CODIGOS_ERROR;

export const LISTA_CODIGOS_ERROR = Object.keys(CODIGOS_ERROR) as [CodigoError, ...CodigoError[]];

// ── Sobre de error ───────────────────────────────────────────────────────────
// Todas las respuestas 4xx y 5xx tienen esta forma (CON-004).
export const esquemaSobreError = z.object({
  error: z.object({
    code: z.enum(LISTA_CODIGOS_ERROR),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type SobreError = z.infer<typeof esquemaSobreError>;
