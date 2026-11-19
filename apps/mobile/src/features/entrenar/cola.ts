// ─────────────────────────────────────────────────────────────────────────────
// Cola sin señal · Zona: Entrenar
//
// Qué hace: guarda en orden lo que hay que mandarle a la API de una sesión (iniciar, series,
// cerrar, descartar, observaciones) y lo manda cuando hay señal. Junta lo repetido: un lote de
// series nuevo reemplaza al anterior de la misma sesión, y cerrar absorbe el iniciar y las series
// pendientes en un solo envío (crear, series y cerrar), que la API acepta dos veces sin duplicar
// porque el id viene del celular. Al procesar: sin red se detiene y conserva todo; un 401 se
// detiene sin reintentar en bucle (SYNC-013, SYNC-020); un 5xx reintenta con espera creciente
// (1 s, 2 s: SYNC-005); un rechazo de datos (400, 404, 409, 422) deja esa entrada como rechazada
// con su motivo y sigue con las demás (SYNC-014).
// Tócalo cuando: cambie el orden, la mezcla o los reintentos de la cola.
// No lo toques para: qué llamada sale por cada entrada (transporte.ts) ni dónde se guarda
// (almacen.ts).
// Depende de: ./contrato (los cuerpos) y @gymtrack/shared (ErrorDeApi). Es puro: el envío y la
// espera vienen de afuera.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi } from '@gymtrack/shared';
import type { CuerpoCerrar, CuerpoCrear, CuerpoObservacion, CuerpoSeries } from './contrato';

// ── Entradas ─────────────────────────────────────────────────────────────────
interface Base {
  id: string;
  session_id: string | null;
  creada_at: string;
  intentos: number;
  estado: 'pendiente' | 'rechazada';
  motivo: string | null;
  codigo: string | null;
}

export type OpCola =
  | (Base & { tipo: 'iniciar'; session_id: string; cuerpo: CuerpoCrear })
  | (Base & { tipo: 'series'; session_id: string; cuerpo: CuerpoSeries })
  | (Base & { tipo: 'cerrar'; session_id: string; crear: CuerpoCrear; series: CuerpoSeries; cerrar: CuerpoCerrar })
  | (Base & { tipo: 'descartar'; session_id: string })
  | (Base & { tipo: 'observacion'; cuerpo: CuerpoObservacion });

/** Lo que se pasa a encolar: la entrada sin los campos de seguimiento. */
export type NuevaOp = OpCola extends infer O ? (O extends OpCola ? Omit<O, 'intentos' | 'estado' | 'motivo' | 'codigo'> : never) : never;

function completar(op: NuevaOp): OpCola {
  return { ...op, intentos: 0, estado: 'pendiente', motivo: null, codigo: null } as OpCola;
}

// ── Recién encolado ──────────────────────────────────────────────────────────
/**
 * true si `cola` trae una entrada pendiente que no estaba en `previa`: algo recién encolado que
 * conviene mandar al tiro. Un reintento cambia la cola pero no agrega ids, así no se dispara en bucle.
 */
export function hayNuevaPendiente(cola: readonly OpCola[], previa: readonly OpCola[]): boolean {
  const antes = new Set(previa.map((o) => o.id));
  return cola.some((o) => o.estado === 'pendiente' && !antes.has(o.id));
}

// ── Encolar ──────────────────────────────────────────────────────────────────
/**
 * Agrega una entrada a la cola juntando lo repetido. Devuelve la cola nueva. `enVuelo` son los ids
 * de las entradas que se están mandando en este momento (pueden llegar a la API).
 */
export function encolar(cola: readonly OpCola[], nueva: NuevaOp, enVuelo: ReadonlySet<string> = new Set()): OpCola[] {
  const op = completar(nueva);
  const sid = op.session_id;
  const pendienteDe = (o: OpCola, tipo: OpCola['tipo']) => o.session_id === sid && o.tipo === tipo && o.estado === 'pendiente';

  if (op.tipo === 'series') {
    // El lote nuevo trae todas las series: el anterior de la misma sesión sobra.
    return [...cola.filter((o) => !pendienteDe(o, 'series')), op];
  }

  if (op.tipo === 'cerrar') {
    // Cerrar lleva crear y series adentro: va donde estaba el iniciar, antes de las observaciones
    // de esa sesión, para que la sesión exista en la API cuando lleguen.
    const absorbe = (o: OpCola) => pendienteDe(o, 'iniciar') || pendienteDe(o, 'series');
    const donde = cola.findIndex(absorbe);
    const resto = cola.filter((o) => !absorbe(o));
    if (donde === -1) return [...resto, op];
    const pos = cola.slice(0, donde).filter((o) => !absorbe(o)).length;
    return [...resto.slice(0, pos), op, ...resto.slice(pos)];
  }

  if (op.tipo === 'descartar') {
    // Si el iniciar nunca salió (sigue en la cola), la API no conoce la sesión: basta con borrar
    // todo lo suyo. Si ya salió, se borra lo pendiente y se avisa el descarte.
    const nuncaLlego = cola.some((o) => o.session_id === sid && o.tipo === 'iniciar' && !enVuelo.has(o.id));
    const resto = cola.filter((o) => o.session_id !== sid);
    return nuncaLlego ? resto : [...resto, op];
  }

  return [...cola, op];
}

