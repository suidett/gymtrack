// ─────────────────────────────────────────────────────────────────────────────
// Servicio de avisos · Zona: Notificaciones (API)
//
// Qué hace: manda un aviso a una persona por los canales que correspondan y deja registro:
//   0. La notificación dentro de la app (la campana, ./bandeja.ts): SIEMPRE, antes que nada y
//      con la misma clave, aunque la persona no tenga dispositivos, haya llegado al tope o el
//      push falle. El tope es solo del push. Si no se pudo guardar, queda en el log y el aviso
//      sigue.
//   1. Si ese aviso (su clave) ya salió, no hace nada más (WRK-014).
//   2. Push: si cuenta para el tope y la persona ya recibió 2 hoy (día de su zona), no sale
//      (P-20, WRK-007, WRK-016). El dolor de 7 o más sale igual y cuenta. A cada dispositivo
//      vigente le manda por su canal: Expo para los tokens de la app Android, Web Push para la
//      app web. Los que el servicio marca como inválidos se borran.
//   3. Correo, si el aviso trae uno (alertas al entrenador): sale aunque el push no salga.
//   4. Registro y log con el tipo, el id de la persona y los conteos; nunca un correo, un nombre,
//      un token ni el texto del aviso.
// enFondo hace todo eso después de responder: una ruta nunca espera a Expo ni a Gmail y, si un
// aviso falla, la acción del usuario igual queda guardada.
// Tócalo cuando: cambie una regla del envío (el tope, qué cuenta, qué se borra).
// No lo toques para: los textos (./textos.ts), a quién avisar en cada evento (./eventos.ts) ni
// cómo se habla con Expo o el navegador (./proveedores.ts).
// Depende de: ./almacen, ./bandeja, ./proveedores, ./registro, ./config, src/correo (la forma del correo),
// ../progreso/zona (día local) y @gymtrack/shared (TOPE_AVISOS_DIA).
// ─────────────────────────────────────────────────────────────────────────────
import { TOPE_AVISOS_DIA } from '@gymtrack/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { CorreoSaliente } from '../../correo';
import { resumenError } from '../../errores';
import type { Reloj } from '../../reloj';
import { diaLocal } from '../progreso/zona';
import type { AlmacenDispositivos, Dispositivo, DispositivoExpo, DispositivoWeb } from './almacen';
import { notificacionDeAviso, type Bandeja, type ContenidoNotificacion } from './bandeja';
import type { ConfigAvisos } from './config';
import type { BuzonPush, MensajePush, ProveedoresPush, ResultadoEnvio } from './proveedores';
import type { RegistroAvisos } from './registro';
import type { CorreoAviso } from './textos';

export type TipoAviso = 'alerta' | 'dolor' | 'observacion' | 'consejo' | 'rutina' | 'recordatorio' | 'alertas_noche' | 'prueba';

export interface Destinatario {
  id: string;
  email: string;
  nombre: string;
  timezone: string;
  deletedAt: Date | null;
}

export interface Aviso {
  tipo: TipoAviso;
  /** Única por aviso: el mismo aviso dos veces no sale dos veces. */
  clave: string;
  para: Destinatario;
  push: MensajePush | null;
  correo: CorreoAviso | null;
  /** Cuenta para el tope de 2 push al día (todo menos la prueba). */
  cuentaTope: boolean;
  /** Sale aunque ya haya 2 hoy (dolor de 7 o más, P-20). Igual cuenta. */
  saltaTope?: boolean;
  /**
   * Lo que queda en la campana cuando no es lo mismo del push (el correo de la noche no trae
   * push). Sin esto, la notificación lleva el título, el texto y la ruta del push.
   */
  notificacion?: ContenidoNotificacion | null;
}

export type MotivoSinPush = 'tope' | 'sin_dispositivos' | 'sin_push';

export interface ResultadoAviso {
  /** true si ese aviso ya había salido: no se mandó nada otra vez. */
  repetido: boolean;
  /** true si este envío dejó la notificación en la campana (false si ya estaba o no hubo). */
  notificacion: boolean;
  push: {
    dispositivos: number;
    enviados: number;
    invalidos: number;
    fallidos: number;
    omitido: MotivoSinPush | null;
    resultados: { dispositivo: Dispositivo; resultado: ResultadoEnvio }[];
  };
  correo: boolean;
}

export interface ServicioAvisos {
  readonly config: ConfigAvisos;
  readonly dispositivos: AlmacenDispositivos;
  readonly registro: RegistroAvisos;
  /** Las notificaciones dentro de la app (las rutas de la campana la leen). */
  readonly bandeja: Bandeja;
  /** Lo que salió con PUSH_DRIVER memoria o consola (las pruebas lo leen). */
  readonly buzon: BuzonPush;
  enviar(aviso: Aviso): Promise<ResultadoAviso>;
  /** Arma y manda después de responder. Si algo falla queda en el log con la etiqueta. */
  enFondo(etiqueta: string, preparar: () => Promise<Aviso | Aviso[] | null | undefined>): void;
  /** Espera los envíos en curso (pruebas, apagado ordenado y el worker antes de salir). */
  esperar(): Promise<void>;
}

