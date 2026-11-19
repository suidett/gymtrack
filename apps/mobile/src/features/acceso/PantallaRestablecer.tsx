// ─────────────────────────────────────────────────────────────────────────────
// Nueva contraseña desde el enlace · Zona: Acceso
//
// Qué hace: PAN-03, segunda mitad de docs/pantallas/recuperar.html. Es el destino del enlace
// del correo (gymtrack://restablecer?token=...). Pide la contraseña nueva con la misma regla
// visible de Crear cuenta (sin repetirla: con Mostrar se revisa) y manda
// POST /v1/auth/password/reset. Pasos: «Nueva contraseña», «Guardando», «Contraseña guardada»
// y «Enlace vencido» (vencido, usado o inventado responden igual, APP-010).
// El enlace no trae el correo (no se pone un correo en una URL), por eso no se muestra «Para ...».
// Tampoco se sabe a qué hora se pidió: el enlace vencido no muestra la hora.
// Tócalo cuando: cambie la maqueta de Recuperar en estos pasos.
// No lo toques para: pedir el enlace (PantallaRecuperar.tsx).
// Depende de: @/components/ui, @/lib/sesion (api.cliente.restablecerContrasena), expo-router,
// ./componentes, ./validacion y ./errores.
// ─────────────────────────────────────────────────────────────────────────────
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View, type TextInput } from 'react-native';
import { Boton, BotonIcono, CampoTexto, Ceja, Icono, Pantalla, Titulo } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { BarraCarga, CejaAlerta, Mensaje, ReglaContrasena } from './componentes';
import { errorDeRestablecer, type MensajePantalla } from './errores';
import { errorContrasenaNueva, reglaContrasena, LARGO_MAXIMO } from './validacion';

type Paso = 'nueva' | 'lista' | 'vencido';

const MENSAJE_SIN_RED: MensajePantalla = {
  titulo: 'Sin conexión',
  texto: 'Para guardar la contraseña necesitas internet. Revisa la señal o el wifi e intenta de nuevo.',
  tono: 'neutro',
};
const MENSAJE_FALLO: MensajePantalla = {
  titulo: 'No pudimos guardar',
  texto: 'Algo falló de nuestro lado. Intenta de nuevo en un momento.',
  tono: 'peligro',
};

const parrafo = 'mt-2 font-sans-medium text-[15px] leading-[21px] text-texto-2';

export function PantallaRestablecer() {
  const { api } = useSesion();
  const { c } = useTema();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [paso, setPaso] = useState<Paso>(token ? 'nueva' : 'vencido');
  const [clave, setClave] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajePantalla | null>(null);
  const claveRef = useRef<TextInput>(null);

  async function guardar() {
    if (cargando || !token) return;
    const e = errorContrasenaNueva(clave);
    if (e) {
      setErr(e);
      claveRef.current?.focus();
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await api.cliente.restablecerContrasena({ token, password: clave });
      setClave('');
      setPaso('lista');
    } catch (error) {
      const r = errorDeRestablecer(error);
      if (r.tipo === 'vencido') setPaso('vencido');
      else if (r.tipo === 'clave') setErr(r.mensaje);
      else setMensaje(r.tipo === 'red' ? MENSAJE_SIN_RED : MENSAJE_FALLO);
    } finally {
      setCargando(false);
    }
  }

  const aIngreso = () => router.replace('/ingreso');
  const cabecera = (
    <View>
      <BarraCarga etiqueta="Guardando" visible={cargando} />
      <View className="-ml-3 h-14 flex-row items-center">
        <BotonIcono icono="atras" etiqueta="Volver al ingreso" disabled={cargando} onPress={aIngreso} />
      </View>
    </View>
  );

  if (paso === 'lista') {
    return (
      <Pantalla cabecera={cabecera} accion={<Boton titulo="Ingresar" alto ancho onPress={aIngreso} />}>
        <View className="mb-2 mt-4 h-14 w-14 items-center justify-center rounded-control border-2 border-hecho-borde bg-hecho-fondo">
          <Icono nombre="visto" tamano={32} color={c.visto} />
        </View>
        <Ceja acento>Listo</Ceja>
        <Titulo className="mt-1">Guardaste tu contraseña nueva</Titulo>
        <Text className={parrafo}>Ya puedes ingresar con ella. Cerramos tu sesión en los demás teléfonos.</Text>
      </Pantalla>
    );
  }

  if (paso === 'vencido') {
    return (
      <Pantalla
        cabecera={cabecera}
        accion={
          <View className="gap-1">
            <Boton titulo="Pedir otro enlace" alto ancho onPress={() => router.replace('/recuperar')} />
            <Boton titulo="Volver a ingresar" variante="fantasma" ancho onPress={aIngreso} />
          </View>
        }
      >
        <View className="mt-2">
          <CejaAlerta>Enlace vencido</CejaAlerta>
        </View>
        <Titulo className="mt-1">Este enlace ya no sirve</Titulo>
        <Text className={parrafo}>Los enlaces duran una hora y se usan una sola vez. Pide otro y ábrelo apenas te llegue.</Text>
      </Pantalla>
    );
  }

  const regla = reglaContrasena(clave, !!err);
  return (
    <Pantalla
      cabecera={cabecera}
      accion={<Boton titulo="Guardar contraseña" alto ancho cargando={cargando ? 'Guardando…' : false} onPress={guardar} />}
    >
      <Titulo className="mt-1">Crea tu contraseña nueva</Titulo>
      {mensaje ? <Mensaje mensaje={mensaje} /> : null}
      <View className="mt-4">
        <CampoTexto
          ref={claveRef}
          etiqueta="Contraseña nueva"
          maxLength={LARGO_MAXIMO.clave}
          valor={clave}
          onCambiar={(v) => {
            setClave(v);
            if (err && !errorContrasenaNueva(v)) setErr(null);
          }}
          editable={!cargando}
          contrasena
          autoComplete="new-password"
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="done"
          onSubmitEditing={guardar}
        />
        <ReglaContrasena
          texto={err && err !== 'corta' ? err : regla.texto}
          cumple={regla.cumple}
          error={!!err && (!regla.cumple || err !== 'corta')}
          cuenta={regla.cuenta}
          cuentaVoz={regla.cuentaVoz}
        />
      </View>
      <Text className="mt-5 font-sans-medium text-[13px] leading-[18px] text-texto-2">
        Al guardarla, se cierra tu sesión en los demás teléfonos.
      </Text>
    </Pantalla>
  );
}
