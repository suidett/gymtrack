// ─────────────────────────────────────────────────────────────────────────────
// Perfil y ajustes · Zona: Alumno (área Perfil, PAN-15)
//
// Qué hace: la pestaña de docs/pantallas/perfil.html para los dos roles. Arriba quién eres y tus
// cifras. El alumno ve a su entrenador (o «¿Entrenas con alguien?» con la hoja para ingresar el
// código de 6 caracteres) y puede desvincularse; el entrenador ve su código para invitar, con
// Compartir y Generar otro. Después las preferencias (modo gimnasio, que cambia el tema al tiro;
// unidades; descanso entre series de 30 s a 5 min, APP-038), los avisos (si llegan a este
// teléfono, con «Activar avisos»; el recordatorio va a la API como recordatorio_activo), y la cuenta: datos
// personales, exportar mis datos (GET /me/export, APP-036), borrar la cuenta con su pantalla de
// confirmación (escribir BORRAR, fecha a 30 días, APP-035) y cerrar sesión. Los datos personales
// se revisan con las mismas reglas de la API (nombre y apellido con letras, hasta 80) y el error
// va bajo el campo.
// Tócalo cuando: cambie el perfil, un ajuste o una de sus hojas.
// No lo toques para: cómo se guarda el tema (@/lib/tema) ni cómo se cierra la sesión (@/lib/sesion).
// Depende de: ./api, ./logica, ./piezas, ./useCarga, @/components/ui, @/components/AvisosDelTelefono,
// @/lib/sesion y @/lib/tema.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, Share, Text, TextInput, View } from 'react-native';
import { BarraAccion, Boton, Cabecera, CampoTexto, Chip, Hoja, Icono, Interruptor, Pantalla, Separador, Simbolo, Tarjeta, Txt, useAviso } from '@/components/ui';
import { AvisosDelTelefono } from '@/components/AvisosDelTelefono';
import { detalleDeError } from '@gymtrack/shared';
import { errorNombre, LARGO_MAXIMO } from '@/features/acceso/validacion';
import { ErrorDeApi, useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import {
  borrarCuenta,
  cambiarPerfil,
  cifrasAlumno,
  cifrasEntrenador,
  desvincular,
  exportarDatos,
  generarInvitacion,
  mensajeDeError,
  vincularConCodigo,
} from './api';
import type { Invitacion } from './datos';
import { codigoVencido, fechaBorrado, fechaConDia, iniciales, limpiarCodigo, pasoDescanso, reloj } from './logica';
import { Avatar, CuadroCifra } from './piezas';
import { ahora, guardarCache, leerCache, useCarga } from './useCarga';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaDesde = (iso: string | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `desde el ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

type Avisos = { [k: string]: boolean };
const AVISOS_ALUMNO: Avisos = { descanso: true, recordatorio: true, entrenador: true };
const AVISOS_ENTRENADOR: Avisos = { alertas: true, notas: true };

export function PantallaPerfil({ abrirVincular = false }: { abrirVincular?: boolean }) {
  const [borrando, setBorrando] = useState(false);
  if (borrando) return <BorrarCuenta onVolver={() => setBorrando(false)} />;
  return <Perfil abrirVincular={abrirVincular} onBorrar={() => setBorrando(true)} />;
}

function Perfil({ abrirVincular, onBorrar }: { abrirVincular: boolean; onBorrar: () => void }) {
  const { usuario, rol, cerrarSesion, refrescarUsuario, actualizarUsuario } = useSesion();
  const { modo, cambiarModo } = useTema();
  const aviso = useAviso();
  const ent = rol === 'entrenador';
  const cifras = useCarga(ent ? 'cifras-entrenador' : 'cifras-alumno', async () => (ent ? { ent: await cifrasEntrenador() } : { alu: await cifrasAlumno() }));
  const preferencias = useCarga('avisos', async () => (await leerCache<Avisos>(`${usuario?.id}.avisos-locales`)) ?? (ent ? AVISOS_ENTRENADOR : AVISOS_ALUMNO));
  const [hoja, setHoja] = useState<'vincular' | 'desvincular' | 'salir' | 'datos' | null>(abrirVincular && !ent && !usuario?.entrenador ? 'vincular' : null);
  const [exportando, setExportando] = useState(false);
  const [descanso, setDescanso] = useState(usuario?.descanso_default_s ?? 90);
  const reloj1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entrenador = usuario?.entrenador ?? null;
  const nombreEnt = entrenador ? `${entrenador.nombre} ${entrenador.apellido}`.trim() : '';

  if (!usuario) return null;

  async function patch(cuerpo: object, revertir?: () => void) {
    try {
      await cambiarPerfil(cuerpo);
    } catch (e) {
      revertir?.();
      aviso.mostrar(mensajeDeError(e));
    }
  }

  function cambiarDescanso(delta: number) {
    const r = pasoDescanso(descanso, delta);
    if (r.aviso) {
      aviso.mostrar(r.aviso);
      return;
    }
    setDescanso(r.valor);
    actualizarUsuario({ descanso_default_s: r.valor });
    if (reloj1.current) clearTimeout(reloj1.current);
    reloj1.current = setTimeout(() => patch({ descanso_default_s: r.valor }), 700);
  }

  function cambiarAviso(k: string, v: boolean) {
    const poner = (valor: boolean) =>
      preferencias.poner((a) => {
        const n = { ...(a ?? {}), [k]: valor };
        guardarCache(`${usuario?.id}.avisos-locales`, n);
        return n;
      });
    poner(v);
    // El recordatorio vive en la API (recordatorio_activo: el worker lo lee cada 5 minutos). Los
    // demás todavía no tienen campo en PATCH /me y quedan en el teléfono.
    if (k === 'recordatorio' && !ent) patch({ recordatorio_activo: v }, () => poner(!v));
  }

  async function exportar() {
    setExportando(true);
    try {
      const url = await exportarDatos();
      if (url) await Linking.openURL(url);
      aviso.mostrar('Listo: gymtrack-mis-datos.zip. Elige dónde guardarlo o a quién mandarlo.');
    } catch (e) {
      aviso.mostrar(`No pudimos preparar tu archivo. ${mensajeDeError(e)}`, { accion: { titulo: 'Reintentar', onPress: exportar } });
    } finally {
      setExportando(false);
    }
  }

  const avisos = preferencias.datos ?? (ent ? AVISOS_ENTRENADOR : AVISOS_ALUMNO);
  const a = cifras.datos?.alu;
  const e = cifras.datos?.ent;

  return (
    <Pantalla>
      <View className="mt-2 flex-row items-center gap-3">
        <Avatar texto={iniciales(usuario.nombre, usuario.apellido)} tamano="grande" />
        <View className="flex-1">
          <Txt v="ceja">
            {[ent ? 'Cuenta de entrenador' : 'Cuenta de cliente', fechaDesde(usuario.created_at)].filter(Boolean).join(' · ')}
          </Txt>
          <Txt v="h2" accessibilityRole="header">
            {`${usuario.nombre} ${usuario.apellido}`.trim()}
          </Txt>
        </View>
      </View>
      {a && (a.sesiones !== null || a.racha !== null || a.adherencia !== null) ? (
        <View className="mt-4 flex-row gap-2">
          {a.sesiones !== null ? <CuadroCifra valor={String(a.sesiones)} leyenda="sesiones" /> : null}
          {a.racha !== null ? <CuadroCifra valor={String(a.racha)} leyenda="días de racha" /> : null}
          {a.adherencia !== null ? <CuadroCifra valor={String(Math.round(a.adherencia))} unidad="%" leyenda="adherencia 4 semanas" /> : null}
        </View>
      ) : null}
      {e ? (
        <View className="mt-4 flex-row gap-2">
          <CuadroCifra valor={String(e.clientes)} leyenda="clientes" />
          <CuadroCifra valor={String(e.conRutina)} leyenda="con rutina activa" />
          {e.adherencia !== null ? <CuadroCifra valor={String(e.adherencia)} unidad="%" leyenda="adherencia semana" /> : null}
        </View>
      ) : null}

      {ent ? (
        <CodigoInvitar />
      ) : entrenador ? (
        <>
          <Separador titulo="Tu entrenador" />
          <Tarjeta>
            <View className="flex-row items-center gap-3">
              <Avatar texto={iniciales(entrenador.nombre, entrenador.apellido)} />
              <View>
                <Txt v="h3">{nombreEnt}</Txt>
                <Txt v="sec">Te entrena</Txt>
              </View>
            </View>
            <Txt v="sec" className="mt-3">
              Ve tus sesiones, tu peso, tus medidas y tus fotos, y te arma las rutinas.
            </Txt>
            <View className="mt-2 flex-row justify-end">
              <Boton titulo="Desvincular" variante="fantasmaPeligro" onPress={() => setHoja('desvincular')} />
            </View>
          </Tarjeta>
        </>
      ) : (
        <>
          <Separador titulo="¿Entrenas con alguien?" />
          <Tarjeta>
            <Txt v="sec">Si tu entrenador te dio un código de 6 caracteres, ingrésalo. Verá tus sesiones y tu avance, y podrá armarte las rutinas.</Txt>
            <Boton titulo="Ingresar código" variante="secundario" ancho className="mt-3" onPress={() => setHoja('vincular')} />
          </Tarjeta>
        </>
      )}

      <Separador titulo={ent ? 'Preferencias' : 'Entrenamiento'} />
      <Tarjeta className="py-1">
        <View className="py-2">
          <Interruptor
            etiqueta="Modo gimnasio"
            detalle="Oscuro y con más contraste, para leer rápido entre series."
            valor={modo === 'gimnasio'}
            onCambiar={(v) => {
              cambiarModo(v ? 'gimnasio' : 'clara');
              actualizarUsuario({ modo_gimnasio: v });
              patch({ modo_gimnasio: v });
            }}
          />
        </View>
        <View className="min-h-[64px] flex-row items-center gap-3 border-t border-sup-alta py-2">
          <View className="flex-1">
            <Txt v="cuerpoMedio">Unidades</Txt>
            <Txt v="sec">{usuario.unidades === 'lb' ? 'Ves los pesos en libras.' : 'Ves los pesos en kilos.'}</Txt>
          </View>
          {(['kg', 'lb'] as const).map((u) => (
            <Chip
              key={u}
              titulo={u}
              texto={false}
              activo={usuario.unidades === u}
              onPress={() => {
                const antes = usuario.unidades;
                actualizarUsuario({ unidades: u });
                patch({ unidades: u }, () => actualizarUsuario({ unidades: antes }));
              }}
            />
          ))}
        </View>
        {!ent ? (
          <View className="border-t border-sup-alta py-3">
            <Txt v="cuerpoMedio">Descanso entre series</Txt>
            <Txt v="sec">Para los ejercicios que no traen uno propio.</Txt>
            <View className="mt-2 h-[56px] flex-row gap-1">
              <BotonPaso etiqueta="Quince segundos menos" limite={descanso <= 30} onPress={() => cambiarDescanso(-15)}>
                <View className={`h-1 w-[18px] rounded-[1px] ${descanso <= 30 ? 'bg-desh-texto' : 'bg-texto'}`} />
              </BotonPaso>
              <View
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Descanso entre series"
                accessibilityValue={{ text: `${reloj(descanso)} minutos` }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(ev) => cambiarDescanso(ev.nativeEvent.actionName === 'increment' ? 15 : -15)}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-control border-2 border-campo-borde bg-campo-fondo"
              >
                <Text className="font-mono-bold text-[30px] text-texto">{reloj(descanso)}</Text>
                <Text className="mt-2.5 font-sans-medium text-[13px] text-texto-2">min</Text>
              </View>
              <BotonPaso etiqueta="Quince segundos más" limite={descanso >= 300} onPress={() => cambiarDescanso(15)}>
                <Simbolo tamano={24} />
              </BotonPaso>
            </View>
          </View>
        ) : null}
      </Tarjeta>

      <Separador titulo="Avisos" />
      <Tarjeta className="py-1">
        <AvisosDelTelefono conPrueba={ent} />
        {(ent
          ? [
              ['alertas', 'Alertas de tus clientes', 'Cuando alguien no avanza, baja su rendimiento o anota un dolor.'],
              ['notas', 'Notas nuevas', 'Cuando un cliente deja una observación.'],
            ]
          : [
              ['descanso', 'Fin del descanso', 'Vibra y suena aunque tengas la pantalla apagada.'],
              ['recordatorio', 'Recordatorio para entrenar', '30 minutos antes de tu hora habitual.'],
              ...(entrenador ? [['entrenador', 'Mensajes de tu entrenador', `Cuando ${entrenador.nombre} te deja un consejo o responde una nota.`]] : []),
            ]
        ).map(([k, t, d]) => (
          <View key={k} className="border-t border-sup-alta py-2">
            <Interruptor etiqueta={t} detalle={d} valor={avisos[k as string] !== false} onCambiar={(v) => cambiarAviso(k as string, v)} />
          </View>
        ))}
      </Tarjeta>

      <Separador titulo="Tu cuenta" />
      <Tarjeta className="py-1">
        <FilaIr titulo="Datos personales" detalle="Nombre, correo y contraseña." onPress={() => setHoja('datos')} />
        <FilaIr
          titulo={exportando ? 'Preparando tu archivo…' : 'Exportar mis datos'}
          detalle={
            exportando
              ? 'Puede tardar unos segundos.'
              : ent
                ? 'Tus rutinas, ejercicios propios y observaciones, en un archivo para planilla.'
                : 'Sesiones, series, medidas, encuesta y observaciones, en un archivo para planilla.'
          }
          disabled={exportando}
          onPress={exportar}
        />
        <FilaIr titulo="Borrar mi cuenta" detalle={ent ? 'Se borra todo en 30 días.' : 'Se borra todo en 30 días, con tus fotos.'} peligro onPress={onBorrar} />
      </Tarjeta>
      <Boton titulo="Cerrar sesión" variante="secundario" ancho alto className="mt-6" onPress={() => setHoja('salir')} />
      <Text className="mt-4 text-center font-mono-medium text-[13px] text-texto-2">GymTrack 1.0</Text>

      {hoja === 'vincular' ? (
        <HojaVincular
          onCerrar={() => setHoja(null)}
          onVinculado={async (nombre) => {
            setHoja(null);
            const u = await refrescarUsuario();
            const quien = nombre ?? (u?.entrenador ? `${u.entrenador.nombre} ${u.entrenador.apellido}` : 'Tu entrenador');
            aviso.mostrar(`Listo. ${quien} ya ve tus sesiones y tu avance.`);
          }}
        />
      ) : null}

      <Hoja
        visible={hoja === 'desvincular'}
        onCerrar={() => setHoja(null)}
        titulo={`¿Desvincularte de ${entrenador?.nombre ?? 'tu entrenador'}?`}
        texto="Desde ahora deja de ver tus sesiones, tu peso, tus medidas y tus fotos. Tú conservas todo tu historial."
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Desvincular"
              variante="peligro"
              alto
              className="flex-1"
              onPress={async () => {
                try {
                  await desvincular();
                  setHoja(null);
                  actualizarUsuario({ entrenador: null });
                  aviso.mostrar(`Te desvinculaste de ${entrenador?.nombre ?? 'tu entrenador'}. Tu historial sigue aquí.`);
                } catch (err) {
                  aviso.mostrar(mensajeDeError(err));
                }
              }}
            />
          </>
        }
      />

      <Hoja
        visible={hoja === 'salir'}
        onCerrar={() => setHoja(null)}
        titulo="¿Cerrar sesión?"
        texto="Todo lo que registraste queda guardado en tu cuenta. Para volver, ingresas con tu correo y tu contraseña."
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Cerrar sesión"
              alto
              className="flex-1"
              onPress={() => {
                setHoja(null);
                cerrarSesion();
              }}
            />
          </>
        }
      />

      {hoja === 'datos' ? <HojaDatos onCerrar={() => setHoja(null)} /> : null}
    </Pantalla>
  );
}

// ── Piezas del perfil ────────────────────────────────────────────────────────
function FilaIr({ titulo, detalle, onPress, peligro = false, disabled = false }: { titulo: string; detalle: string; onPress: () => void; peligro?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}`}
      accessibilityState={{ disabled, busy: disabled }}
      className="min-h-[64px] flex-row items-center gap-3 border-b border-sup-alta py-2 active:bg-fantasma-pres"
    >
      <View className="flex-1">
        <Text className={`font-sans-semibold text-[16px] ${peligro ? 'text-peligro' : 'text-texto'}`}>{titulo}</Text>
        <Txt v="sec">{detalle}</Txt>
      </View>
      {!disabled ? <Icono nombre="adelante" tamano={20} /> : null}
    </Pressable>
  );
}

