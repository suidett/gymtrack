// ─────────────────────────────────────────────────────────────────────────────
// Perfil del entrenador · Zona: Entrenador (app)
//
// Qué hace: la pestaña Perfil del entrenador (pantalla 15 con rol entrenador, docs/pantallas/
// perfil.html): quién es, cuántos clientes tiene, cuántos con rutina activa y la adherencia de la
// semana; el código para invitar (vigente o vencido, con Copiar, Compartir y Generar otro);
// preferencias (modo gimnasio y unidades, que se guardan con PATCH /me); avisos; exportar sus
// datos (GET /me/export); borrar la cuenta (escribiendo BORRAR, DELETE /me) y cerrar sesión.
// Tócalo cuando: cambie la maqueta de Perfil en su versión de entrenador.
// No lo toques para: el Perfil del alumno ((alumno)/perfil.tsx, área Perfil).
// Depende de: @/components/ui, @/lib/sesion, @/lib/tema, ./CodigoInvitacion, ./instancia,
// ./logica y ./piezas.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MESES, type Usuario } from '@gymtrack/shared';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import {
  Boton,
  Cabecera,
  CampoTexto,
  Ceja,
  Chips,
  Fila,
  Hoja,
  Interruptor,
  Pantalla,
  Tarjeta,
  Titulo,
  Txt,
  useAviso,
} from '@/components/ui';
import { esSinConexion, useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { BloqueCodigo, useCodigoInvitacion } from './CodigoInvitacion';
import { apiEntrenador } from './instancia';
import { cuentasPanel, fmtDiaLargo, iniciales, nombreCompleto, sinRutina } from './logica';
import { Avatar, CabezaSeccion, TresCifras } from './piezas';
import { useCarga } from './useCarga';
import { ahoraMs } from './utilidades';

const CLAVE_AVISOS = 'gymtrack:entrenador:avisos';
type Avisos = { alertas: boolean; notas: boolean };

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function PantallaPerfilEntrenador() {
  const { usuario } = useSesion();
  const [borrando, setBorrando] = useState(false);
  const clientes = useCarga(() => apiEntrenador.listarClientes());
  const codigo = useCodigoInvitacion({ autoGenerar: true });
  const n = clientes.datos?.items.length ?? 0;

  if (borrando) return <BorrarCuenta clientes={n} onVolver={() => setBorrando(false)} />;

  const k = clientes.datos ? cuentasPanel(clientes.datos.items) : null;
  const conRutina = clientes.datos ? clientes.datos.items.filter((c) => !sinRutina(c)).length : null;

  return (
    <Pantalla>
      <View className="mt-4 flex-row items-center gap-3">
        <Avatar iniciales={usuario ? iniciales(usuario) : '?'} grande />
        <View className="flex-1">
          <Ceja>Cuenta de entrenador{usuario ? ` · desde ${desdeCuando(usuario)}` : ''}</Ceja>
          <Titulo nivel={2}>{usuario ? nombreCompleto(usuario) : ''}</Titulo>
        </View>
      </View>
      <View className="mt-4">
        <TresCifras
          borde={false}
          datos={[
            { valor: k ? String(k.activos) : '–', texto: 'clientes' },
            { valor: conRutina !== null ? String(conRutina) : '–', texto: 'con rutina activa' },
            { valor: k && k.adherencia !== null ? String(k.adherencia) : '–', sufijo: k && k.adherencia !== null ? '%' : '', texto: 'adherencia semana' },
          ]}
        />
      </View>

      <CabezaSeccion titulo="Código para invitar" />
      <Tarjeta>
        <BloqueCodigo codigo={codigo} forma="perfil" />
      </Tarjeta>

      <Preferencias />
      <SeccionAvisos />
      <Cuenta onBorrar={() => setBorrando(true)} />
    </Pantalla>
  );
}

function desdeCuando(u: Usuario): string {
  const d = new Date(u.created_at);
  if (Number.isNaN(d.getTime())) return '';
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// ── Preferencias ─────────────────────────────────────────────────────────────
function Preferencias() {
  const { usuario, actualizarUsuario } = useSesion();
  const { modo, cambiarModo } = useTema();
  const aviso = useAviso();
  const unidad = usuario?.unidades ?? 'kg';

  const guardar = async (parcial: Partial<Pick<Usuario, 'unidades' | 'modo_gimnasio'>>, antes: Partial<Usuario>) => {
    actualizarUsuario(parcial);
    try {
      const u = await apiEntrenador.actualizarPerfil(parcial);
      actualizarUsuario(u);
    } catch (e) {
      actualizarUsuario(antes);
      aviso.mostrar(esSinConexion(e) ? 'Sin conexión: no se guardó el cambio.' : 'No se pudo guardar el cambio.');
    }
  };

  return (
    <>
      <CabezaSeccion titulo="Preferencias" />
      <Tarjeta className="py-1">
        <Interruptor
          etiqueta="Modo gimnasio"
          detalle="Oscuro y con más contraste, para leer rápido entre series."
          valor={modo === 'gimnasio'}
          onCambiar={(v) => {
            cambiarModo(v ? 'gimnasio' : 'clara');
            void guardar({ modo_gimnasio: v }, { modo_gimnasio: !v });
          }}
        />
        <View className="min-h-[56px] flex-row items-center gap-3 border-t border-sup-alta py-2">
          <View className="flex-1">
            <Txt v="cuerpoMedio">Unidades</Txt>
            <Txt v="sec">{unidad === 'kg' ? 'Ves los pesos en kilos.' : 'Ves los pesos en libras.'}</Txt>
          </View>
          <Chips
            opciones={[
              { id: 'kg', nombre: 'kg' },
              { id: 'lb', nombre: 'lb' },
            ]}
            valor={unidad}
            onCambio={(u) => {
              if (u !== unidad) void guardar({ unidades: u }, { unidades: unidad });
            }}
          />
        </View>
      </Tarjeta>
    </>
  );
}

// ── Avisos ───────────────────────────────────────────────────────────────────
// Todavía no hay campo en la API para esto (§API, PATCH /me): se guarda en el teléfono.
function SeccionAvisos() {
  const [a, setA] = useState<Avisos>({ alertas: true, notas: true });
  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(CLAVE_AVISOS)
      .then((crudo) => {
        if (vivo && crudo) setA((p) => ({ ...p, ...(JSON.parse(crudo) as Partial<Avisos>) }));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  const cambiar = (clave: keyof Avisos, v: boolean) => {
    const nuevo = { ...a, [clave]: v };
    setA(nuevo);
    AsyncStorage.setItem(CLAVE_AVISOS, JSON.stringify(nuevo)).catch(() => {});
  };
  return (
    <>
      <CabezaSeccion titulo="Avisos" />
      <Tarjeta className="py-1">
        <Interruptor
          etiqueta="Alertas de tus clientes"
          detalle="Cuando alguien no avanza, baja su rendimiento o anota un dolor."
          valor={a.alertas}
          onCambiar={(v) => cambiar('alertas', v)}
        />
        <View className="border-t border-sup-alta">
          <Interruptor etiqueta="Notas nuevas" detalle="Cuando un cliente deja una observación." valor={a.notas} onCambiar={(v) => cambiar('notas', v)} />
        </View>
      </Tarjeta>
    </>
  );
}

// ── Cuenta ───────────────────────────────────────────────────────────────────
function useExportar() {
  const aviso = useAviso();
  const [exportando, setExportando] = useState(false);
  const exportar = async () => {
    setExportando(true);
    try {
      const { url } = await apiEntrenador.exportar();
      await Linking.openURL(url);
      aviso.mostrar('Listo: gymtrack-mis-datos.zip. Elige dónde guardarlo o a quién mandarlo.');
    } catch (e) {
      aviso.mostrar(esSinConexion(e) ? 'Necesitas conexión para exportar tus datos.' : 'No se pudo preparar tu archivo. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };
  return { exportando, exportar };
}

function Cuenta({ onBorrar }: { onBorrar: () => void }) {
  const { cerrarSesion } = useSesion();
  const aviso = useAviso();
  const { exportando, exportar } = useExportar();
  const [salir, setSalir] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0';
  return (
    <>
      <CabezaSeccion titulo="Tu cuenta" />
      <Tarjeta className="px-4 py-0">
        <Fila
          titulo="Datos personales"
          detalle="Nombre, correo y contraseña."
          onPress={() => aviso.mostrar('Por ahora tu nombre y tu correo no se pueden cambiar desde la app.')}
        />
        <Fila
          titulo={exportando ? 'Preparando tu archivo…' : 'Exportar mis datos'}
          detalle={exportando ? 'Puede tardar unos segundos.' : 'Tus rutinas, ejercicios propios y observaciones, en un archivo para planilla.'}
          onPress={exportando ? undefined : () => void exportar()}
        />
        <Fila
          izquierda={
            <View className="gap-0.5">
              <Text className="font-sans-semibold text-[16px] text-peligro">Borrar mi cuenta</Text>
              <Txt v="sec">Se borra todo en 30 días.</Txt>
            </View>
          }
          etiqueta="Borrar mi cuenta"
          onPress={onBorrar}
          ultimo
        />
      </Tarjeta>
      <Boton titulo="Cerrar sesión" variante="secundario" ancho className="mt-6" onPress={() => setSalir(true)} />
      <Txt v="sec" className="mt-4 text-center">
        <Text className="font-mono-medium">GymTrack {version}</Text>
      </Txt>
      <Hoja
        visible={salir}
        onCerrar={() => setSalir(false)}
        titulo="¿Cerrar sesión?"
        texto="Todo lo que registraste queda guardado en tu cuenta. Para volver, ingresas con tu correo y tu contraseña."
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setSalir(false)} />
            <Boton
              titulo="Cerrar sesión"
              alto
              className="flex-1"
              cargando={saliendo}
              onPress={async () => {
                setSaliendo(true);
                setSalir(false);
                await cerrarSesion();
              }}
            />
          </>
        }
      />
    </>
  );
}

// ── Borrar cuenta ────────────────────────────────────────────────────────────
function BorrarCuenta({ clientes, onVolver }: { clientes: number; onVolver: () => void }) {
  const { cerrarSesion } = useSesion();
  const aviso = useAviso();
  const { exportando, exportar } = useExportar();
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fecha] = useState(() => fmtDiaLargo(new Date(ahoraMs() + 30 * 86_400_000).toISOString()));
  const listo = confirmar.trim().toUpperCase() === 'BORRAR';

  const borrar = async () => {
    setEnviando(true);
    try {
      const r = await apiEntrenador.borrarCuenta();
      aviso.mostrar(`Tu cuenta se borra el ${fmtDiaLargo(r.purga_at) || fecha}. Te mandamos un correo con el detalle.`);
      await cerrarSesion();
    } catch (e) {
      aviso.mostrar(esSinConexion(e) ? 'Necesitas conexión para borrar tu cuenta.' : 'No se pudo borrar la cuenta. Intenta de nuevo.');
      setEnviando(false);
    }
  };

  const pasos = [
    <>
      <Text className="font-sans-bold text-texto">Hoy</Text> se cierra tu sesión en todos tus teléfonos.
      {clientes ? ` Tus ${clientes} ${clientes === 1 ? 'cliente queda' : 'clientes quedan'} sin entrenador, con todo su historial.` : ''}
    </>,
    <>
      <Text className="font-sans-bold text-texto">El {fecha}</Text> borramos tu cuenta, tus rutinas y tus ejercicios propios.
    </>,
    <>Después de esa fecha no hay forma de recuperarlos.</>,
  ];

  return (
    <Pantalla
      cabecera={<Cabecera atras titulo="Borrar cuenta" alVolver={onVolver} />}
      accion={<Boton titulo="Borrar mi cuenta" variante="peligro" alto ancho disabled={!listo} cargando={enviando} onPress={() => void borrar()} />}
    >
      <Titulo nivel={2} className="mt-2">
        Antes de borrar, lee esto
      </Titulo>
      <View className="mt-4 gap-3">
        {pasos.map((p, i) => (
          <View key={i} className="flex-row items-start gap-3">
            <View className="h-7 w-7 items-center justify-center rounded-control bg-sup-alta">
              <Text className="font-mono-bold text-[14px] text-texto">{i + 1}</Text>
            </View>
            <Txt v="cuerpo" className="flex-1">
              {p}
            </Txt>
          </View>
        ))}
      </View>
      <Tarjeta className="mt-6">
        <Txt v="h3">Llévate tus datos primero</Txt>
        <Txt v="sec" className="mt-1">
          Un archivo para planilla con tus rutinas, ejercicios y observaciones.
        </Txt>
        <Boton
          titulo={exportando ? 'Preparando…' : 'Exportar mis datos'}
          variante="secundario"
          ancho
          className="mt-3"
          disabled={exportando}
          onPress={() => void exportar()}
        />
      </Tarjeta>
      <View className="mt-6">
        <CampoTexto
          etiqueta="Para confirmar, escribe BORRAR"
          valor={confirmar}
          onCambiar={setConfirmar}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
        />
      </View>
    </Pantalla>
  );
}
