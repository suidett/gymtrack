// ─────────────────────────────────────────────────────────────────────────────
// Servicio de cuentas · Zona: Cuentas (API)
//
// Qué hace: la lógica de las cuentas, sin nada de HTTP: registrar (Argon2id, correo de
// bienvenida), ingresar (mensaje genérico, cuenta marcada para borrado), emitir el par de tokens,
// rotar el refresh con detección de reuso (un refresh revocado que vuelve revoca todos los del
// usuario), cerrar la sesión de un dispositivo, pedir el enlace de recuperación (1 hora, un solo
// uso) y guardar la contraseña nueva (revoca todos los refresh).
// Tócalo cuando: cambie una regla de §API «Cuentas y perfil» o de §Seguridad.
// No lo toques para: la forma de la entrada o la salida (packages/shared/src/api/cuentas.ts), ni
// para los límites de intentos (src/seguridad/limitador.ts, aplicados en rutas.ts).
// Depende de: la base (Prisma), el reloj inyectado, src/seguridad/* y el servicio de correo.
// ─────────────────────────────────────────────────────────────────────────────
import type { Sesion, Tokens, Usuario as UsuarioApi } from '@gymtrack/shared';
import { randomUUID } from 'node:crypto';
import type { Config } from '../config';
import { plantillaBienvenida, plantillaRecuperacion } from '../correo/plantillas';
import type { ServicioCorreo } from '../correo';
import { esDuplicado, type BaseDeDatos } from '../db';
import { ErrorApi } from '../errores';
import type { Usuario } from '../generado/prisma/client';
import type { Reloj } from '../reloj';
import { hashearContrasena, verificarContrasena, verificarSenuelo } from '../seguridad/contrasenas';
import { DURACION_ENLACE_MS, DURACION_REFRESH_MS, hashToken, tokenOpaco, type Firmador } from '../seguridad/tokens';

export interface DependenciasCuentas {
  prisma: BaseDeDatos;
  reloj: Reloj;
  firmador: Firmador;
  correo: ServicioCorreo;
  config: Pick<Config, 'enlaceRestablecer'>;
}

// ── Forma pública del usuario ────────────────────────────────────────────────
/** Lo que la API muestra de un usuario: nunca el hash ni los tokens (INT-018). */
export function aUsuarioApi(u: Usuario): UsuarioApi {
  return {
    id: u.id,
    email: u.email,
    rol: u.rol,
    nombre: u.nombre,
    apellido: u.apellido,
    timezone: u.timezone,
    unidades: u.unidades,
    descanso_default_s: u.descansoDefaultS,
    modo_gimnasio: u.modoGimnasio,
    // PENDIENTE (trainer_clients): el vínculo con el entrenador llega con su tabla.
    entrenador: null,
    // PENDIENTE (survey_responses): hoy todo alumno figura con la encuesta pendiente.
    encuesta_pendiente: u.rol === 'client',
    created_at: u.createdAt.toISOString(),
  };
}

