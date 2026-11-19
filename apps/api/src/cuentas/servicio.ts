// ─────────────────────────────────────────────────────────────────────────────
// Servicio de cuentas · Zona: Cuentas (API)
//
// Qué hace: la lógica de las cuentas, sin nada de HTTP: registrar (Argon2id, usuario y refresh en
// una sola transacción, correo de bienvenida), ingresar (mensaje genérico, cuenta marcada para
// borrado), emitir el par de tokens, rotar el refresh con detección de reuso (un refresh que ya
// fue reemplazado y vuelve revoca todos los del usuario; uno cerrado con logout solo da 401),
// cerrar la sesión de un dispositivo, pedir el enlace de recuperación (1 hora, un solo uso, todo
// en segundo plano) y guardar la contraseña nueva (revoca todos los refresh; los access viejos
// caen por el sello de la contraseña, ver src/seguridad/tokens.ts). Para el ingreso con Google
// (src/cuentas/google.ts) abre una sesión sin contraseña y crea la cuenta sin contraseña conocida.
// Tócalo cuando: cambie una regla de §API «Cuentas y perfil» o de §Seguridad.
// No lo toques para: la forma de la entrada o la salida (packages/shared/src/api/cuentas.ts), ni
// para los límites de intentos (src/seguridad/limitador.ts, aplicados en rutas.ts).
// Depende de: la base (Prisma), el reloj inyectado, src/seguridad/* y el servicio de correo.
// ─────────────────────────────────────────────────────────────────────────────
import type { PerfilUsuario, Sesion, Tokens, Usuario as UsuarioApi } from '@gymtrack/shared';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Config } from '../config';
import { plantillaBienvenida, plantillaIngreso, plantillaRecuperacion } from '../correo/plantillas';
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
    // Sin consultar la base: el vínculo y la encuesta los completa usuarioApiCompleto().
    entrenador: null,
    encuesta_pendiente: u.rol === 'client',
    created_at: u.createdAt.toISOString(),
  };
}

/**
 * La forma pública con el entrenador del vínculo activo (trainer_clients), si el alumno todavía
 * no responde la encuesta (survey_responses) y los ajustes del recordatorio (client_profiles:
 * recordatorio_activo y recordatorio_hora; null para el entrenador). La usan GET /v1/me, PATCH
 * /v1/me, el ingreso y el registro, para que la app decida al tiro si manda al alumno a la
 * Encuesta (INT-002). En el ingreso el esquema de la sesión deja afuera el recordatorio.
 */
export async function usuarioApiCompleto(prisma: Pick<BaseDeDatos, 'vinculoEntrenador' | 'respuestaEncuesta' | 'perfilAlumno'>, u: Usuario): Promise<PerfilUsuario> {
  const base = aUsuarioApi(u);
  if (u.rol !== 'client') return { ...base, entrenador: null, encuesta_pendiente: false, recordatorio_activo: null, recordatorio_hora: null };
  const [vinculo, encuestas, perfil] = await Promise.all([
    prisma.vinculoEntrenador.findFirst({
      where: { alumnoId: u.id, estado: 'activo' },
      select: { entrenador: { select: { id: true, nombre: true, apellido: true } } },
    }),
    prisma.respuestaEncuesta.count({ where: { alumnoId: u.id } }),
    prisma.perfilAlumno.findUnique({ where: { usuarioId: u.id }, select: { recordatorioActivo: true, recordatorioHora: true } }),
  ]);
  return {
    ...base,
    entrenador: vinculo?.entrenador ?? null,
    encuesta_pendiente: encuestas === 0,
    // Sin fila en client_profiles el recordatorio está encendido (el valor por defecto de la base).
    recordatorio_activo: perfil?.recordatorioActivo ?? true,
    recordatorio_hora: perfil?.recordatorioHora ?? null,
  };
}

/** Solo la parte de usuario (sin el recordatorio), para las respuestas con la sesión. */
export const usuarioDeSesion = (p: PerfilUsuario): UsuarioApi => {
  const { recordatorio_activo: _a, recordatorio_hora: _h, ...usuario } = p;
  return usuario;
};

