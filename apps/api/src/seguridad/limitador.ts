// ─────────────────────────────────────────────────────────────────────────────
// Límite de intentos · Zona: Seguridad (API)
//
// Qué hace: cuenta intentos por clave (una IP, un correo, un usuario) en ventanas fijas y dice si
// se pasó del tope y cuántos segundos faltan para volver a intentar. Los topes del PRD
// (§Seguridad): 5 ingresos por minuto por IP, 3 recuperaciones por hora por correo y 60 llamadas
// por minuto por usuario en el resto. Lee la hora del reloj inyectado, así las pruebas «esperan»
// 60 segundos moviendo el reloj (SEG-009).
// Vive en memoria del proceso: alcanza para una sola instancia de la API (el VPS corre una por
// entorno). Si algún día hay dos, esto se mueve a PostgreSQL o a Redis.
// Tócalo cuando: cambie un tope o la forma de contar.
// No lo toques para: decidir a qué ruta se aplica (eso está en cada ruta).
// Depende de: ../reloj.
// ─────────────────────────────────────────────────────────────────────────────
import type { Reloj } from '../reloj';

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos hasta que se abre la ventana siguiente (para Retry-After). */
  reintentarEnS: number;
}

export interface Limitador {
  /** Cuenta un intento para `clave` y dice si todavía está dentro del tope. */
  intentar(clave: string): ResultadoLimite;
  vaciar(): void;
}

export function crearLimitador(opciones: { maximo: number; ventanaMs: number; reloj: Reloj }): Limitador {
  const ventanas = new Map<string, { desde: number; cuenta: number }>();
  return {
    intentar(clave) {
      const ahora = opciones.reloj.ahora().getTime();
      let v = ventanas.get(clave);
      if (!v || ahora - v.desde >= opciones.ventanaMs) {
        v = { desde: ahora, cuenta: 0 };
        ventanas.set(clave, v);
      }
      v.cuenta += 1;
      const reintentarEnS = Math.max(1, Math.ceil((v.desde + opciones.ventanaMs - ahora) / 1000));
      // Limpieza simple para que el mapa no crezca sin fin con claves viejas.
      if (ventanas.size > 50_000) {
        for (const [k, otra] of ventanas) if (ahora - otra.desde >= opciones.ventanaMs) ventanas.delete(k);
      }
      return { permitido: v.cuenta <= opciones.maximo, reintentarEnS };
    },
    vaciar() {
      ventanas.clear();
    },
  };
}

export const LIMITES = {
  ingresoPorIp: { maximo: 5, ventanaMs: 60_000 },
  recuperacionPorCorreo: { maximo: 3, ventanaMs: 3_600_000 },
  llamadasPorUsuario: { maximo: 60, ventanaMs: 60_000 },
} as const;
