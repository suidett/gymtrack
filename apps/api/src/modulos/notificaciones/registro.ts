// ─────────────────────────────────────────────────────────────────────────────
// Registro de avisos enviados · Zona: Notificaciones (API)
//
// Qué hace: deja constancia de cada aviso (a quién, qué tipo, en qué día local, cuántos push
// salieron, si fue correo o por qué se omitió) y sirve para dos reglas:
//   - el tope de 2 push al día por persona (P-20): cuenta los avisos de hoy que cuentan para el
//     tope y llegaron a salir;
//   - no repetir (WRK-014): cada aviso tiene una clave única (recordatorio:<alumno>:<día>,
//     cierre:<sesión>, observacion:<id>...). Reservarla dos veces da false.
// Vive en la tabla avisos_enviados: así la API y el worker comparten el tope. La versión en
// memoria queda para pruebas que no tienen base.
// Tócalo cuando: cambie qué se registra o la tabla.
// No lo toques para: el tope en sí (TOPE_AVISOS_DIA en packages/shared) ni quién recibe qué (./eventos.ts).
// Depende de: la base (modelo AvisoEnviado) y src/compartido/semilla.ts (ids UUID v7 a partir de la clave).
// ─────────────────────────────────────────────────────────────────────────────
import { uuidV7Fijo } from '../../compartido/semilla';
import type { BaseDeDatos } from '../../db';

export interface EntradaRegistro {
  clave: string;
  usuarioId: string;
  /** Día local del destinatario, AAAA-MM-DD. */
  dia: string;
  tipo: string;
  cuentaTope: boolean;
}

export interface CierreRegistro {
  pushEnviados: number;
  pushFallidos: number;
  correo: boolean;
  /** Por qué no salió el push: tope, sin_dispositivos, de_noche. null si salió. */
  omitido: string | null;
}

export interface RegistroAvisos {
  readonly nombre: 'base' | 'memoria';
  /** Reserva la clave del aviso. false si ya se mandó (o se está mandando). */
  reservar(e: EntradaRegistro, ahora: Date): Promise<boolean>;
  cerrar(clave: string, r: CierreRegistro): Promise<void>;
  /** Avisos de hoy que cuentan para el tope y llegaron a salir por push. */
  contarHoy(usuarioId: string, dia: string): Promise<number>;
  /** Solo pruebas: olvida todo lo de memoria (en la base, la prueba vacía la tabla). */
  vaciar(): Promise<void>;
}

// ── En memoria ───────────────────────────────────────────────────────────────
export function crearRegistroEnMemoria(): RegistroAvisos & { filas(): readonly (EntradaRegistro & Partial<CierreRegistro>)[] } {
  const filas = new Map<string, EntradaRegistro & Partial<CierreRegistro>>();
  return {
    nombre: 'memoria',
    filas: () => [...filas.values()],
    async reservar(e) {
      if (filas.has(e.clave)) return false;
      // Un proceso que corre semanas no junta claves para siempre: se olvida lo de hace más de 3 días.
      if (filas.size > 5000) {
        const limite = new Date(Date.parse(`${e.dia}T00:00:00Z`) - 3 * 86_400_000).toISOString().slice(0, 10);
        for (const [k, f] of filas) if (f.dia < limite) filas.delete(k);
      }
      filas.set(e.clave, { ...e });
      return true;
    },
    async cerrar(clave, r) {
      const f = filas.get(clave);
      if (f) Object.assign(f, r);
    },
    async vaciar() {
      filas.clear();
    },
    async contarHoy(usuarioId, dia) {
      let n = 0;
      for (const f of filas.values()) if (f.usuarioId === usuarioId && f.dia === dia && f.cuentaTope && (f.pushEnviados ?? 0) > 0) n += 1;
      return n;
    },
  };
}

// ── En la base (tabla avisos_enviados) ───────────────────────────────────────
export function crearRegistroEnBase(prisma: BaseDeDatos): RegistroAvisos {
  return {
    nombre: 'base',
    async reservar(e, ahora) {
      // skipDuplicates: la clave ya reservada (por este proceso o por el otro) no se pisa.
      const r = await prisma.avisoEnviado.createMany({
        data: [{ id: uuidV7Fijo(ahora, `aviso:${e.clave}`), usuarioId: e.usuarioId, dia: e.dia, tipo: e.tipo, clave: e.clave, cuentaTope: e.cuentaTope, createdAt: ahora }],
        skipDuplicates: true,
      });
      return r.count === 1;
    },
    async cerrar(clave, r) {
      await prisma.avisoEnviado.updateMany({
        where: { clave },
        data: { pushEnviados: r.pushEnviados, pushFallidos: r.pushFallidos, correo: r.correo, omitido: r.omitido },
      });
    },
    async contarHoy(usuarioId, dia) {
      return prisma.avisoEnviado.count({ where: { usuarioId, dia, cuentaTope: true, pushEnviados: { gt: 0 } } });
    },
    async vaciar() {},
  };
}
