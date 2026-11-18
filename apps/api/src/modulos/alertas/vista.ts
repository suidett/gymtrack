// ─────────────────────────────────────────────────────────────────────────────
// Alerta para la API · Zona: Alertas (API)
//
// Qué hace: convierte una fila de alerts (con su alumno, su ejercicio y su reporte de baja) en la
// forma de esquemaAlerta del contrato. La usan las rutas de este módulo y la ficha del cliente del
// módulo entrenador. Lo que anotó quien la resolvió vive en detalle.resolucion y sale aparte, en
// `acciones`, para que `detalle` sea solo el dato que la disparó.
// Tócalo cuando: cambie la forma de una alerta en la respuesta.
// No lo toques para: cuándo se crea una alerta (./deteccion.ts).
// Depende de: el cliente de Prisma y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { ACCIONES_RESOLUCION, TIPOS_ALERTA_CON_MOTIVOS } from '@gymtrack/shared';
import type { Prisma } from '../../generado/prisma/client';

export const incluirAlerta = {
  alumno: { select: { id: true, nombre: true, apellido: true } },
  ejercicio: { select: { id: true, nombre: true } },
  reporte: true,
} satisfies Prisma.AlertaInclude;

export type AlertaConDetalle = Prisma.AlertaGetPayload<{ include: typeof incluirAlerta }>;

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** true si la alerta le pide sus motivos al alumno: estancamiento o baja, abierta y sin reporte. */
export function pideMotivos(a: Pick<AlertaConDetalle, 'tipo' | 'estado' | 'reporte'>): boolean {
  return (TIPOS_ALERTA_CON_MOTIVOS as readonly string[]).includes(a.tipo) && a.estado !== 'resuelta' && !a.reporte;
}

export function alertaAApi(a: AlertaConDetalle) {
  const { resolucion, ...detalle } = esObjeto(a.detalle) ? a.detalle : {};
  const acciones = esObjeto(resolucion) && Array.isArray(resolucion.acciones)
    ? resolucion.acciones.filter((x): x is (typeof ACCIONES_RESOLUCION)[number] => (ACCIONES_RESOLUCION as readonly unknown[]).includes(x))
    : [];
  return {
    id: a.id,
    tipo: a.tipo,
    estado: a.estado,
    client: a.alumno,
    exercise: a.ejercicio,
    detalle,
    pide_motivos: pideMotivos(a),
    reporte: a.reporte
      ? {
          id: a.reporte.id,
          motivos: a.reporte.motivos,
          comentario: a.reporte.comentario,
          consejos_mostrados: a.reporte.consejosMostrados.length,
          created_at: a.reporte.createdAt.toISOString(),
        }
      : null,
    acciones,
    created_at: a.createdAt.toISOString(),
    vista_at: a.vistaAt?.toISOString() ?? null,
    resuelta_at: a.resueltaAt?.toISOString() ?? null,
  };
}
