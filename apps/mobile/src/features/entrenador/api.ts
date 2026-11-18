// ─────────────────────────────────────────────────────────────────────────────
// Llamadas del entrenador · Zona: Entrenador (app)
//
// Qué hace: arma las llamadas a la API que usan las pantallas del entrenador (clientes, ficha,
// código de invitación, alertas, sugerencias, consejos, volumen, exportar y borrar la cuenta)
// sobre una función `llamar` inyectada. Así se prueba en Node con un `llamar` falso; la app usa
// la de @/lib/sesion (pone el Bearer y renueva el token), en ./instancia.ts.
// Tócalo cuando: cambie una ruta, su consulta o su cuerpo.
// No lo toques para: la forma de las respuestas (contrato.ts) ni los cálculos (logica.ts).
// Depende de: ./contrato, ./logica (cuerpoSobrescribir) y los esquemas de perfil de @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaCuentaBorrada, esquemaExportacion, esquemaPerfilUsuario, type Exportacion, type PerfilUsuario, type Usuario } from '@gymtrack/shared';
import {
  esquemaFicha,
  esquemaInvitacion,
  esquemaInvitacionActual,
  esquemaPaginaAlertas,
  esquemaPaginaClientes,
  esquemaSugerencias,
  esquemaVolumen,
  RUTAS,
  type Alerta,
  type ClienteLista,
  type Ficha,
  type Invitacion,
  type RespuestaSugerencias,
  type Volumen,
} from './contrato';
import { cuerpoSobrescribir, type Ajuste, type SalidaResolver } from './logica';

// ── Tipos ────────────────────────────────────────────────────────────────────
type Consulta = Record<string, string | number | boolean | undefined | null>;
/** La forma de api.llamar de @/lib/sesion (sin importar el gestor, para probar en Node). */
export type Llamar = <T = unknown>(
  metodo: string,
  ruta: string,
  op?: { cuerpo?: unknown; consulta?: Consulta; esquema?: { parse(d: unknown): T } },
) => Promise<T>;

/** Sobre qué va un consejo (hoja «Consejo para…» de la Ficha). */
export type SobreConsejo = 'rutina' | 'sesion' | 'ejercicio';

export interface DatosConsejo {
  clienteId: string;
  texto: string;
  /** Uno de estos tres; si faltan los tres la API responde 400 (al menos uno, §Datos). */
  routineId?: string | null;
  sessionId?: string | null;
  exerciseId?: string | null;
}

export interface ResultadoClientes {
  items: ClienteLista[];
  adherenciaSemanaPasada: number | null;
}

// Decenas de clientes, no cientos (§Alcance): con 100 por página y 5 páginas sobra.
const POR_PAGINA = 100;
const MAX_PAGINAS = 5;

