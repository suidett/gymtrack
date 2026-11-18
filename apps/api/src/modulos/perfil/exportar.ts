// ─────────────────────────────────────────────────────────────────────────────
// Exportación de datos · Zona: Perfil (API)
//
// Qué hace: arma el ZIP de «Exportar mis datos» (CU-53). Para el alumno: CSV de sesiones, series,
// medidas, encuesta y observaciones (§API); para el entrenador: rutinas, ejercicios propios y las
// observaciones que escribió (P-26), sin datos de salud de sus clientes. Los CSV van en UTF-8 con
// BOM, separador coma, punto decimal y fechas ISO 8601 con zona (P-48). También firma y lee el
// token de la URL de descarga (HMAC con el secreto del JWT, vence a los 15 minutos, SEG-027).
// El ZIP se escribe a mano (deflate de node:zlib y crc32), sin dependencias.
// Tócalo cuando: cambie qué trae la exportación o el formato de los CSV.
// No lo toques para: las rutas (index.ts).
// Depende de: node:crypto, node:zlib y la base.
// ─────────────────────────────────────────────────────────────────────────────
import { DURACION_EXPORTACION_MS } from '@gymtrack/shared';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { crc32, deflateRawSync } from 'node:zlib';
import type { BaseDeDatos } from '../../db';
import type { Usuario } from '../../generado/prisma/client';

// ── CSV (P-48) ───────────────────────────────────────────────────────────────
type Celda = string | number | boolean | Date | null | undefined;

