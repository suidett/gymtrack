// ─────────────────────────────────────────────────────────────────────────────
// Consulta cada 15 segundos · Zona: Notificaciones (app)
//
// Qué hace: el «tiempo real» de la campana sin push: mientras alguien la está mirando (la campana
// de Hoy o de Clientes, o la pantalla Notificaciones) y la app está al frente, pide la lista
// al tiro y después cada 15 segundos. Con la app en segundo plano (o la pestaña del navegador
// escondida) para; al volver al frente pide al tiro y sigue. Hay un solo reloj para toda la app,
// aunque la campana y la pantalla estén montadas a la vez: cada una se suscribe y el reloj corre
// mientras quede alguna.
// Es puro: el reloj (setInterval) y el estado de la app (AppState) se inyectan, así se prueba en
// Node con relojes falsos (./__tests__/sondeo.test.ts).
// Tócalo cuando: cambie cada cuánto se consulta o cuándo se para.
// No lo toques para: qué se pide (./almacen.ts) ni a qué se conecta (./instancia.ts).
// Depende de: nada.
// ─────────────────────────────────────────────────────────────────────────────

export const CADA_MS = 15_000;

export interface Sondeo {
  /** Empieza a mirar. Devuelve la función para dejar de mirar. */
  suscribir(): () => void;
  /** Lo que dice AppState: 'active' es al frente; 'background' e 'inactive', no. */
  alCambiarEstado(estado: string): void;
  readonly corriendo: boolean;
}

export function crearSondeo(o: {
  consultar: () => void;
  intervaloMs?: number;
  /** setInterval y clearInterval (las pruebas pasan unos falsos). */
  reloj?: { cada: (fn: () => void, ms: number) => unknown; parar: (id: unknown) => void };
  /** Cómo está la app al crear el sondeo. */
  estadoInicial?: string;
}): Sondeo {
  const intervalo = o.intervaloMs ?? CADA_MS;
  const reloj = o.reloj ?? {
    cada: (fn: () => void, ms: number) => setInterval(fn, ms),
    parar: (id: unknown) => clearInterval(id as ReturnType<typeof setInterval>),
  };
  let suscritos = 0;
  let alFrente = (o.estadoInicial ?? 'active') === 'active';
  let id: unknown = null;

  const arrancar = () => {
    if (id !== null || suscritos === 0 || !alFrente) return;
    o.consultar();
    id = reloj.cada(o.consultar, intervalo);
  };
  const parar = () => {
    if (id === null) return;
    reloj.parar(id);
    id = null;
  };

  return {
    suscribir() {
      suscritos += 1;
      arrancar();
      let suelto = false;
      return () => {
        if (suelto) return;
        suelto = true;
        suscritos -= 1;
        if (suscritos === 0) parar();
      };
    },
    alCambiarEstado(estado) {
      const ahora = estado === 'active';
      if (ahora === alFrente) return;
      alFrente = ahora;
      if (alFrente) arrancar();
      else parar();
    },
    get corriendo() {
      return id !== null;
    },
  };
}