function BotonPaso({ etiqueta, limite, onPress, children }: { etiqueta: string; limite: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      className={`h-14 w-14 items-center justify-center rounded-control border-2 ${limite ? 'border-desh-fondo bg-desh-fondo' : 'border-sec-borde bg-sec-fondo active:bg-sec-pres'}`}
    >
      {children}
    </Pressable>
  );
}

/** Las 6 casillas del código, con un campo invisible encima que recibe lo escrito. */
function Casillas({ codigo, estado, onCambiar, editable = true }: { codigo: string; estado: '' | 'ok' | 'error' | 'vencido'; onCambiar?: (s: string) => void; editable?: boolean }) {
  const { c } = useTema();
  const borde = estado === 'error' ? 'border-peligro' : estado === 'ok' ? 'border-hecho-borde' : estado === 'vencido' ? 'border-sup-alta' : 'border-campo-borde';
  return (
    <View className="relative mt-4 flex-row gap-1.5">
      {Array.from({ length: 6 }, (_, i) => (
        <View
          key={i}
          className={`h-14 flex-1 items-center justify-center rounded-control border-2 bg-campo-fondo ${i === codigo.length && editable ? 'border-campo-edicion' : borde}`}
        >
          <Text className={`font-mono-bold text-[24px] ${estado === 'vencido' ? 'text-texto-2 line-through' : 'text-texto'}`}>{codigo[i] ?? ''}</Text>
        </View>
      ))}
      {editable && onCambiar ? (
        <TextInput
          value={codigo}
          onChangeText={(s) => onCambiar(limpiarCodigo(s))}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          autoComplete="one-time-code"
          accessibilityLabel="Código de 6 caracteres"
          selectionColor={c['campo-edicion']}
          className="absolute inset-0 text-transparent"
          style={{ opacity: 0.02 }}
        />
      ) : null}
    </View>
  );
}

