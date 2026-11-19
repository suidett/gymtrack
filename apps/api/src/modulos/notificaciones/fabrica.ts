// ─────────────────────────────────────────────────────────────────────────────
// Armado del servicio de avisos · Zona: Notificaciones (API)
//
// Qué hace: junta las piezas del servicio con la configuración del entorno: los proveedores que
// pide PUSH_DRIVER, el almacén de dispositivos con el cifrado que sale de JWT_SECRET, el registro
// (la tabla avisos_enviados, compartida por la API y el worker), la bandeja de la campana (la tabla
// notificaciones) y quién manda los correos. Lo usan el
// módulo (./index.ts, con el correo de la API) y el worker (src/worker/avisos.ts, con el suyo).
// Tócalo cuando: el servicio necesite otra pieza.
// No lo toques para: lo que hace cada pieza (su archivo).
// Depende de: ./config, ./cifrado, ./almacen, ./bandeja, ./registro, ./proveedores y ./servicio.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyBaseLogger } from 'fastify';
import type { CorreoSaliente } from '../../correo';
import type { BaseDeDatos } from '../../db';
import type { Reloj } from '../../reloj';
import { crearAlmacenDispositivos } from './almacen';
import { crearBandeja } from './bandeja';
import { crearCifrador } from './cifrado';
import { leerConfigAvisos } from './config';
import { crearBuzonPush, crearProveedores } from './proveedores';
import { crearRegistroEnBase } from './registro';
import { crearServicioAvisos, type ServicioAvisos } from './servicio';

export function armarServicioAvisos(o: {
  prisma: BaseDeDatos;
  reloj: Reloj;
  jwtSecreto: string;
  enviarCorreo: (c: CorreoSaliente) => void;
  log: Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>;
  env?: Record<string, string | undefined>;
}): ServicioAvisos {
  const config = leerConfigAvisos(o.env);
  const buzon = crearBuzonPush();
  const registro = crearRegistroEnBase(o.prisma);
  return crearServicioAvisos({
    config,
    reloj: o.reloj,
    dispositivos: crearAlmacenDispositivos(o.prisma, crearCifrador(o.jwtSecreto)),
    registro,
    bandeja: crearBandeja(o.prisma),
    proveedores: crearProveedores(config, buzon, o.log),
    buzon,
    enviarCorreo: o.enviarCorreo,
    log: o.log,
  });
}