/** Vuelve a pendiente las rechazadas (botón Reintentar de la cola en Perfil, APP-037). */
export function reintentarRechazadas(cola: readonly OpCola[]): OpCola[] {
  return cola.map((o) => (o.estado === 'rechazada' ? { ...o, estado: 'pendiente', motivo: null, codigo: null, intentos: 0 } : o));
}

/** Cuántas entradas quedan por mandar y cuántas fueron rechazadas. */
export function contarCola(cola: readonly OpCola[]): { pendientes: number; rechazadas: number } {
  return {
    pendientes: cola.filter((o) => o.estado === 'pendiente').length,
    rechazadas: cola.filter((o) => o.estado === 'rechazada').length,
  };
}

// ── Procesar ─────────────────────────────────────────────────────────────────
export type Enviar = (op: OpCola) => Promise<unknown>;

export interface OpcionesProcesar {
  /** Espera entre reintentos de un 5xx; en las pruebas se pasa una que no espera. */
  esperar?: (ms: number) => Promise<void>;
  /** Esperas antes del 2.º y 3.er intento. */
  esperasMs?: readonly number[];
  /** true si el error es de red (fetch no llegó). */
  esSinRed: (e: unknown) => boolean;
}

export interface ResultadoOp {
  op: OpCola;
  resultado: 'enviada' | 'rechazada';
  datos?: unknown;
  motivo?: string;
  codigo?: string;
}

export interface ResultadoProceso {
  /** Ids de las entradas que ya salieron (se sacan de la cola). */
  enviadas: Set<string>;
  /** Entradas que cambiaron (rechazadas o con un intento más). */
  cambiadas: Map<string, OpCola>;
  resultados: ResultadoOp[];
  /** Por qué se detuvo antes de terminar, o null si recorrió todo. */
  detenida: 'sin_red' | 'sin_sesion' | 'servidor' | null;
}

// Un 409 de series sobre una sesión cerrada significa que ya está todo arriba.
const YA_ESTABA: Partial<Record<OpCola['tipo'], string[]>> = {
  series: ['SESSION_CLOSED'],
  descartar: ['SESSION_DISCARDED', 'NOT_FOUND'],
};

/**
 * Manda las entradas pendientes en orden. No muta la cola: devuelve qué salió y qué cambió, para
 * aplicarlo sobre la cola guardada (que pudo crecer mientras tanto).
 */
export async function procesarCola(cola: readonly OpCola[], enviar: Enviar, op: OpcionesProcesar): Promise<ResultadoProceso> {
  const esperar = op.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const esperas = op.esperasMs ?? [1000, 2000];
  const r: ResultadoProceso = { enviadas: new Set(), cambiadas: new Map(), resultados: [], detenida: null };
  // Si una entrada de una sesión se rechaza, lo que sigue de esa sesión espera (fallaría igual).
  const bloqueadas = new Set<string>();

  for (const entrada of cola) {
    if (entrada.estado !== 'pendiente') continue;
    if (entrada.session_id && bloqueadas.has(entrada.session_id)) continue;

    let intento = 0;
    for (;;) {
      try {
        const datos = await enviar(entrada);
        r.enviadas.add(entrada.id);
        r.resultados.push({ op: entrada, resultado: 'enviada', datos });
        break;
      } catch (e) {
        if (op.esSinRed(e)) {
          r.detenida = 'sin_red';
          return r;
        }
        if (!(e instanceof ErrorDeApi)) {
          // Un error raro de la app (por ejemplo una respuesta ilegible): se trata como del servidor.
          r.cambiadas.set(entrada.id, { ...entrada, intentos: entrada.intentos + intento + 1 });
          r.detenida = 'servidor';
          return r;
        }
        if (e.estado === 401) {
          r.detenida = 'sin_sesion';
          return r;
        }
        if (e.estado >= 500 || e.estado === 429) {
          const espera = esperas[intento];
          intento += 1;
          if (espera !== undefined) {
            await esperar(e.reintentarEnS ? e.reintentarEnS * 1000 : espera);
            continue;
          }
          r.cambiadas.set(entrada.id, { ...entrada, intentos: entrada.intentos + intento });
          r.detenida = 'servidor';
          return r;
        }
        if (YA_ESTABA[entrada.tipo]?.includes(e.codigo)) {
          r.enviadas.add(entrada.id);
          r.resultados.push({ op: entrada, resultado: 'enviada' });
          break;
        }
        const rechazada: OpCola = { ...entrada, estado: 'rechazada', motivo: e.message, codigo: e.codigo, intentos: entrada.intentos + 1 };
        r.cambiadas.set(entrada.id, rechazada);
        r.resultados.push({ op: rechazada, resultado: 'rechazada', motivo: e.message, codigo: e.codigo });
        if (entrada.session_id) bloqueadas.add(entrada.session_id);
        break;
      }
    }
  }
  return r;
}

/** Aplica el resultado sobre la cola actual (la que está guardada ahora, no la que se procesó). */
export function aplicarProceso(cola: readonly OpCola[], r: ResultadoProceso): OpCola[] {
  return cola.filter((o) => !r.enviadas.has(o.id)).map((o) => r.cambiadas.get(o.id) ?? o);
}
