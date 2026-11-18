// ─────────────────────────────────────────────────────────────────────────────
// Código de invitación · Zona: Entrenador (app)
//
// Qué hace: el código de 6 caracteres con que un cliente se vincula (CU-11). useCodigoInvitacion
// lee el último que pidió el entrenador (GET /trainer/invitations; sin red, el guardado en el
// teléfono), genera uno (POST) si no hay ninguno vigente y `autoGenerar` lo pide, y ofrece copiar,
// compartir y generar otro. BloqueCodigo lo muestra como en la hoja «Invitar cliente» y el estado
// vacío de Clientes (clientes.html) o como la tarjeta «Código para invitar» de Perfil (perfil.html).
// Tócalo cuando: cambien los textos del código o cuándo se genera uno nuevo.
// No lo toques para: la lista de clientes (PantallaClientes.tsx).
// Depende de: ./instancia (API y código guardado), ./logica, ./piezas y @/components/ui.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { View } from 'react-native';
import { Boton, Txt, useAviso } from '@/components/ui';
import { esSinConexion, useSesion } from '@/lib/sesion';
import type { Invitacion } from './contrato';
import { guardarCodigo, leerCodigoGuardado, apiEntrenador } from './instancia';
import { estadoCodigo, fmtDiaCorto, mensajeInvitacion, type EstadoCodigo } from './logica';
import { CeldasCodigo } from './piezas';
import { ahoraMs, compartirTexto, copiarTexto } from './utilidades';

export const SIN_RED_CODIGO = 'Necesitas conexión para crear un código.';

// ── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Con `autoGenerar` (estado vacío de Clientes y Perfil) genera uno cuando no hay ninguno: nunca
 * pidió, o el último ya se usó o se reemplazó. Uno vencido se muestra vencido (Perfil) y no se
 * reemplaza solo.
 */
export function useCodigoInvitacion({ autoGenerar = false }: { autoGenerar?: boolean } = {}) {
  const { usuario } = useSesion();
  const aviso = useAviso();
  const usuarioId = usuario?.id ?? '';
  const [inv, setInv] = useState<Invitacion | null>(null);
  const [listo, setListo] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [estado, setEstado] = useState<EstadoCodigo>('ninguno');

  const generar = useCallback(
    async (silencioso = false) => {
      setGenerando(true);
      try {
        const nuevo = await apiEntrenador.crearInvitacion();
        const habia = estadoCodigo(inv, ahoraMs()) === 'vigente';
        setInv(nuevo);
        setEstado(estadoCodigo(nuevo, ahoraMs()));
        await guardarCodigo(usuarioId, nuevo);
        if (!silencioso) {
          aviso.mostrar(
            habia
              ? `Nuevo código: ${nuevo.codigo}. El anterior ya no sirve.`
              : `Código nuevo: ${nuevo.codigo}. Vence el ${fmtDiaCorto(nuevo.vence_at)}.`,
          );
        }
        return nuevo;
      } catch (e) {
        aviso.mostrar(esSinConexion(e) ? SIN_RED_CODIGO : 'No pudimos crear el código. Intenta de nuevo.');
        return null;
      } finally {
        setGenerando(false);
      }
    },
    [aviso, inv, usuarioId],
  );

  // `desdeApi` es undefined si la API no respondió; null si nunca pidió un código.
  const alLeer = useEffectEvent((desdeApi: Invitacion | null | undefined, local: Invitacion | null) => {
    const actual = desdeApi === undefined ? local : desdeApi;
    const e = estadoCodigo(actual, ahoraMs());
    setInv(e === 'ninguno' ? null : actual);
    setEstado(e);
    setListo(true);
    if (desdeApi) void guardarCodigo(usuarioId, desdeApi);
    if (e === 'ninguno' && autoGenerar && desdeApi !== undefined) void generar(true);
  });

  // Se vuelve a mirar si cambia la persona o si la pantalla pasa a pedir uno (por ejemplo,
  // Clientes termina de cargar y no hay nadie).
  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    Promise.all([apiEntrenador.invitacionActual().catch(() => undefined), leerCodigoGuardado(usuarioId)]).then(([desdeApi, local]) => {
      if (vivo) alLeer(desdeApi, local);
    });
    return () => {
      vivo = false;
    };
  }, [usuarioId, autoGenerar]);

  const copiar = useCallback(async () => {
    if (!inv) return;
    await copiarTexto(inv.codigo);
    aviso.mostrar(`Copiaste el código ${inv.codigo}.`);
  }, [aviso, inv]);

  const compartir = useCallback(async () => {
    const vigente = inv && estadoCodigo(inv, ahoraMs()) === 'vigente' ? inv : await generar(true);
    if (vigente) await compartirTexto(mensajeInvitacion(vigente));
  }, [generar, inv]);

  return { inv, estado, listo, generando, generar, copiar, compartir };
}

