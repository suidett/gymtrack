// ─────────────────────────────────────────────────────────────────────────────
// Registro del teléfono para recibir avisos · Zona: Notificaciones (app)
//
// Qué hace: la lógica de activar, renovar y apagar los avisos, igual en Android y en la app web:
//   activar     pide el permiso (lo primero, porque en el iPhone el permiso solo sale si se pide
//               en el mismo toque), saca el destino (token de Expo o suscripción web) y lo
//               registra en la API (POST /v1/notificaciones/dispositivos). Guarda el id que
//               devuelve para poder borrarlo después.
//   renovar     si el permiso ya está dado, vuelve a registrar sin preguntar nada (al abrir la
//               app o al ingresar): la API no duplica y, si el token cambió, queda el nuevo.
//   desactivar  borra el registro en la API (DELETE) y lo olvida. Va antes de cerrar sesión,
//               mientras todavía hay token.
//   estado      lo que Perfil necesita para mostrar el botón o el texto que corresponde.
// No importa nada de React Native ni del navegador: la plataforma, la llamada a la API y dónde se
// guarda el id se inyectan, así las pruebas corren en Node (./__tests__).
// Tócalo cuando: cambie el flujo de activar o los textos que ve la persona.
// No lo toques para: cómo se pide el permiso en cada plataforma (./plataforma.ts y
// ./plataforma.web.ts) ni la forma del cuerpo (packages/shared/src/api/notificaciones.ts).
// Depende de: @gymtrack/shared (contrato de notificaciones).
// ─────────────────────────────────────────────────────────────────────────────
import {
  ErrorDeApi,
  esquemaDispositivoAviso,
  esquemaDispositivoAvisoEntrada,
  esquemaPruebaAviso,
  RUTAS_NOTIFICACIONES,
  type DispositivoAvisoEntrada,
  type PruebaAviso,
} from '@gymtrack/shared';

// ── Tipos ────────────────────────────────────────────────────────────────────
/** Cómo está el permiso en este teléfono o navegador. */
export type Permiso = 'concedido' | 'sin_pedir' | 'denegado' | 'instalar_primero' | 'no_disponible';

/**
 * Lo que Perfil muestra:
 *   activos           ya llegan los avisos a este teléfono.
 *   sin_pedir         se puede mostrar el botón «Activar avisos».
 *   denegado          la persona dijo que no: se activan en los ajustes del teléfono o navegador.
 *   instalar_primero  iPhone en Safari: primero hay que agregar la app a la pantalla de inicio.
 *   no_disponible     este equipo o navegador no recibe avisos.
 */
export type EstadoAvisos = 'activos' | 'sin_pedir' | 'denegado' | 'instalar_primero' | 'no_disponible';

export interface ResultadoAvisos {
  estado: EstadoAvisos | 'error';
  /** El texto para el aviso de la pantalla (tuteo, sin jerga). */
  mensaje: string;
}

/** Lo que cada plataforma sabe hacer (Android con expo-notifications, web con el Push API). */
export interface PlataformaAvisos {
  readonly nombre: 'android' | 'ios' | 'web';
  permiso(): Promise<Permiso>;
  /** Pide el permiso. Llámala directo desde el toque, sin esperar nada antes. */
  pedirPermiso(): Promise<Permiso>;
  /** El cuerpo para la API: el token de Expo o la suscripción del navegador. */
  destino(): Promise<DispositivoAvisoEntrada>;
  /** Deja de recibir en este equipo (en web, cancela la suscripción). */
  olvidar(): Promise<void>;
}

/** Donde se guarda el id del registro (AsyncStorage; no es un secreto). */
export interface MemoriaAvisos {
  leer(): Promise<string | null>;
  guardar(valor: string): Promise<void>;
  borrar(): Promise<void>;
}

export type LlamarApi = (metodo: string, ruta: string, op?: { cuerpo?: unknown }) => Promise<unknown>;

// ── Textos ───────────────────────────────────────────────────────────────────
export function mensajeDeEstado(estado: EstadoAvisos | 'error', plataforma: PlataformaAvisos['nombre']): string {
  switch (estado) {
    case 'activos':
      return 'Listo: los avisos llegan a este teléfono.';
    case 'sin_pedir':
      return 'Activa los avisos para enterarte de tus rutinas, recordatorios y mensajes.';
    case 'denegado':
      return plataforma === 'web'
        ? 'Tienes los avisos bloqueados. Actívalos en los ajustes del navegador para esta página.'
        : 'Tienes los avisos bloqueados. Actívalos en los ajustes del teléfono, en Notificaciones de GymTrack.';
    case 'instalar_primero':
      return 'En el iPhone, primero agrega GymTrack a la pantalla de inicio: toca Compartir y luego «Agregar a inicio». Ábrela desde ahí y vuelve a tocar Activar avisos.';
    case 'no_disponible':
      return plataforma === 'web' ? 'Este navegador no recibe avisos.' : 'Este teléfono no puede recibir avisos.';
    case 'error':
      return 'No pudimos activar los avisos. Revisa tu conexión e inténtalo de nuevo.';
  }
}