export function crearServicioCuentas(d: DependenciasCuentas) {
  // ── Tokens ───────────────────────────────────────────────────────────────
  /** Emite un access y un refresh nuevo. Sin `familiaId` empieza una familia (un dispositivo nuevo). */
  async function emitirTokens(
    u: Pick<Usuario, 'id' | 'rol' | 'passwordHash'>,
    familiaId?: string,
    db: Pick<BaseDeDatos, 'refreshToken'> = d.prisma,
  ) {
    const ahora = d.reloj.ahora();
    const sello = d.firmador.selloDeContrasena(u.passwordHash);
    const access = await d.firmador.firmarAccess({ sub: u.id, rol: u.rol, sello }, ahora);
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

  /**
   * Un refresh revocado que vuelve. Si ya había sido reemplazado (rotó a otro), es reuso: señal de
   * robo, se cierran las sesiones del usuario en todos sus dispositivos (§Seguridad; INT-010,
   * SEG-006). Si se revocó sin reemplazo (logout, reset, un reuso anterior) solo da 401: cerrar
   * sesión en un teléfono no puede sacar a los demás.
   */
  async function rechazarRevocado(filaId: string, usuarioId: string, ahora: Date): Promise<never> {
    const actual = await d.prisma.refreshToken.findUnique({ where: { id: filaId }, select: { reemplazadoPor: true } });
    if (actual?.reemplazadoPor) {
      await revocarTodos(usuarioId, ahora);
      throw new ErrorApi('REFRESH_REUSED');
    }
    throw new ErrorApi('REFRESH_INVALID');
  }

  /**
   * Crea la cuenta y su primer refresh en una sola transacción y manda la bienvenida. La usan el
   * registro (con la contraseña elegida) y el ingreso con Google (sin contraseña conocida).
   */
  async function crearCuenta(
    e: { rol: 'trainer' | 'client'; nombre: string; apellido: string; email: string },
    passwordHash: string,
    emailVerifiedAt: Date | null,
    googleSub: string | null = null,
  ): Promise<Sesion> {
    let u: Usuario;
    let tokens: Tokens;
    try {
      // Usuario y refresh juntos: si falla el segundo no queda una cuenta sin sesión.
      ({ u, tokens } = await d.prisma.$transaction(async (tx) => {
        const creado = await tx.usuario.create({
          data: { rol: e.rol, nombre: e.nombre, apellido: e.apellido, email: e.email, passwordHash, emailVerifiedAt, googleSub, createdAt: d.reloj.ahora() },
        });
        return { u: creado, tokens: (await emitirTokens(creado, undefined, tx)).tokens };
      }));
    } catch (err) {
      // P-36: el correo ya tiene cuenta. El índice único resuelve también dos registros a la vez
      // (con Google, el de google_sub también: el mismo doble toque).
      if (esDuplicado(err)) throw new ErrorApi('EMAIL_TAKEN');
      throw err;
    }
    const correo = plantillaBienvenida({ nombre: u.nombre, rol: u.rol });
    d.correo.enviarEnSegundoPlano({ ...correo, para: u.email, etiqueta: 'bienvenida', usuarioId: u.id });
    return { usuario: aUsuarioApi(u), tokens };
  }

  /**
   * Correo «Iniciaste sesión» a la cuenta que acaba de entrar (contraseña o Google). Va en segundo
   * plano: el ingreso no espera a Gmail. Renovar el token no lo manda, solo el ingreso de verdad.
   */
  function avisarIngreso(u: Usuario, metodo: 'contrasena' | 'google') {
    const correo = plantillaIngreso({ nombre: u.nombre, cuando: d.reloj.ahora(), zona: u.timezone, metodo });
    d.correo.enviarEnSegundoPlano({ ...correo, para: u.email, etiqueta: 'ingreso', usuarioId: u.id });
  }

  return {
    // ── Registro ───────────────────────────────────────────────────────────
    async registrar(e: { rol: 'trainer' | 'client'; nombre: string; apellido: string; email: string; password: string }): Promise<Sesion> {
      // El hash se calcula antes de abrir la transacción: no se tiene una conexión tomada 50 ms.
      const passwordHash = await hashearContrasena(e.password);
      return crearCuenta(e, passwordHash, null);
    },

    /**
     * Cuenta creada desde otro proveedor que ya confirmó el correo (Google). La contraseña es un
     * azar de 32 bytes que nadie conoce ni se guarda: el ingreso con correo da 401 hasta que la
     * persona elige una con «olvidé mi contraseña». Igual es un hash Argon2id válido, así el
     * resto del código (sello del access, restablecer) no necesita un caso aparte.
     */
    async registrarSinContrasena(
      e: { rol: 'trainer' | 'client'; nombre: string; apellido: string; email: string; googleSub?: string },
    ): Promise<Sesion> {
      const passwordHash = await hashearContrasena(randomBytes(32).toString('base64url'));
      return crearCuenta(e, passwordHash, d.reloj.ahora(), e.googleSub ?? null);
    },

    /**
     * Abre una sesión nueva (un dispositivo nuevo) para alguien que ya se identificó por otro
     * medio (Google). Las mismas reglas que el ingreso: una cuenta marcada para borrarse no entra.
     */
    async abrirSesion(u: Usuario): Promise<Sesion> {
      if (u.deletedAt) throw new ErrorApi('ACCOUNT_DELETED');
      const { tokens } = await emitirTokens(u);
      avisarIngreso(u, 'google');
      return { usuario: usuarioDeSesion(await usuarioApiCompleto(d.prisma, u)), tokens };
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
      avisarIngreso(u, 'contrasena');
      return { usuario: usuarioDeSesion(await usuarioApiCompleto(d.prisma, u)), tokens };
    },

    // ── Refresh con rotación ───────────────────────────────────────────────
    async renovar(refreshToken: string): Promise<{ tokens: Tokens }> {
      const ahora = d.reloj.ahora();
      const fila = await d.prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(refreshToken) },
        include: { usuario: { select: { id: true, rol: true, passwordHash: true, deletedAt: true } } },
      });
      if (!fila) throw new ErrorApi('REFRESH_INVALID');
      if (fila.revocadoAt) await rechazarRevocado(fila.id, fila.usuarioId, ahora);
      if (fila.expiresAt.getTime() <= ahora.getTime()) throw new ErrorApi('REFRESH_EXPIRED');
      if (fila.usuario.deletedAt) {
        await revocarTodos(fila.usuarioId, ahora);
        throw new ErrorApi('ACCOUNT_DELETED');
      }
      const resultado = await d.prisma.$transaction(async (tx) => {
        // Solo uno de varios pedidos simultáneos con el mismo refresh gana; los otros esperan el
        // candado de la fila y vuelven con 0 filas. No se lanza aquí: un throw desharía la
        // revocación, así que la transacción devuelve la marca y se revoca afuera.
        const marcado = await tx.refreshToken.updateMany({
          where: { id: fila.id, revocadoAt: null },
          data: { revocadoAt: ahora },
        });
        if (marcado.count !== 1) return 'perdio' as const;
        const { tokens, filaId } = await emitirTokens(fila.usuario, fila.familiaId, tx);
        await tx.refreshToken.update({ where: { id: fila.id }, data: { reemplazadoPor: filaId } });
        return { tokens };
      });
      if (resultado === 'perdio') return rechazarRevocado(fila.id, fila.usuarioId, ahora);
      return resultado;
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
    /**
     * Si el correo tiene cuenta activa, guarda el enlace (hash) y manda el correo. Si no, nada.
     * Todo pasa en segundo plano: la ruta responde 202 en el mismo tiempo exista o no la cuenta
     * (SEG-008), sin una búsqueda, un insert ni una plantilla que la delaten.
     */
    async pedirRecuperacion(email: string): Promise<void> {
      const ahora = d.reloj.ahora();
      d.correo.prepararEnSegundoPlano('recuperacion', async () => {
        const u = await d.prisma.usuario.findUnique({ where: { email } });
        if (!u || u.deletedAt) return undefined;
        const token = tokenOpaco();
        const venceAt = new Date(ahora.getTime() + DURACION_ENLACE_MS);
        await d.prisma.passwordReset.create({
          data: { usuarioId: u.id, tokenHash: hashToken(token), expiresAt: venceAt, createdAt: ahora },
        });
        const separador = d.config.enlaceRestablecer.includes('?') ? '&' : '?';
        const enlace = `${d.config.enlaceRestablecer}${separador}token=${token}`;
        const correo = plantillaRecuperacion({ nombre: u.nombre, enlace, venceAt, zona: u.timezone });
        return { ...correo, para: u.email, etiqueta: 'recuperacion', usuarioId: u.id };
      });
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
