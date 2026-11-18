// ─────────────────────────────────────────────────────────────────────────────
// Módulo rutinas · Zona: Rutinas (API)
//
// Qué hace: las rutas de Rutinas de §API: listar, crear, leer, editar, reemplazar los días,
// asignar, activar, duplicar y archivar. Se registra solo bajo /v1 (src/compartido/modulos.ts).
// Permisos (§Roles y P-01):
//   - Lo que no puedes leer (vista.ts) da 404, igual que lo que no existe.
//   - Editar, cambiar días, archivar y activar: solo el dueño. Lo que lees sin ser dueño (el alumno
//     vinculado con la rutina de su entrenador, PERM-08; el entrenador con la que el alumno se hizo
//     solo, P-44) da 403 FORBIDDEN.
//   - Asignar: solo el entrenador (los alumnos, 403; PERM-11 y 12), a un cliente con vínculo
//     activo (otro, 404). Crea una copia por cliente (P-43).
//   - Crear para un cliente: el entrenador con client_id de un cliente activo (otro, 404; PERM-07).
//   - Activar una plantilla (sin alumno) da 422 BUSINESS_RULE; una rutina vacía, 422 ROUTINE_EMPTY.
// Tócalo cuando: agregues o cambies una ruta de rutinas.
// No lo toques para: cómo se guarda o activa (servicio.ts), quién lee (vista.ts) ni la forma
// (packages/shared/src/api/rutinas.ts).
// Depende de: src/compartido, ./servicio, ./vista y @gymtrack/shared (RUTAS_RUTINAS).
// ─────────────────────────────────────────────────────────────────────────────
import { RUTAS_RUTINAS as R } from '@gymtrack/shared';
import {
  armarPagina, definirModulo, esquemaDe, exigirClienteDe, existeOFalla, fallar, idsDeClientes, noEncontrado,
  paginaPorId, prohibido, urlDe, usuarioDe, vinculoActivo,
} from '../../compartido';
import type { BaseDeDatos } from '../../db';
import type { Usuario } from '../../generado/prisma/client';
import {
  activarRutina, archivarRutina, copiarRutina, crearRutina, exigirConEjercicios, reemplazarDias, validarEstructura,
} from './servicio';
import { INCLUIR_RUTINA, puedeLeer, rutinaAApi, type RutinaCompleta } from './vista';

type Quien = Pick<Usuario, 'id' | 'rol'>;
const SIN_CLIENTES: ReadonlySet<string> = new Set();

/** Los alumnos que alcanza esta persona para una rutina dada: el de la rutina, si el entrenador tiene vínculo activo. */
async function clientesPara(prisma: BaseDeDatos, quien: Quien, alumnoId: string | null): Promise<ReadonlySet<string>> {
  if (quien.rol !== 'trainer' || !alumnoId) return SIN_CLIENTES;
  return (await vinculoActivo(prisma, quien.id, alumnoId)) ? new Set([alumnoId]) : SIN_CLIENTES;
}

interface RutinaLeida {
  rutina: RutinaCompleta;
  clientes: ReadonlySet<string>;
}

/** La rutina si esta persona la lee; si no, 404. */
async function leerRutina(prisma: BaseDeDatos, quien: Quien, id: string): Promise<RutinaLeida> {
  const rutina = existeOFalla(await prisma.rutina.findUnique({ where: { id }, include: INCLUIR_RUTINA }));
  const clientes = await clientesPara(prisma, quien, rutina.alumnoId);
  if (!puedeLeer(rutina, quien, clientes)) noEncontrado();
  return { rutina, clientes };
}

/** La rutina si esta persona es su dueña: 404 si no la lee, 403 si la lee sin ser dueña. */
async function leerPropia(prisma: BaseDeDatos, quien: Quien, id: string): Promise<RutinaLeida> {
  const leida = await leerRutina(prisma, quien, id);
  if (leida.rutina.duenoId !== quien.id) prohibido();
  return leida;
}

/** El nombre de una copia: «<nombre> (copia)», sin pasar de 80 caracteres. */
function nombreCopia(nombre: string): string {
  const sufijo = ' (copia)';
  return `${nombre.slice(0, 80 - sufijo.length)}${sufijo}`;
}