export function crearServicioAvisos(o: {
  config: ConfigAvisos;
  reloj: Reloj;
  dispositivos: AlmacenDispositivos;
  registro: RegistroAvisos;
  bandeja: Bandeja;
  proveedores: ProveedoresPush;
  buzon: BuzonPush;
  /** Encola el correo (en la API, ctx.correo.enviarEnSegundoPlano). */
  enviarCorreo: (c: CorreoSaliente) => void;
  log: Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>;
}): ServicioAvisos {
  const pendientes = new Set<Promise<void>>();
  const vacio = (omitido: MotivoSinPush | null): ResultadoAviso['push'] => ({
    dispositivos: 0, enviados: 0, invalidos: 0, fallidos: 0, omitido, resultados: [],
  });

  async function mandarPush(para: Destinatario, m: MensajePush): Promise<ResultadoAviso['push']> {
    const ds = await o.dispositivos.activosDe(para.id);
    if (ds.length === 0) return vacio('sin_dispositivos');
    const expo = ds.filter((d): d is DispositivoExpo => d.tipo === 'expo');
    const web = ds.filter((d): d is DispositivoWeb => d.tipo === 'web');
    const [re, rw] = await Promise.all([
      expo.length ? o.proveedores.expo(expo, m) : new Map<string, ResultadoEnvio>(),
      web.length ? o.proveedores.web(web, m) : new Map<string, ResultadoEnvio>(),
    ]);
    const resultados = ds.map((d) => ({ dispositivo: d, resultado: (d.tipo === 'expo' ? re : rw).get(d.id) ?? ('fallido' as const) }));
    const invalidos = resultados.filter((r) => r.resultado === 'invalido').map((r) => r.dispositivo.id);
    if (invalidos.length) await o.dispositivos.invalidar(invalidos);
    const contar = (x: ResultadoEnvio) => resultados.filter((r) => r.resultado === x).length;
    return { dispositivos: ds.length, enviados: contar('enviado'), invalidos: contar('invalido'), fallidos: contar('fallido'), omitido: null, resultados };
  }

  /** La campana: una por clave. Si la base falla, el aviso sigue (el push y el correo igual salen). */
  async function guardarNotificacion(aviso: Aviso, ahora: Date): Promise<boolean> {
    const n = notificacionDeAviso(aviso);
    if (!n) return false;
    try {
      return await o.bandeja.crear(n, ahora);
    } catch (err) {
      o.log.error({ aviso: aviso.tipo, usuario_id: aviso.para.id, error: resumenError(err) }, 'no se pudo guardar la notificación');
      return false;
    }
  }

  async function enviar(aviso: Aviso): Promise<ResultadoAviso> {
    const para = aviso.para;
    if (para.deletedAt) return { repetido: false, notificacion: false, push: vacio('sin_push'), correo: false };
    const ahora = o.reloj.ahora();
    // Primero la campana: no depende de dispositivos, del tope ni de que el push salga.
    const notificacion = await guardarNotificacion(aviso, ahora);
    const dia = diaLocal(ahora, para.timezone || 'America/Santiago');
    const reservado = await o.registro.reservar({ clave: aviso.clave, usuarioId: para.id, dia, tipo: aviso.tipo, cuentaTope: aviso.cuentaTope }, ahora);
    if (!reservado) return { repetido: true, notificacion, push: vacio(null), correo: false };

    let push = vacio('sin_push');
    if (aviso.push) {
      const yaHoy = aviso.cuentaTope && !aviso.saltaTope ? await o.registro.contarHoy(para.id, dia) : 0;
      push = yaHoy >= TOPE_AVISOS_DIA ? vacio('tope') : await mandarPush(para, aviso.push);
    }
    let correo = false;
    if (aviso.correo) {
      o.enviarCorreo({ para: para.email, ...aviso.correo, etiqueta: 'aviso', usuarioId: para.id });
      correo = true;
    }
    await o.registro.cerrar(aviso.clave, { pushEnviados: push.enviados, pushFallidos: push.fallidos, correo, omitido: push.omitido });
    o.log.info(
      {
        aviso: aviso.tipo, usuario_id: para.id,
        push: { dispositivos: push.dispositivos, enviados: push.enviados, invalidos: push.invalidos, fallidos: push.fallidos, omitido: push.omitido },
        correo,
        notificacion,
      },
      'aviso',
    );
    return { repetido: false, notificacion, push, correo };
  }

  return {
    config: o.config,
    dispositivos: o.dispositivos,
    registro: o.registro,
    bandeja: o.bandeja,
    buzon: o.buzon,
    enviar,
    enFondo(etiqueta, preparar) {
      // setImmediate: el trabajo empieza después de que la respuesta salió.
      const p = new Promise<void>((listo) => setImmediate(listo))
        .then(preparar)
        .then(async (avisos) => {
          for (const a of [avisos ?? []].flat()) await enviar(a);
        })
        .catch((err: unknown) => {
          o.log.error({ aviso: etiqueta, error: resumenError(err) }, 'no se pudo mandar el aviso');
        })
        .finally(() => pendientes.delete(p));
      pendientes.add(p);
    },
    async esperar() {
      while (pendientes.size) await Promise.all([...pendientes]);
    },
  };
}