// ── Fábrica ──────────────────────────────────────────────────────────────────
export function crearApiEntrenador(llamar: Llamar) {
  /** Junta todas las páginas de una lista paginada por cursor. */
  async function todas<T extends { items: unknown[]; next_cursor: string | null }>(
    ruta: string,
    esquema: { parse(d: unknown): T },
    consulta: Consulta = {},
  ): Promise<{ primera: T; items: T['items'] }> {
    const primera = await llamar('GET', ruta, { consulta: { ...consulta, limit: POR_PAGINA }, esquema });
    const items = [...primera.items];
    let cursor = primera.next_cursor;
    for (let i = 1; cursor && i < MAX_PAGINAS; i++) {
      const p = await llamar('GET', ruta, { consulta: { ...consulta, limit: POR_PAGINA, cursor }, esquema });
      items.push(...p.items);
      cursor = p.next_cursor;
    }
    return { primera, items };
  }

  return {
    /** GET /trainer/clients: todos sus clientes con vínculo activo. */
    async listarClientes(): Promise<ResultadoClientes> {
      const { primera, items } = await todas(RUTAS.clientes, esquemaPaginaClientes);
      return { items, adherenciaSemanaPasada: primera.adherencia_semana_pasada_pct };
    },

    /** GET /trainer/clients/:id. Un id que no es su cliente da 404 (nunca 403). */
    verFicha(id: string): Promise<Ficha> {
      return llamar('GET', RUTAS.cliente(id), { esquema: esquemaFicha });
    },

    /** DELETE /trainer/clients/:id: termina el vínculo; el historial queda con el cliente. */
    async desvincular(id: string): Promise<void> {
      await llamar('DELETE', RUTAS.cliente(id));
    },

    /** POST /trainer/invitations: un código nuevo de 6 caracteres; el anterior sin usar deja de servir (P-14). */
    crearInvitacion(): Promise<Invitacion> {
      return llamar('POST', RUTAS.invitaciones, { esquema: esquemaInvitacion });
    },

    /** GET /trainer/invitations: el último código que pidió (vigente o no), o null. */
    async invitacionActual(): Promise<Invitacion | null> {
      const r = await llamar('GET', RUTAS.invitaciones, { esquema: esquemaInvitacionActual });
      return r.invitacion;
    },

    /** GET /trainer/alerts: abiertas por defecto; `resueltas` pide las resueltas (INT-132). */
    async listarAlertas(resueltas = false): Promise<Alerta[]> {
      // esquemaQueryAlertasEntrenador: estado abiertas (por defecto), nuevas o resueltas.
      const { items } = await todas(RUTAS.alertas, esquemaPaginaAlertas, resueltas ? { estado: 'resueltas' } : {});
      return items;
    },

    /**
     * PATCH /alerts/:id a vista o resuelta. Al resolver van las acciones que marcó en la hoja
     * (ACCIONES_RESOLUCION de la API: cargas, consejo, rutina, nada); sin marcar, no van.
     */
    async cambiarEstadoAlerta(id: string, estado: 'vista' | 'resuelta', acciones?: readonly SalidaResolver[]): Promise<void> {
      await llamar('PATCH', RUTAS.alerta(id), { cuerpo: acciones?.length ? { estado, acciones: [...acciones] } : { estado } });
    },

    /** GET /clients/:id/suggestions: las pendientes de la rutina activa del cliente. */
    listarSugerencias(clienteId: string): Promise<RespuestaSugerencias> {
      return llamar('GET', RUTAS.sugerencias(clienteId), { esquema: esquemaSugerencias });
    },

    /** PATCH /suggestions/:id (P-04): la API registra quién y cuándo. */
    async sobrescribir(id: string, ajuste: Ajuste): Promise<void> {
      await llamar('PATCH', RUTAS.sugerencia(id), { cuerpo: cuerpoSobrescribir(ajuste) });
    },

    /** POST /observations de tipo consejo: el cliente lo ve en Hoy. */
    async enviarConsejo(d: DatosConsejo): Promise<void> {
      const cuerpo: Record<string, unknown> = { tipo: 'consejo', texto: d.texto.trim(), client_id: d.clienteId };
      if (d.routineId) cuerpo.routine_id = d.routineId;
      if (d.sessionId) cuerpo.session_id = d.sessionId;
      if (d.exerciseId) cuerpo.exercise_id = d.exerciseId;
      await llamar('POST', RUTAS.observaciones, { cuerpo });
    },

    /** GET /me/progress/volume?weeks=8&client_id= (P-02). */
    volumen(clienteId: string, semanas = 8): Promise<Volumen> {
      return llamar('GET', RUTAS.volumen, { consulta: { weeks: semanas, client_id: clienteId }, esquema: esquemaVolumen });
    },

    /** PATCH /me con unidades o modo gimnasio (RUTAS_PERFIL.actualizar). Devuelve el usuario actualizado. */
    actualizarPerfil(parcial: Partial<Pick<Usuario, 'unidades' | 'modo_gimnasio'>>): Promise<PerfilUsuario> {
      return llamar('PATCH', RUTAS.me, { cuerpo: parcial, esquema: esquemaPerfilUsuario });
    },

    /** GET /me/export: la URL firmada del ZIP con sus rutinas, ejercicios y observaciones (P-26). */
    exportar(): Promise<Exportacion> {
      return llamar('GET', RUTAS.exportar, { esquema: esquemaExportacion });
    },

    /** DELETE /me: marca la cuenta para borrarse en 30 días y cierra todas las sesiones. Devuelve cuándo se purga. */
    async borrarCuenta(): Promise<{ purga_at: string }> {
      return llamar('DELETE', RUTAS.me, { esquema: esquemaCuentaBorrada });
    },
  };
}

export type ApiEntrenador = ReturnType<typeof crearApiEntrenador>;