export default definirModulo(async (app, ctx) => {
  const { prisma } = ctx;
  const recargar = (id: string) => prisma.rutina.findUniqueOrThrow({ where: { id }, include: INCLUIR_RUTINA });

  // ── Lista ──────────────────────────────────────────────────────────────────
  app.get(urlDe(R.listar), { schema: esquemaDe(R.listar), preHandler: app.exigirSesion }, async (req) => {
    const usuario = usuarioDe(req);
    const { client_id: clientId, estado } = req.query;
    let donde: { alumnoId: string } | { duenoId: string };
    let clientes = SIN_CLIENTES;
    if (usuario.rol === 'client') {
      if (clientId && clientId !== usuario.id) noEncontrado();
      // Las propias y las que le asignó su entrenador; nunca las plantillas (PERM-39).
      donde = { alumnoId: usuario.id };
    } else {
      clientes = new Set(await idsDeClientes(prisma, usuario.id));
      if (clientId) {
        await exigirClienteDe(prisma, usuario.id, clientId);
        donde = { alumnoId: clientId };
      } else {
        // Su biblioteca: plantillas y las que escribió para sus clientes.
        donde = { duenoId: usuario.id };
      }
    }
    const p = paginaPorId(req.query, 'desc');
    const filas = await prisma.rutina.findMany({
      where: { ...p.where, ...donde, deletedAt: null, ...(estado ? { estado } : {}) },
      orderBy: p.orderBy,
      take: p.take,
      include: INCLUIR_RUTINA,
    });
    const pagina = armarPagina(filas, req.query.limit, (u) => ({ id: u.id }));
    const ahora = ctx.reloj.ahora();
    return { items: pagina.items.map((r) => rutinaAApi(r, usuario, clientes, ahora)), next_cursor: pagina.next_cursor };
  });

  // ── Crear ──────────────────────────────────────────────────────────────────
  app.post(urlDe(R.crear), { schema: esquemaDe(R.crear), preHandler: app.exigirPermiso('editarRutinas') }, async (req, reply) => {
    const usuario = usuarioDe(req);
    const c = req.body;
    let alumnoId: string | null;
    if (usuario.rol === 'client') {
      // El alumno solo se arma rutinas a sí mismo: asignar es del entrenador.
      if (c.client_id && c.client_id !== usuario.id) prohibido();
      alumnoId = usuario.id;
    } else {
      alumnoId = c.client_id ?? null;
      if (alumnoId) await exigirClienteDe(prisma, usuario.id, alumnoId);
    }
    const usables = await validarEstructura(prisma, c.dias, { duenoId: usuario.id, alumnoId });
    const ahora = ctx.reloj.ahora();
    const rutina = await crearRutina(
      prisma,
      {
        duenoId: usuario.id,
        alumnoId,
        nombre: c.nombre,
        descripcion: c.descripcion || null,
        semanas: c.semanas,
        metodoProgresion: c.metodo_progresion,
      },
      c.dias,
      usables,
      ahora,
    );
    const clientes = alumnoId && usuario.rol === 'trainer' ? new Set([alumnoId]) : SIN_CLIENTES;
    return reply.code(201).send(rutinaAApi(rutina, usuario, clientes, ahora));
  });

  // ── Detalle ────────────────────────────────────────────────────────────────
  app.get(urlDe(R.detalle), { schema: esquemaDe(R.detalle), preHandler: app.exigirSesion }, async (req) => {
    const usuario = usuarioDe(req);
    const { rutina, clientes } = await leerRutina(prisma, usuario, req.params.id);
    return rutinaAApi(rutina, usuario, clientes, ctx.reloj.ahora());
  });

  // ── Editar nombre, descripción, método y semanas ───────────────────────────
  app.patch(urlDe(R.editar), { schema: esquemaDe(R.editar), preHandler: app.exigirPermiso('editarRutinas') }, async (req) => {
    const usuario = usuarioDe(req);
    const { rutina, clientes } = await leerPropia(prisma, usuario, req.params.id);
    const c = req.body;
    const ahora = ctx.reloj.ahora();
    await prisma.rutina.update({
      where: { id: rutina.id },
      data: {
        nombre: c.nombre,
        descripcion: c.descripcion === undefined ? undefined : c.descripcion || null,
        semanas: c.semanas,
        metodoProgresion: c.metodo_progresion,
        updatedAt: ahora,
      },
    });
    return rutinaAApi(await recargar(rutina.id), usuario, clientes, ahora);
  });

  // ── Reemplazar los días ────────────────────────────────────────────────────
  app.put(urlDe(R.reemplazarDias), { schema: esquemaDe(R.reemplazarDias), preHandler: app.exigirPermiso('editarRutinas') }, async (req) => {
    const usuario = usuarioDe(req);
    const { rutina, clientes } = await leerPropia(prisma, usuario, req.params.id);
    const { dias } = req.body;
    const usables = await validarEstructura(prisma, dias, { duenoId: rutina.duenoId, alumnoId: rutina.alumnoId, rutinaId: rutina.id });
    // Una rutina activa no puede quedar con un día vacío: Hoy no tendría qué mostrar.
    if (rutina.estado === 'activa' && dias.some((d) => d.ejercicios.length === 0)) {
      fallar('ROUTINE_EMPTY', { routine_id: rutina.id, dias_vacios: dias.flatMap((d, i) => (d.ejercicios.length === 0 ? [i] : [])) });
    }
    const ahora = ctx.reloj.ahora();
    await reemplazarDias(prisma, rutina, dias, usables, ahora);
    return rutinaAApi(await recargar(rutina.id), usuario, clientes, ahora);
  });

  // ── Asignar (copia por cliente, P-43) ──────────────────────────────────────
  app.post(urlDe(R.asignar), { schema: esquemaDe(R.asignar), preHandler: app.exigirPermiso('asignarRutina') }, async (req, reply) => {
    const usuario = usuarioDe(req);
    const { rutina } = await leerPropia(prisma, usuario, req.params.id);
    const { client_id: clientId, activar } = req.body;
    await exigirClienteDe(prisma, usuario.id, clientId);
    if (activar) exigirConEjercicios(rutina);
    const ahora = ctx.reloj.ahora();
    const copia = await copiarRutina(prisma, rutina, { duenoId: usuario.id, alumnoId: clientId, nombre: rutina.nombre }, ahora);
    if (activar) await activarRutina(prisma, copia, clientId, ahora);
    return reply.code(201).send(rutinaAApi(await recargar(copia.id), usuario, new Set([clientId]), ahora));
  });

  // ── Activar ────────────────────────────────────────────────────────────────
  app.post(urlDe(R.activar), { schema: esquemaDe(R.activar), preHandler: app.exigirPermiso('activarRutina') }, async (req) => {
    const usuario = usuarioDe(req);
    const { rutina, clientes } = await leerPropia(prisma, usuario, req.params.id);
    const alumnoId = rutina.alumnoId;
    if (!alumnoId) {
      fallar('BUSINESS_RULE', { routine_id: rutina.id, regla: 'plantilla' }, 'Una plantilla no se activa: asígnala primero a un cliente.');
    }
    // El entrenador activa solo para un cliente con vínculo activo.
    if (usuario.rol === 'trainer') await exigirClienteDe(prisma, usuario.id, alumnoId);
    exigirConEjercicios(rutina);
    const ahora = ctx.reloj.ahora();
    await activarRutina(prisma, rutina, alumnoId, ahora);
    return rutinaAApi(await recargar(rutina.id), usuario, clientes, ahora);
  });

  // ── Duplicar ───────────────────────────────────────────────────────────────
  app.post(urlDe(R.duplicar), { schema: esquemaDe(R.duplicar), preHandler: app.exigirSesion }, async (req, reply) => {
    const usuario = usuarioDe(req);
    const { rutina } = await leerRutina(prisma, usuario, req.params.id);
    const c = req.body ?? {};
    let alumnoId: string | null;
    if (usuario.rol === 'client') {
      if (c.client_id && c.client_id !== usuario.id) prohibido();
      alumnoId = usuario.id;
    } else {
      alumnoId = c.client_id ?? null;
      if (alumnoId) await exigirClienteDe(prisma, usuario.id, alumnoId);
    }
    const ahora = ctx.reloj.ahora();
    const copia = await copiarRutina(prisma, rutina, { duenoId: usuario.id, alumnoId, nombre: c.nombre ?? nombreCopia(rutina.nombre) }, ahora);
    const clientes = alumnoId && usuario.rol === 'trainer' ? new Set([alumnoId]) : SIN_CLIENTES;
    return reply.code(201).send(rutinaAApi(copia, usuario, clientes, ahora));
  });

  // ── Archivar ───────────────────────────────────────────────────────────────
  app.delete(urlDe(R.archivar), { schema: esquemaDe(R.archivar), preHandler: app.exigirPermiso('editarRutinas') }, async (req) => {
    const usuario = usuarioDe(req);
    const { rutina, clientes } = await leerPropia(prisma, usuario, req.params.id);
    const ahora = ctx.reloj.ahora();
    await archivarRutina(prisma, rutina, ahora);
    return rutinaAApi(await recargar(rutina.id), usuario, clientes, ahora);
  });
});