function HojaVincular({ onCerrar, onVinculado }: { onCerrar: () => void; onVinculado: (nombre: string | null) => void }) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const listo = codigo.length === 6;
  async function vincular() {
    setEnviando(true);
    setError(null);
    try {
      const nombre = await vincularConCodigo(codigo);
      onVinculado(nombre);
    } catch (e) {
      if (e instanceof ErrorDeApi && [404, 409, 410, 422, 400].includes(e.estado)) {
        setError(
          e.codigo === 'ALREADY_LINKED' ? 'Ya tienes entrenador. Desvincúlate primero.' : 'Ese código no existe o ya venció. Pídele uno nuevo a tu entrenador.',
        );
      } else setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Hoja
      visible
      onCerrar={onCerrar}
      titulo="Ingresa el código"
      texto="Te lo da tu entrenador. Son 6 caracteres, entre letras y números, y dura 7 días."
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={onCerrar} />
          <Boton titulo="Vincular" alto className="flex-1" disabled={!listo} cargando={enviando ? 'Vinculando…' : false} onPress={vincular} />
        </>
      }
    >
      <Casillas
        codigo={codigo}
        estado={error ? 'error' : listo ? 'ok' : ''}
        onCambiar={(s) => {
          setCodigo(s);
          setError(null);
        }}
      />
      <View className="mt-3" accessibilityLiveRegion="polite">
        {error ? (
          <Txt v="error" accessibilityRole="alert">
            {error}
          </Txt>
        ) : listo ? (
          <Txt v="sec">Al vincularte, tu entrenador verá tus sesiones, tu peso, tus medidas y tus fotos. Puedes desvincularte cuando quieras desde aquí.</Txt>
        ) : (
          <Txt v="sec">Mayúsculas o minúsculas da lo mismo.</Txt>
        )}
      </View>
    </Hoja>
  );
}