function celda(v: Celda): string {
  if (v === null || v === undefined) return '';
  const texto = v instanceof Date ? v.toISOString() : String(v);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Un CSV con BOM y encabezados; sin filas trae solo los encabezados (CU-53 A2). */
export function aCsv(encabezados: readonly string[], filas: readonly Celda[][]): string {
  const lineas = [encabezados.map(celda).join(','), ...filas.map((f) => f.map(celda).join(','))];
  return `﻿${lineas.join('\r\n')}\r\n`;
}

const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

// ── ZIP ──────────────────────────────────────────────────────────────────────
export interface ArchivoZip {
  nombre: string;
  contenido: string;
}

function fechaDos(d: Date): { hora: number; fecha: number } {
  return {
    hora: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | Math.floor(d.getUTCSeconds() / 2),
    fecha: ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
  };
}

/** Un ZIP con deflate. Los nombres van en UTF-8 (bit 11). */
export function armarZip(archivos: readonly ArchivoZip[], cuando: Date): Buffer {
  const { hora, fecha } = fechaDos(cuando);
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  for (const a of archivos) {
    const nombre = Buffer.from(a.nombre, 'utf8');
    const datos = Buffer.from(a.contenido, 'utf8');
    const comprimido = deflateRawSync(datos);
    const crc = crc32(datos);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(fecha, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(hora, 12);
    central.writeUInt16LE(fecha, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(datos.length, 24);
    central.writeUInt16LE(nombre.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    locales.push(local, nombre, comprimido);
    centrales.push(central, nombre);
    desplazamiento += local.length + nombre.length + comprimido.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

// ── Token de la URL firmada ──────────────────────────────────────────────────
const firma = (secreto: string, cuerpo: string) =>
  createHmac('sha256', secreto).update(`gymtrack-export:${cuerpo}`).digest('base64url');

/** Token `<usuario>.<vence_ms>.<firma>` que vale 15 minutos desde `ahora`. */
export function firmarExportacion(secreto: string, usuarioId: string, ahora: Date): { token: string; venceAt: Date } {
  const venceAt = new Date(ahora.getTime() + DURACION_EXPORTACION_MS);
  const cuerpo = `${usuarioId}.${venceAt.getTime()}`;
  return { token: `${cuerpo}.${firma(secreto, cuerpo)}`, venceAt };
}

/** El id del usuario si el token es auténtico y no venció; si no, null. */
export function leerExportacion(secreto: string, token: string, ahora: Date): string | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [usuarioId, vence, recibida] = partes as [string, string, string];
  const esperada = Buffer.from(firma(secreto, `${usuarioId}.${vence}`));
  const dada = Buffer.from(recibida);
  if (esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) return null;
  if (!/^\d+$/.test(vence) || Number(vence) <= ahora.getTime()) return null;
  return usuarioId;
}

// ── Qué trae ─────────────────────────────────────────────────────────────────
export const ARCHIVOS_ALUMNO = ['sesiones.csv', 'series.csv', 'medidas.csv', 'encuesta.csv', 'observaciones.csv'] as const;
export const ARCHIVOS_ENTRENADOR = ['rutinas.csv', 'ejercicios.csv', 'observaciones.csv'] as const;

const ENCABEZADOS_OBSERVACIONES = [
  'id', 'autor_id', 'client_id', 'tipo', 'exercise_id', 'session_id', 'set_id', 'routine_id', 'texto',
  'dolor_zona', 'dolor_intensidad', 'created_at',
] as const;

/** Los CSV de esta persona: solo filas suyas (SEG-027). */
export async function archivosDe(prisma: BaseDeDatos, usuario: Usuario): Promise<ArchivoZip[]> {
  if (usuario.rol === 'trainer') {
    const [rutinas, ejercicios, observaciones] = await Promise.all([
      prisma.rutina.findMany({ where: { duenoId: usuario.id, deletedAt: null }, orderBy: { createdAt: 'asc' } }),
      prisma.ejercicio.findMany({ where: { duenoId: usuario.id, deletedAt: null }, orderBy: { createdAt: 'asc' } }),
      prisma.observacion.findMany({ where: { autorId: usuario.id }, orderBy: { createdAt: 'asc' } }),
    ]);
    return [
      {
        nombre: 'rutinas.csv',
        contenido: aCsv(
          ['id', 'nombre', 'descripcion', 'semanas', 'metodo_progresion', 'estado', 'client_id', 'version', 'created_at'],
          rutinas.map((r) => [r.id, r.nombre, r.descripcion, r.semanas, r.metodoProgresion, r.estado, r.alumnoId, r.version, r.createdAt]),
        ),
      },
      {
        nombre: 'ejercicios.csv',
        contenido: aCsv(
          ['id', 'nombre', 'grupo_muscular', 'equipo', 'patron', 'tipo_carga', 'incremento_default_kg', 'instrucciones', 'created_at'],
          ejercicios.map((x) => [x.id, x.nombre, x.grupoMuscular, x.equipo, x.patron, x.tipoCarga, x.incrementoDefaultKg, x.instrucciones, x.createdAt]),
        ),
      },
      {
        // Lo que escribió; sin zona ni intensidad de dolor (son datos de salud de sus clientes).
        nombre: 'observaciones.csv',
        contenido: aCsv(
          ENCABEZADOS_OBSERVACIONES,
          observaciones.map((o) => [o.id, o.autorId, o.alumnoId, o.tipo, o.ejercicioId, o.sesionId, o.serieId, o.rutinaId, o.texto, null, null, o.createdAt]),
        ),
      },
    ];
  }

  const [sesiones, series, medidas, encuestas, observaciones] = await Promise.all([
    prisma.sesionEntreno.findMany({ where: { alumnoId: usuario.id }, orderBy: { iniciadaAt: 'asc' } }),
    prisma.serie.findMany({
      where: { alumnoId: usuario.id },
      orderBy: [{ createdAt: 'asc' }, { serieN: 'asc' }],
      include: { ejercicio: { select: { nombre: true } } },
    }),
    prisma.medidaCorporal.findMany({ where: { alumnoId: usuario.id }, orderBy: { fecha: 'asc' } }),
    prisma.respuestaEncuesta.findMany({ where: { alumnoId: usuario.id }, orderBy: { completadaAt: 'asc' } }),
    prisma.observacion.findMany({ where: { alumnoId: usuario.id }, orderBy: { createdAt: 'asc' } }),
  ]);
  return [
    {
      nombre: 'sesiones.csv',
      contenido: aCsv(
        ['id', 'routine_id', 'routine_day_id', 'iniciada_at', 'cerrada_at', 'estado', 'duracion_s', 'volumen_kg', 'kcal_estimadas', 'observacion'],
        sesiones.map((s) => [s.id, s.rutinaId, s.diaRutinaId, s.iniciadaAt, s.cerradaAt, s.estado, s.duracionS, s.volumenKg, s.kcalEstimadas, s.observacion]),
      ),
    },
    {
      nombre: 'series.csv',
      contenido: aCsv(
        ['id', 'session_id', 'exercise_id', 'ejercicio', 'serie_n', 'peso_kg', 'reps', 'rir', 'rpe', 'completada', 'fallo', 'tiempo_s', 'descanso_real_s', 'e1rm_kg', 'nota', 'created_at'],
        series.map((s) => [s.id, s.sesionId, s.ejercicioId, s.ejercicio.nombre, s.serieN, s.pesoKg, s.reps, s.rir, s.rpe, s.completada, s.fallo, s.tiempoS, s.descansoRealS, s.e1rm, s.nota, s.createdAt]),
      ),
    },
    {
      nombre: 'medidas.csv',
      contenido: aCsv(
        ['fecha', 'peso_kg', 'cintura_cm', 'cadera_cm', 'pecho_cm', 'brazo_cm', 'muslo_cm', 'grasa_pct', 'nota'],
        medidas.map((m) => [dia(m.fecha), m.pesoKg, m.cinturaCm, m.caderaCm, m.pechoCm, m.brazoCm, m.musloCm, m.grasaPct, m.nota]),
      ),
    },
    {
      nombre: 'encuesta.csv',
      contenido: aCsv(
        ['id', 'version', 'completada_at', 'pregunta', 'respuesta'],
        encuestas.flatMap((e) =>
          Object.entries((e.respuestas ?? {}) as Record<string, unknown>).map(([pregunta, valor]) => [
            e.id, e.version, e.completadaAt, pregunta, typeof valor === 'object' && valor !== null ? JSON.stringify(valor) : (valor as Celda),
          ]),
        ),
      ),
    },
    {
      nombre: 'observaciones.csv',
      contenido: aCsv(
        ENCABEZADOS_OBSERVACIONES,
        observaciones.map((o) => [o.id, o.autorId, o.alumnoId, o.tipo, o.ejercicioId, o.sesionId, o.serieId, o.rutinaId, o.texto, o.dolorZona, o.dolorIntensidad, o.createdAt]),
      ),
    },
  ];
}