export type CodigoInvitacionApi = ReturnType<typeof useCodigoInvitacion>;

/** Cuántos días le quedan: «en 7 días». */
function enDias(venceIso: string): string {
  const dias = Math.max(0, Math.ceil((Date.parse(venceIso) - ahoraMs()) / 86_400_000));
  return dias === 1 ? 'en 1 día' : `en ${dias} días`;
}

// ── Vistas ───────────────────────────────────────────────────────────────────
/**
 * `forma` 'hoja': Copiar y Compartir, y Generar otro código abajo. 'vacio': Copiar código y
 * Generar otro (Compartir va en la barra de abajo). 'perfil': vigente o vencido, como Perfil.
 */
export function BloqueCodigo({ codigo: k, forma }: { codigo: CodigoInvitacionApi; forma: 'hoja' | 'vacio' | 'perfil' }) {
  if (!k.inv) {
    return (
      <View className="mt-5 items-center gap-3">
        <CeldasCodigo codigo="" />
        <Txt v="sec">{k.generando || !k.listo ? 'Creando tu código…' : 'Todavía no tienes un código.'}</Txt>
        {k.listo && !k.generando ? <Boton titulo="Generar código" variante="secundario" onPress={() => void k.generar()} /> : null}
      </View>
    );
  }
  const vencido = k.estado === 'vencido';
  const vence = fmtDiaCorto(k.inv.vence_at);

  if (forma === 'perfil') {
    if (vencido) {
      return (
        <View>
          <CeldasCodigo codigo={k.inv.codigo} vencido />
          <Txt v="sec" className="mt-3 text-peligro">
            Venció el {vence}. Nadie lo usó.
          </Txt>
          <Txt v="sec" className="mt-1">
            Genera uno nuevo para invitar a alguien. Dura 7 días y sirve para una persona.
          </Txt>
          <Boton titulo="Generar código nuevo" alto ancho className="mt-4" cargando={k.generando} onPress={() => void k.generar()} />
        </View>
      );
    }
    return (
      <View>
        <CeldasCodigo codigo={k.inv.codigo} />
        <Txt v="sec" className="mt-3">
          Sirve para una persona. Vence el <Txt v="cuerpo">{vence}</Txt>, {enDias(k.inv.vence_at)}.
        </Txt>
        <View className="mt-4 flex-row gap-2">
          <Boton titulo="Copiar" variante="secundario" className="flex-1" onPress={() => void k.copiar()} />
          <Boton titulo="Compartir" className="flex-1" onPress={() => void k.compartir()} />
        </View>
        <View className="-ml-3 mt-2 self-start">
          <Boton titulo="Generar otro código" variante="fantasma" cargando={k.generando} onPress={() => void k.generar()} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <CeldasCodigo codigo={k.inv.codigo} vencido={vencido} />
      <Txt v="sec" className="mt-3 text-center">
        {vencido ? `Venció el ${vence}. Genera otro para invitar.` : `Vence el ${vence} · sirve para una persona`}
      </Txt>
      {forma === 'hoja' ? (
        <>
          <View className="mt-5 flex-row gap-2">
            <Boton titulo="Copiar" variante="secundario" alto className="flex-1" disabled={vencido} onPress={() => void k.copiar()} />
            <Boton titulo="Compartir" alto className="flex-1" onPress={() => void k.compartir()} />
          </View>
          <Boton titulo="Generar otro código" variante="fantasma" ancho className="mt-2" cargando={k.generando} onPress={() => void k.generar()} />
        </>
      ) : (
        <View className="mt-4 flex-row gap-2">
          <Boton titulo="Copiar código" variante="secundario" className="flex-1" disabled={vencido} onPress={() => void k.copiar()} />
          <Boton titulo="Generar otro" variante="fantasma" className="flex-1" cargando={k.generando} onPress={() => void k.generar()} />
        </View>
      )}
    </View>
  );
}