function HojaDatos({ onCerrar }: { onCerrar: () => void }) {
  const { usuario, actualizarUsuario } = useSesion();
  const aviso = useAviso();
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [apellido, setApellido] = useState(usuario?.apellido ?? '');
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<{ nombre?: string | null; apellido?: string | null }>({});
  async function guardar() {
    // Las mismas reglas de la API (errorNombrePersona): el error va bajo el campo.
    const e = { nombre: errorNombre(nombre, 'nombre'), apellido: errorNombre(apellido, 'apellido') };
    setErrores(e);
    if (e.nombre || e.apellido) return;
    setGuardando(true);
    try {
      await cambiarPerfil({ nombre: nombre.trim(), apellido: apellido.trim() });
      actualizarUsuario({ nombre: nombre.trim(), apellido: apellido.trim() });
      aviso.mostrar('Guardaste tus datos.');
      onCerrar();
    } catch (err) {
      const { campo, motivo } = detalleDeError(err);
      if (motivo && (campo === 'nombre' || campo === 'apellido')) setErrores({ [campo]: motivo });
      else aviso.mostrar(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Hoja
      visible
      onCerrar={onCerrar}
      titulo="Datos personales"
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={onCerrar} />
          <Boton titulo="Guardar" alto className="flex-1" cargando={guardando} onPress={guardar} />
        </>
      }
    >
      <View className="mt-3 gap-3">
        <CampoTexto
          etiqueta="Nombre"
          valor={nombre}
          onCambiar={(v) => (setNombre(v), setErrores((x) => ({ ...x, nombre: null })))}
          error={errores.nombre}
          maxLength={LARGO_MAXIMO.nombre}
          autoCapitalize="words"
          autoComplete="given-name"
        />
        <CampoTexto
          etiqueta="Apellido"
          valor={apellido}
          onCambiar={(v) => (setApellido(v), setErrores((x) => ({ ...x, apellido: null })))}
          error={errores.apellido}
          maxLength={LARGO_MAXIMO.nombre}
          autoCapitalize="words"
          autoComplete="family-name"
        />
        <Txt v="sec">
          Tu correo es {usuario?.email}. Para cambiar la contraseña, cierra sesión y usa «¿Olvidaste tu contraseña?» al ingresar.
        </Txt>
      </View>
    </Hoja>
  );
}

// ── Código para invitar (entrenador) ─────────────────────────────────────────
function CodigoInvitar() {
  const { usuario } = useSesion();
  const aviso = useAviso();
  const guardado = useCarga(`invitacion`, async () => (await leerCache<Invitacion>(`${usuario?.id}.invitacion-vigente`)) ?? null);
  const [generando, setGenerando] = useState(false);
  const [ahoraMismo] = useState(ahora);
  const inv = guardado.datos;
  const vencido = inv ? codigoVencido(inv.venceAt, ahoraMismo) : false;
  const vence = inv?.venceAt ? fechaConDia(inv.venceAt) : null;

  async function generar() {
    setGenerando(true);
    const antes = inv && !vencido;
    try {
      const nueva = await generarInvitacion();
      if (!nueva) throw new Error('sin código');
      guardarCache(`${usuario?.id}.invitacion-vigente`, nueva);
      guardado.poner(() => nueva);
      aviso.mostrar(
        antes
          ? `Código nuevo: ${nueva.codigo}. El anterior ya no sirve.`
          : `Código nuevo: ${nueva.codigo}.${nueva.venceAt ? ` Vence el ${fechaConDia(nueva.venceAt)}.` : ''}`,
      );
    } catch (e) {
      aviso.mostrar(mensajeDeError(e));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <>
      <Separador titulo="Código para invitar" />
      <Tarjeta>
        {inv ? (
          <>
            <Casillas codigo={inv.codigo} estado={vencido ? 'vencido' : 'ok'} editable={false} />
            {vencido ? (
              <>
                <Txt v="sec" className="mt-3">
                  {vence ? `Venció el ${vence}.` : 'Venció.'}
                </Txt>
                <Txt v="sec" className="mt-1">
                  Genera uno nuevo para invitar a alguien. Dura 7 días y sirve para una persona.
                </Txt>
                <Boton titulo="Generar código nuevo" alto ancho className="mt-3" cargando={generando ? 'Generando…' : false} onPress={generar} />
              </>
            ) : (
              <>
                <Txt v="sec" className="mt-3">
                  Sirve para una persona.{vence ? ` Vence el ${vence}, en 7 días.` : ''}
                </Txt>
                <Boton
                  titulo="Compartir"
                  alto
                  ancho
                  className="mt-3"
                  onPress={() =>
                    Share.share({ message: `Entrena conmigo en GymTrack. Tu código es ${inv.codigo}${vence ? ` y vence el ${vence}` : ''}.` }).catch(() => {})
                  }
                />
                <Boton titulo="Generar otro código" variante="fantasma" className="mt-1 self-center" cargando={generando ? 'Generando…' : false} onPress={generar} />
              </>
            )}
          </>
        ) : (
          <>
            <Txt v="sec">Genera un código para que tu cliente se vincule contigo. Dura 7 días y sirve para una persona.</Txt>
            <Boton titulo="Generar código" alto ancho className="mt-3" cargando={generando ? 'Generando…' : false} onPress={generar} />
          </>
        )}
      </Tarjeta>
    </>
  );
}

// ── Borrar cuenta ────────────────────────────────────────────────────────────
function BorrarCuenta({ onVolver }: { onVolver: () => void }) {
  const { usuario, rol, cerrarSesion } = useSesion();
  const aviso = useAviso();
  const [confirmar, setConfirmar] = useState('');
  const [hoy] = useState(ahora);
  const [exportando, setExportando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const ent = rol === 'entrenador';
  const listo = confirmar.trim().toUpperCase() === 'BORRAR';
  const fecha = fechaBorrado(hoy);
  const entNombre = usuario?.entrenador?.nombre ?? null;
  const pasos = ent
    ? [
        ['Hoy', ' se cierra tu sesión en todos tus teléfonos. Tus clientes quedan sin entrenador, con todo su historial.'],
        [`El ${fecha}`, ' borramos tu cuenta, tus rutinas y tus ejercicios propios.'],
        ['', 'Después de esa fecha no hay forma de recuperarlos.'],
      ]
    : [
        ['Hoy', ` se cierra tu sesión en todos tus teléfonos y ${entNombre ? `${entNombre} deja de ver tus datos` : 'nadie más puede ver tus datos'}.`],
        [`El ${fecha}`, ' borramos todo: sesiones, series, récords, peso, medidas, fotos, encuesta y observaciones.'],
        ['', 'Después de esa fecha no hay forma de recuperarlo.'],
      ];

  async function exportar() {
    setExportando(true);
    try {
      const url = await exportarDatos();
      if (url) await Linking.openURL(url);
      aviso.mostrar('Listo: gymtrack-mis-datos.zip. Elige dónde guardarlo o a quién mandarlo.');
    } catch (e) {
      aviso.mostrar(`No pudimos preparar tu archivo. ${mensajeDeError(e)}`);
    } finally {
      setExportando(false);
    }
  }

  async function borrar() {
    setBorrando(true);
    try {
      await borrarCuenta();
      aviso.mostrar(`Tu cuenta se borra el ${fecha}. Te mandamos un correo con el detalle.`);
      await cerrarSesion();
    } catch (e) {
      aviso.mostrar(mensajeDeError(e));
      setBorrando(false);
    }
  }

  return (
    <View className="flex-1 bg-fondo">
      <Pantalla cabecera={<Cabecera atras titulo="Borrar cuenta" alVolver={onVolver} />}>
        <Txt v="h2" className="mt-2">
          Antes de borrar, lee esto
        </Txt>
        <View className="mt-3 gap-3">
          {pasos.map(([negrita, resto], i) => (
            <View key={i} className="flex-row gap-3">
              <View className="h-7 w-7 items-center justify-center rounded-control bg-sup-alta">
                <Text className="font-mono-bold text-[14px] text-texto">{i + 1}</Text>
              </View>
              <Text className="flex-1 font-sans-medium text-[16px] leading-[22px] text-texto">
                {negrita ? <Text className="font-sans-bold">{negrita}</Text> : null}
                {resto}
              </Text>
            </View>
          ))}
        </View>
        <Tarjeta className="mt-5">
          <Txt v="h3">Llévate tus datos primero</Txt>
          <Txt v="sec" className="mt-1">
            {ent ? 'Un archivo para planilla con tus rutinas, ejercicios y observaciones.' : 'Un archivo para planilla con todo lo que registraste.'}
          </Txt>
          <Boton titulo={exportando ? 'Preparando…' : 'Exportar mis datos'} variante="secundario" ancho className="mt-3" disabled={exportando} onPress={exportar} />
        </Tarjeta>
        <View className="mt-5">
          <CampoTexto
            etiqueta="Para confirmar, escribe BORRAR"
            valor={confirmar}
            onCambiar={setConfirmar}
            autoCapitalize="characters"
            autoCorrect={false}
            ayuda={listo ? undefined : 'Así sabemos que no fue un toque sin querer.'}
          />
        </View>
      </Pantalla>
      <BarraAccion>
        <Boton titulo="Borrar mi cuenta" variante="peligro" alto ancho disabled={!listo} cargando={borrando ? 'Borrando…' : false} onPress={borrar} />
      </BarraAccion>
    </View>
  );
}