export function crearServicioCuentas(d: DependenciasCuentas) {
  // ── Tokens ───────────────────────────────────────────────────────────────
  /** Emite un access y un refresh nuevo. Sin `familiaId` empieza una familia (un dispositivo nuevo). */
  async function emitirTokens(u: Pick<Usuario, 'id' | 'rol'>, familiaId?: string, db: Pick<BaseDeDatos, 'refreshToken'> = d.prisma) {
    const ahora = d.reloj.ahora();
    const access = await d.firmador.firmarAccess({ sub: u.id, rol: u.rol }, ahora);
    const refresh = tokenOpaco();
    const refreshVence = new Date(ahora.getTime() + DURACION_REFRESH_MS);
    const fila = await db.refreshToken.create({
      data: {
        usuarioId: u.id,
        tokenHash: hashToken(refresh),
        familiaId: familiaId ?? randomUUID(),
        expiresAt: refreshVence,
        createdAt: ahora,
      },
    });
    const tokens: Tokens = {
      token_type: 'Bearer',
      access_token: access.token,
      access_vence_at: access.venceAt.toISOString(),
      refresh_token: refresh,
      refresh_vence_at: refreshVence.toISOString(),
    };
    return { tokens, filaId: fila.id };
  }

  async function revocarTodos(usuarioId: string, ahora: Date, db: Pick<BaseDeDatos, 'refreshToken'> = d.prisma) {
    await db.refreshToken.updateMany({ where: { usuarioId, revocadoAt: null }, data: { revocadoAt: ahora } });
  }

  return {
    // ── Registro ───────────────────────────────────────────────────────────
    async registrar(e: { rol: 'trainer' | 'client'; nombre: string; apellido: string; email: string; password: string }): Promise<Sesion> {
      const passwordHash = await hashearContrasena(e.password);
      let u: Usuario;
      try {
        u = await d.prisma.usuario.create({
          data: { rol: e.rol, nombre: e.nombre, apellido: e.apellido, email: e.email, passwordHash, createdAt: d.reloj.ahora() },
        });
      } catch (err) {
        // P-36: el correo ya tiene cuenta. El índice único resuelve también dos registros a la vez.
        if (esDuplicado(err)) throw new ErrorApi('EMAIL_TAKEN');
        throw err;
      }
      const { tokens } = await emitirTokens(u);
      const correo = plantillaBienvenida({ nombre: u.nombre, rol: u.rol });
      d.correo.enviarEnSegundoPlano({ ...correo, para: u.email, etiqueta: 'bienvenida', usuarioId: u.id });
      return { usuario: aUsuarioApi(u), tokens };
    },

    // ── Ingreso ────────────────────────────────────────────────────────────
    async ingresar(e: { email: string; password: string }): Promise<Sesion> {
      const u = await d.prisma.usuario.findUnique({ where: { email: e.email } });
      if (!u) {
        await verificarSenuelo(e.password);
        throw new ErrorApi('INVALID_CREDENTIALS');
      }
      if (!(await verificarContrasena(u.passwordHash, e.password))) throw new ErrorApi('INVALID_CREDENTIALS');
      // P-24: solo se dice que la cuenta está marcada si la contraseña era correcta.
      if (u.deletedAt) throw new ErrorApi('ACCOUNT_DELETED');
      const { tokens } = await emitirTokens(u);
      return { usuario: aUsuarioApi(u), tokens };
    },

    // ── Refresh con rotación ───────────────────────────────────────────────
    async renovar(refreshToken: string): Promise<{ tokens: Tokens }> {
      const ahora = d.reloj.ahora();
      const fila = await d.prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(refreshToken) },
        include: { usuario: { select: { id: true, rol: true, deletedAt: true } } },
      });
      if (!fila) throw new ErrorApi('REFRESH_INVALID');
      // Reuso: un refresh ya revocado que vuelve es señal de robo. Se cierran todas las sesiones
      // del usuario en todos sus dispositivos (§Seguridad; INT-010, SEG-006).
      if (fila.revocadoAt) {
        await revocarTodos(fila.usuarioId, ahora);
        throw new ErrorApi('REFRESH_REUSED');
      }
      if (fila.expiresAt.getTime() <= ahora.getTime()) throw new ErrorApi('REFRESH_EXPIRED');
      if (fila.usuario.deletedAt) {
        await revocarTodos(fila.usuarioId, ahora);
        throw new ErrorApi('ACCOUNT_DELETED');
      }
      return d.prisma.$transaction(async (tx) => {
        // Solo uno de dos pedidos simultáneos con el mismo refresh gana; el otro es reuso.
        const marcado = await tx.refreshToken.updateMany({
          where: { id: fila.id, revocadoAt: null },
          data: { revocadoAt: ahora },
        });
        if (marcado.count !== 1) {
          await revocarTodos(fila.usuarioId, ahora, tx);
          throw new ErrorApi('REFRESH_REUSED');
        }
        const { tokens, filaId } = await emitirTokens(fila.usuario, fila.familiaId, tx);
        await tx.refreshToken.update({ where: { id: fila.id }, data: { reemplazadoPor: filaId } });
        return { tokens };
      });
    },

    // ── Cierre de sesión ───────────────────────────────────────────────────
    /** Revoca solo el refresh de este dispositivo; los demás siguen (CU-04). Siempre responde igual. */
    async cerrarSesion(refreshToken: string): Promise<void> {
      await d.prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revocadoAt: null },
        data: { revocadoAt: d.reloj.ahora() },
      });
    },

    // ── Recuperación ───────────────────────────────────────────────────────
    /** Si el correo tiene cuenta activa, guarda el enlace (hash) y manda el correo. Si no, nada. */
    async pedirRecuperacion(email: string): Promise<void> {
      const u = await d.prisma.usuario.findUnique({ where: { email } });
      if (!u || u.deletedAt) return;
      const ahora = d.reloj.ahora();
      const token = tokenOpaco();
      const venceAt = new Date(ahora.getTime() + DURACION_ENLACE_MS);
      await d.prisma.passwordReset.create({
        data: { usuarioId: u.id, tokenHash: hashToken(token), expiresAt: venceAt, createdAt: ahora },
      });
      const separador = d.config.enlaceRestablecer.includes('?') ? '&' : '?';
      const enlace = `${d.config.enlaceRestablecer}${separador}token=${token}`;
      const correo = plantillaRecuperacion({ nombre: u.nombre, enlace, venceAt, zona: u.timezone });
      d.correo.enviarEnSegundoPlano({ ...correo, para: u.email, etiqueta: 'recuperacion', usuarioId: u.id });
    },

    async restablecer(token: string, password: string): Promise<void> {
      const ahora = d.reloj.ahora();
      const fila = await d.prisma.passwordReset.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { usuario: { select: { deletedAt: true } } },
      });
      // Vencido, usado o inventado responden igual (INT-016, INT-017).
      if (!fila || fila.usadoAt || fila.expiresAt.getTime() <= ahora.getTime() || fila.usuario.deletedAt) {
        throw new ErrorApi('RESET_TOKEN_INVALID');
      }
      const passwordHash = await hashearContrasena(password);
      await d.prisma.$transaction(async (tx) => {
        const marcado = await tx.passwordReset.updateMany({ where: { id: fila.id, usadoAt: null }, data: { usadoAt: ahora } });
        if (marcado.count !== 1) throw new ErrorApi('RESET_TOKEN_INVALID');
        await tx.usuario.update({ where: { id: fila.usuarioId }, data: { passwordHash } });
        // §API: el reset revoca todos los refresh. Los otros enlaces pendientes también dejan de servir.
        await revocarTodos(fila.usuarioId, ahora, tx);
        await tx.passwordReset.updateMany({ where: { usuarioId: fila.usuarioId, usadoAt: null }, data: { usadoAt: ahora } });
      });
    },
  };
}

export type ServicioCuentas = ReturnType<typeof crearServicioCuentas>;
