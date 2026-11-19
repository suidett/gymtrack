// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del sondeo de la campana · Zona: Notificaciones (app)
//
// Qué hace: prueba en Node, con un reloj falso, que ../sondeo.ts pida al tiro y cada 15 s solo
// mientras alguien mira la campana y la app está al frente; que pare en segundo plano y pida al
// tiro al volver; y que la campana y la pantalla juntas no dupliquen el reloj.
// Tócalo cuando: cambie ../sondeo.ts.
// Depende de: vitest y ../sondeo.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { CADA_MS, crearSondeo } from '../sondeo';

/** Un setInterval falso que se avanza a mano. */
function relojFalso() {
  let t = 0;
  let sig = 1;
  const timers = new Map<number, { fn: () => void; ms: number; proximo: number }>();
  return {
    cada: (fn: () => void, ms: number) => {
      const id = sig++;
      timers.set(id, { fn, ms, proximo: t + ms });
      return id;
    },
    parar: (id: unknown) => void timers.delete(id as number),
    avanzar(ms: number) {
      const fin = t + ms;
      for (;;) {
        const [id, x] = [...timers.entries()].sort((a, b) => a[1].proximo - b[1].proximo)[0] ?? [];
        if (!x || x.proximo > fin) break;
        t = x.proximo;
        x.proximo += x.ms;
        if (timers.has(id!)) x.fn();
      }
      t = fin;
    },
    get activos() {
      return timers.size;
    },
  };
}

describe('Sondeo cada 15 segundos', () => {
  it('NOT-097 con la app al frente pide al tiro y cada 15 s; sin nadie mirando, para', () => {
    const reloj = relojFalso();
    let pedidos = 0;
    const s = crearSondeo({ consultar: () => void pedidos++, reloj });
    expect(CADA_MS).toBe(15_000);
    expect(pedidos).toBe(0);
    const soltar = s.suscribir();
    expect(pedidos).toBe(1);
    reloj.avanzar(14_999);
    expect(pedidos).toBe(1);
    reloj.avanzar(1);
    expect(pedidos).toBe(2);
    reloj.avanzar(45_000);
    expect(pedidos).toBe(5);
    soltar();
    soltar();
    expect([s.corriendo, reloj.activos]).toEqual([false, 0]);
    reloj.avanzar(60_000);
    expect(pedidos).toBe(5);
  });

  it('NOT-098 en segundo plano no pide; al volver al frente pide al tiro y sigue cada 15 s', () => {
    const reloj = relojFalso();
    let pedidos = 0;
    const s = crearSondeo({ consultar: () => void pedidos++, reloj });
    s.suscribir();
    s.alCambiarEstado('background');
    reloj.avanzar(120_000);
    expect([pedidos, s.corriendo]).toEqual([1, false]);
    s.alCambiarEstado('inactive');
    expect(pedidos).toBe(1);
    s.alCambiarEstado('active');
    expect(pedidos).toBe(2);
    s.alCambiarEstado('active');
    expect(pedidos).toBe(2);
    reloj.avanzar(15_000);
    expect(pedidos).toBe(3);
    // Si arranca con la app en segundo plano, espera a que vuelva al frente.
    let otros = 0;
    const t = crearSondeo({ consultar: () => void otros++, reloj: relojFalso(), estadoInicial: 'background' });
    t.suscribir();
    expect(otros).toBe(0);
    t.alCambiarEstado('active');
    expect(otros).toBe(1);
  });

  it('NOT-099 la campana y la pantalla a la vez comparten un solo reloj; sigue mientras quede una', () => {
    const reloj = relojFalso();
    let pedidos = 0;
    const s = crearSondeo({ consultar: () => void pedidos++, reloj });
    const campana = s.suscribir();
    const pantalla = s.suscribir();
    expect([pedidos, reloj.activos]).toEqual([1, 1]);
    pantalla();
    reloj.avanzar(15_000);
    expect([pedidos, s.corriendo]).toEqual([2, true]);
    campana();
    expect(s.corriendo).toBe(false);
  });
});