/** Lo que se muestra después de pedir un aviso de prueba (POST /v1/notificaciones/prueba). */
export function mensajeDePrueba(r: Pick<PruebaAviso, 'dispositivos' | 'enviados' | 'correo'>): string {
  const correo = r.correo ? ' y un correo a tu dirección' : '';
  if (r.enviados > 0) return `Te mandamos un aviso de prueba${correo}. Si no llega en un minuto, revisa los avisos en los ajustes del teléfono.`;
  if (r.dispositivos === 0) {
    return r.correo
      ? 'Te mandamos un correo de prueba. Para recibir avisos aquí, toca Activar avisos.'
      : 'Este teléfono no está registrado. Toca Activar avisos.';
  }
  return `No pudimos mandar el aviso a tu teléfono${r.correo ? ', pero sí el correo' : ''}. Toca Activar avisos de nuevo.`;
}

/** El texto de una prueba que falló: sin red, demasiadas pruebas o la API no quiso. */
export function mensajeDeErrorPrueba(e: unknown): string {
  if (e instanceof ErrorDeApi) {
    if (e.codigo === 'RATE_LIMITED') {
      const min = Math.max(1, Math.ceil((e.reintentarEnS ?? 60) / 60));
      return `Ya pediste varias pruebas. Inténtalo de nuevo en ${min} ${min === 1 ? 'minuto' : 'minutos'}.`;
    }
    if (e.codigo === 'FORBIDDEN') return 'La prueba de avisos es solo para entrenadores.';
  }
  return 'No pudimos mandar la prueba. Revisa tu conexión e inténtalo de nuevo.';
}

// ── Ayudas puras ─────────────────────────────────────────────────────────────
/** La clave VAPID en base64url a bytes, como la pide pushManager.subscribe. */
export function base64UrlABytes(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(texto.length / 4) * 4, '=');
  const binario = atob(b64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/**
 * La ruta que abre un aviso al tocarlo, solo si es de la app («/entrenador/alertas»). Una ruta
 * con otro dominio («//sitio.cl», «https://...») se ignora: un aviso no te saca de la app.
 */
export function rutaDelAviso(datos: unknown): string | null {
  const url = (datos as { url?: unknown } | null | undefined)?.url;
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || url.includes('\\') || url.length > 200) return null;
  return url;
}

// ── Lógica ───────────────────────────────────────────────────────────────────
export function crearAvisos(d: { plataforma: PlataformaAvisos; llamar: LlamarApi; memoria: MemoriaAvisos }) {
  const { plataforma, llamar, memoria } = d;
  const resultado = (estado: ResultadoAvisos['estado']): ResultadoAvisos => ({ estado, mensaje: mensajeDeEstado(estado, plataforma.nombre) });

  /** Registra el destino en la API y guarda el id. Lanza si la API o el destino fallan. */
  async function registrar(): Promise<void> {
    const cuerpo = esquemaDispositivoAvisoEntrada.parse(await plataforma.destino());
    const r = esquemaDispositivoAviso.parse(await llamar(RUTAS_NOTIFICACIONES.registrarDispositivo.metodo, RUTAS_NOTIFICACIONES.registrarDispositivo.ruta, { cuerpo }));
    await memoria.guardar(r.id);
  }

  async function estado(): Promise<EstadoAvisos> {
    const p = await plataforma.permiso();
    if (p === 'concedido') return (await memoria.leer()) ? 'activos' : 'sin_pedir';
    return p;
  }

  /** Para el botón «Activar avisos». Nunca lanza: devuelve el estado y el texto para mostrar. */
  async function activar(): Promise<ResultadoAvisos> {
    let p: Permiso;
    try {
      // Lo primero: en el iPhone el permiso solo se pide dentro del toque.
      p = await plataforma.pedirPermiso();
    } catch {
      return resultado('error');
    }
    if (p !== 'concedido') return resultado(p);
    try {
      await registrar();
      return resultado('activos');
    } catch {
      return resultado('error');
    }
  }

  /** Al abrir la app o al ingresar: si el permiso ya está, registra de nuevo sin preguntar. */
  async function renovar(): Promise<boolean> {
    try {
      if ((await plataforma.permiso()) !== 'concedido') return false;
      await registrar();
      return true;
    } catch {
      return false;
    }
  }

  /** Antes de cerrar sesión o al apagar los avisos. No lanza: lo que falle se olvida igual. */
  async function desactivar(): Promise<void> {
    const id = await memoria.leer().catch(() => null);
    if (id) {
      const ruta = RUTAS_NOTIFICACIONES.borrarDispositivo.ruta.replace(':id', encodeURIComponent(id));
      await llamar(RUTAS_NOTIFICACIONES.borrarDispositivo.metodo, ruta).catch(() => undefined);
    }
    await plataforma.olvidar().catch(() => undefined);
    await memoria.borrar().catch(() => undefined);
  }

  /** Pide un aviso de prueba (y un correo, si se pide). Nunca lanza: devuelve el texto para mostrar. */
  async function probar(conCorreo = false): Promise<string> {
    try {
      const r = esquemaPruebaAviso.parse(
        await llamar(RUTAS_NOTIFICACIONES.prueba.metodo, RUTAS_NOTIFICACIONES.prueba.ruta, { cuerpo: conCorreo ? { correo: true } : {} }),
      );
      return mensajeDePrueba(r);
    } catch (e) {
      return mensajeDeErrorPrueba(e);
    }
  }

  return { estado, activar, renovar, desactivar, probar };
}

export type Avisos = ReturnType<typeof crearAvisos>;
