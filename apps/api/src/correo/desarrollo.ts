// ─────────────────────────────────────────────────────────────────────────────
// Adaptadores de desarrollo y pruebas · Zona: Correo (API)
//
// Qué hace: dos adaptadores que no mandan nada a internet. `memoria` guarda cada correo en un
// buzón que las pruebas leen (el último por destinatario). `consola` hace lo mismo y además deja
// una línea en el log con el tipo de correo y el id del usuario, sin el correo ni el token
// completo; si defines CORREO_CARPETA, escribe el correo entero (con el enlace) en esa carpeta
// para que puedas abrirlo en local. Esa carpeta no es un log y no se commitea.
// Tócalo cuando: necesites otra forma de mirar los correos en local (por ejemplo Mailpit).
// No lo toques para: el texto (plantillas.ts) ni para producción (resend.ts).
// Depende de: ./tipos, node:fs y el logger de Fastify (pino).
// ─────────────────────────────────────────────────────────────────────────────
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyBaseLogger } from 'fastify';
import { enmascararToken } from '../seguridad/tokens';
import type { AdaptadorCorreo, CorreoSaliente } from './tipos';

export interface Buzon {
  todos(): readonly CorreoSaliente[];
  /** El último correo que recibió `para`, o undefined. */
  ultimo(para: string): CorreoSaliente | undefined;
  vaciar(): void;
}

export function crearBuzon(): Buzon {
  const correos: CorreoSaliente[] = [];
  return {
    todos: () => correos,
    ultimo: (para) => [...correos].reverse().find((c) => c.para === para),
    vaciar: () => {
      correos.length = 0;
    },
  };
}

export function crearAdaptadorMemoria(buzon: Buzon): AdaptadorCorreo & { buzon: Buzon } {
  return {
    nombre: 'memoria',
    buzon,
    async enviar(correo) {
      (buzon.todos() as CorreoSaliente[]).push(correo);
    },
  };
}

/** El enlace de recuperación del texto, con el token enmascarado. Sin nombre ni correo (SEG-018). */
export function extraerEnlaceEnmascarado(texto: string): string | undefined {
  const m = /(\S+)token=([A-Za-z0-9_-]+)/.exec(texto);
  return m ? `${m[1]}token=${enmascararToken(m[2]!)}` : undefined;
}

export function crearAdaptadorConsola(opciones: { log: FastifyBaseLogger; carpeta?: string; buzon: Buzon }): AdaptadorCorreo {
  const memoria = crearAdaptadorMemoria(opciones.buzon);
  return {
    nombre: 'consola',
    async enviar(correo) {
      await memoria.enviar(correo);
      let archivo: string | undefined;
      if (opciones.carpeta) {
        await mkdir(opciones.carpeta, { recursive: true });
        archivo = join(opciones.carpeta, `${Date.now()}-${correo.etiqueta}-${correo.usuarioId}.txt`);
        await writeFile(archivo, `Para: ${correo.para}\nAsunto: ${correo.asunto}\n\n${correo.texto}\n`, 'utf8');
      }
      opciones.log.info(
        { correo: correo.etiqueta, usuario_id: correo.usuarioId, archivo, enlace: extraerEnlaceEnmascarado(correo.texto) },
        'correo de desarrollo (no salió a internet)',
      );
    },
  };
}
