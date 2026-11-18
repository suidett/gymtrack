// ─────────────────────────────────────────────────────────────────────────────
// Ids UUID v7 · Zona: Entrenar
//
// Qué hace: genera los ids de las sesiones y las series en el celular, como UUID versión 7
// (RFC 9562): 48 bits de milisegundos, la versión, un contador de 12 bits y lo demás al azar.
// Así una sesión hecha sin señal no se duplica al subirla y la API la acepta (INT-090 rechaza
// los v4). Dentro del mismo milisegundo el contador sube, por eso los ids siempre crecen
// (SYNC-001), aunque el reloj del teléfono retroceda.
// Tócalo cuando: cambie el formato de id que pide la API.
// No lo toques para: los ids de la 0.1 (src/lib/ids.ts, v4), que siguen en el store local.
// Depende de: nada. Es puro: el reloj y el azar vienen de afuera (ver ids.ts de esta carpeta).
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que necesita el generador: la hora en milisegundos y bytes al azar. */
export interface FuentesUuid {
  ahora: () => number;
  aleatorio: (n: number) => Uint8Array;
}

const MAX_CONTADOR = 0xfff;

/** Crea un generador de UUID v7 que nunca repite y siempre crece. */
export function crearGeneradorUuidV7({ ahora, aleatorio }: FuentesUuid): () => string {
  let ultimoMs = -1;
  let contador = 0;
  return () => {
    let ms = Math.floor(ahora());
    if (ms > ultimoMs) {
      // Milisegundo nuevo: el contador parte al azar en la mitad de abajo, para dejar espacio.
      const r = aleatorio(2);
      contador = (((r[0] ?? 0) << 8) | (r[1] ?? 0)) & 0x7ff;
      ultimoMs = ms;
    } else {
      // Mismo milisegundo (o el reloj volvió atrás): se usa el último y se suma 1 al contador.
      ms = ultimoMs;
      contador += 1;
      if (contador > MAX_CONTADOR) {
        ultimoMs += 1;
        ms = ultimoMs;
        contador = 0;
      }
    }
    return armarUuidV7(ms, contador, aleatorio(8));
  };
}

/** Arma el texto del UUID con la hora, el contador (12 bits) y 8 bytes al azar. */
export function armarUuidV7(ms: number, contador: number, azar: Uint8Array): string {
  const b = new Uint8Array(16);
  let t = ms;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = 0x70 | ((contador >> 8) & 0x0f);
  b[7] = contador & 0xff;
  for (let i = 0; i < 8; i++) b[8 + i] = azar[i] ?? 0;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** true si el texto es un UUID versión 7. */
export function esUuidV7(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
}
