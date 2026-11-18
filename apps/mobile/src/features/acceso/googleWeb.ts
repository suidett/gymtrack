// ─────────────────────────────────────────────────────────────────────────────
// Ingreso con Google en la versión web · Zona: Acceso
//
// Qué hace: en web el ingreso con Google va con la página entera, sin ventana emergente: en un
// iPhone con la app agregada a la pantalla de inicio una ventana emergente no puede devolverle
// el resultado a la app. Antes de irse a Google guarda en sessionStorage el state y el nonce del
// pedido (y el rol marcado); al volver a /ingreso lee el fragmento `#id_token=...` una sola vez,
// lo compara con lo guardado (google.ts, leerRetornoWeb) y borra el token de la barra de
// direcciones.
// Tócalo cuando: cambie a qué página vuelve Google o qué se guarda antes de irse.
// No lo toques para: qué se acepta del retorno (google.ts) ni el botón (BotonGoogle.tsx).
// Depende de: ./google. En Android y iPhone nativo no hace nada.
// ─────────────────────────────────────────────────────────────────────────────
import { leerRetornoWeb, type IntentoWeb, type LecturaAutorizacion } from './google';
import type { RolAcceso } from './validacion';

const CLAVE = 'gymtrack.google';
/** La página a la que vuelve Google en web. Tiene que estar en «URI de redireccionamiento autorizados». */
export const RUTA_RETORNO_WEB = 'ingreso';

const ubicacion = (): Location | undefined => (typeof document === 'undefined' ? undefined : globalThis.location);

// El fragmento se copia apenas carga el código, antes de que el enrutador toque la dirección.
const FRAGMENTO_AL_ABRIR = ubicacion()?.hash ?? '';

function almacen(): Storage | null {
  try {
    return typeof document === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

/** Antes de irse a Google: lo que hace falta para reconocer el retorno. */
export function guardarIntentoWeb(intento: IntentoWeb): void {
  try {
    almacen()?.setItem(CLAVE, JSON.stringify(intento));
  } catch {
    // Sin almacenamiento el retorno no se reconoce y se ve «No pudimos terminar el ingreso».
  }
}

function leerIntento(): IntentoWeb | null {
  const s = almacen();
  try {
    const crudo = s?.getItem(CLAVE);
    s?.removeItem(CLAVE);
    if (!crudo) return null;
    const o = JSON.parse(crudo) as Partial<IntentoWeb>;
    if (typeof o.state !== 'string' || typeof o.nonce !== 'string') return null;
    const rol: RolAcceso | null = o.rol === 'cliente' || o.rol === 'entrenador' ? o.rol : null;
    return { state: o.state, nonce: o.nonce, rol };
  } catch {
    return null;
  }
}

export interface RetornoWeb {
  lectura: Exclude<LecturaAutorizacion, { tipo: 'nada' } | { tipo: 'codigo' }>;
  rol: RolAcceso | null;
}

// Una vez por carga de la página: se calcula la primera vez y se entrega una sola vez.
let calculado: RetornoWeb | null | undefined;
let entregado = false;

function calcular(): RetornoWeb | null {
  const u = ubicacion();
  const fragmento = u?.hash || FRAGMENTO_AL_ABRIR;
  if (!u || !fragmento) return null;
  const guardado = leerIntento();
  const lectura = leerRetornoWeb(fragmento, guardado);
  if (lectura.tipo === 'nada' || lectura.tipo === 'codigo') return null;
  // El id_token no se queda en la barra de direcciones. Se conserva history.state: es del
  // enrutador. Expo Router además guarda el fragmento como parámetro «#» de la ruta y lo vuelve a
  // escribir; useIngresoGoogle lo borra con setParams.
  try {
    globalThis.history.replaceState(globalThis.history.state, '', `${u.pathname}${u.search}`);
  } catch {
    // nada que limpiar
  }
  return { lectura, rol: guardado?.rol ?? null };
}

/** Mira, sin gastarlo, si esta carga de la página es la vuelta de Google. */
export function verRetornoWeb(): RetornoWeb | null {
  if (entregado) return null;
  if (calculado === undefined) calculado = calcular();
  return calculado;
}

/** Entrega el retorno una sola vez (los efectos dobles de React no lo mandan dos veces a la API). */
export function tomarRetornoWeb(): RetornoWeb | null {
  const r = verRetornoWeb();
  entregado = true;
  return r;
}

/** Se va a Google con la página entera. */
export function irAGoogle(url: string): void {
  ubicacion()?.assign(url);
}

