// ─────────────────────────────────────────────────────────────────────────────
// Crear cuenta (pantalla) · Zona: Acceso
//
// Qué hace: PAN-02, como docs/pantallas/crear-cuenta.html. Primero y en grande el rol («Como
// cliente» o «Como entrenador»), que no se puede cambiar después; nombre y apellido lado a lado,
// correo y contraseña con la regla visible de 8 caracteres. Los errores salen al tocar
// «Registrarme», bajo cada campo, y se van al corregir. Si el correo ya tiene cuenta, ofrece
// ingresar o recuperar la contraseña ahí mismo. Con éxito no navega: el layout raíz lleva al
// cliente a la Encuesta y al entrenador a Clientes (APP-008).
// Tócalo cuando: cambie la maqueta de Crear cuenta.
// No lo toques para: la regla de la contraseña (validacion.ts y packages/shared).
// Depende de: @/components/ui, @/lib/sesion (useSesion), expo-router, expo-constants (URL de
// términos y privacidad), ./componentes, ./validacion y ./errores.
// ─────────────────────────────────────────────────────────────────────────────
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Text, View, type TextInput } from 'react-native';
import { BotonIcono, Boton, CampoTexto, Ceja, Pantalla, Titulo, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { BarraCarga, Mensaje, OpcionGrande, ReglaContrasena, useCuentaRegresiva } from './componentes';
import { errorDeRegistro, formatoReloj, TEXTO_CORREO_USADO, type MensajePantalla } from './errores';
import {
  limpiarCorreo,
  ORDEN_REGISTRO,
  primerError,
  reglaContrasena,
  rolApi,
  sinErrores,
  validarRegistro,
  type CampoRegistro,
  type Errores,
  type FormRegistro,
  type RolAcceso,
} from './validacion';

/** Abre una página legal si app.json la define en `extra`; si no, avisa que todavía no está. */
export function abrirLegal(clave: 'urlTerminos' | 'urlPrivacidad', avisar: (t: string) => void) {
  const url = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[clave];
  if (typeof url === 'string' && url) {
    Linking.openURL(url).catch(() => avisar('No pudimos abrir la página. Intenta de nuevo.'));
    return;
  }
  avisar(clave === 'urlTerminos' ? 'Los términos de uso se publican antes de la primera prueba.' : 'La política de privacidad se publica antes de la primera prueba.');
}

export function PantallaCrearCuenta() {
  const { registrar } = useSesion();
  const aviso = useAviso();
  const params = useLocalSearchParams<{ rol?: string }>();
  const rolPedido: RolAcceso | null = params.rol === 'entrenador' ? 'entrenador' : params.rol === 'cliente' ? 'cliente' : null;
  const [form, setForm] = useState<FormRegistro>({ rol: rolPedido, nombre: '', apellido: '', correo: '', clave: '' });
  const [err, setErr] = useState<Errores<CampoRegistro>>({});
  const [correoUsado, setCorreoUsado] = useState(false);
  const [intento, setIntento] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajePantalla | null>(null);
  const bloqueo = useCuentaRegresiva();
  const nombreRef = useRef<TextInput>(null);
  const apellidoRef = useRef<TextInput>(null);
  const correoRef = useRef<TextInput>(null);
  const claveRef = useRef<TextInput>(null);

  /** Lleva el foco al campo (el rol no es un campo de texto: no se enfoca). */
  function enfocar(campo: CampoRegistro) {
    const ref = { nombre: nombreRef, apellido: apellidoRef, correo: correoRef, clave: claveRef, rol: null }[campo];
    ref?.current?.focus();
  }

  const ingresoConRol = () => router.replace({ pathname: '/ingreso', params: form.rol ? { rol: form.rol } : {} });

  function cambiar(campo: Exclude<CampoRegistro, 'rol'>, valor: string) {
    const nuevo = { ...form, [campo]: valor };
    setForm(nuevo);
    if (campo === 'correo') setCorreoUsado(false);
    // Tras el primer intento cada campo se revisa al escribir: el error se va apenas se corrige.
    setErr((e) => {
      const siguiente = { ...e };
      const ahora = validarRegistro(nuevo)[campo];
      if (campo === 'clave') {
        if (!ahora) delete siguiente.clave;
      } else if (intento && ahora) siguiente[campo] = ahora;
      else delete siguiente[campo];
      return siguiente;
    });
  }

  function elegirRol(rol: RolAcceso) {
    setForm((f) => ({ ...f, rol }));
    setErr((e) => ({ ...e, rol: undefined }));
  }

  async function enviar() {
    if (cargando || bloqueo.resta > 0) return;
    setIntento(true);
    const e = validarRegistro(form);
    setErr(e);
    setCorreoUsado(false);
    if (!sinErrores(e)) {
      const primero = primerError(e, ORDEN_REGISTRO);
      if (primero) enfocar(primero);
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await registrar({
        rol: rolApi(form.rol as RolAcceso),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: limpiarCorreo(form.correo),
        password: form.clave,
      });
    } catch (error) {
      setCargando(false);
      const r = errorDeRegistro(error);
      if (r.tipo === 'correo-usado') {
        setCorreoUsado(true);
        setErr((x) => ({ ...x, correo: TEXTO_CORREO_USADO }));
        enfocar('correo');
      } else if (r.tipo === 'campo') {
        setErr((x) => ({ ...x, [r.campo]: r.campo === 'clave' ? 'corta' : r.mensaje }));
        enfocar(r.campo);
      } else {
        setMensaje(r.mensaje);
        if (r.tipo === 'bloqueo') bloqueo.iniciar(r.esperaS);
      }
    }
  }

  const regla = reglaContrasena(form.clave, !!err.clave);
  const resta = bloqueo.resta;

  return (
    <Pantalla
      cabecera={
        <View>
          <BarraCarga etiqueta="Creando tu cuenta" visible={cargando} />
          <View className="-ml-3 h-14 flex-row items-center">
            <BotonIcono icono="atras" etiqueta="Volver al ingreso" disabled={cargando} onPress={ingresoConRol} />
          </View>
        </View>
      }
      accion={
        <View className="gap-1">
          <Boton
            titulo={resta > 0 ? `Espera ${formatoReloj(resta)}` : 'Registrarme'}
            alto
            ancho
            cargando={cargando ? 'Creando tu cuenta…' : false}
            disabled={resta > 0}
            onPress={enviar}
          />
          <Boton titulo="¿Ya tienes cuenta? Ingresa" variante="fantasma" ancho disabled={cargando} onPress={ingresoConRol} />
        </View>
      }
    >
      <Titulo className="mt-1">Crea tu cuenta</Titulo>
      {mensaje ? <Mensaje mensaje={mensaje} /> : null}

      <Ceja className="mb-2 mt-5">¿Cómo vas a usar GymTrack?</Ceja>
      <View accessibilityRole="radiogroup" accessibilityLabel="¿Cómo vas a usar GymTrack?" className="gap-2">
        <OpcionGrande
          titulo="Como cliente"
          detalle="Registras tus entrenamientos y ves tu avance."
          activa={form.rol === 'cliente'}
          disabled={cargando}
          onPress={() => elegirRol('cliente')}
        />
        <OpcionGrande
          titulo="Como entrenador"
          detalle="Armas rutinas y sigues a tus clientes."
          activa={form.rol === 'entrenador'}
          disabled={cargando}
          onPress={() => elegirRol('entrenador')}
        />
      </View>
      {err.rol ? (
        <Txt v="error" className="mt-2" accessibilityLiveRegion="polite">
          {err.rol}
        </Txt>
      ) : (
        <Text className="mt-2 font-sans-medium text-[13px] leading-[18px] text-texto-2">No se puede cambiar después.</Text>
      )}

      <View className="mt-4 flex-row gap-2">
        <View className="flex-1">
          <CampoTexto
            ref={nombreRef}
            etiqueta="Nombre"
            valor={form.nombre}
            onCambiar={(v) => cambiar('nombre', v)}
            error={err.nombre}
            editable={!cargando}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => apellidoRef.current?.focus()}
          />
        </View>
        <View className="flex-1">
          <CampoTexto
            ref={apellidoRef}
            etiqueta="Apellido"
            valor={form.apellido}
            onCambiar={(v) => cambiar('apellido', v)}
            error={err.apellido}
            editable={!cargando}
            autoComplete="family-name"
            textContentType="familyName"
            autoCapitalize="words"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => correoRef.current?.focus()}
          />
        </View>
      </View>

      <View className="mt-4">
        <CampoTexto
          ref={correoRef}
          etiqueta="Correo"
          valor={form.correo}
          onCambiar={(v) => cambiar('correo', v)}
          error={err.correo}
          editable={!cargando}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => claveRef.current?.focus()}
        />
        {correoUsado ? (
          <View className="-ml-3 mt-0.5 flex-row flex-wrap gap-1">
            <Boton titulo="Ingresar con él" variante="fantasma" onPress={ingresoConRol} />
            <Boton titulo="Recuperar contraseña" variante="fantasma" onPress={() => router.push('/recuperar')} />
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        <CampoTexto
          ref={claveRef}
          etiqueta="Contraseña"
          valor={form.clave}
          onCambiar={(v) => cambiar('clave', v)}
          editable={!cargando}
          contrasena
          autoComplete="new-password"
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          onSubmitEditing={enviar}
        />
        <ReglaContrasena
          texto={err.clave && err.clave !== 'corta' ? err.clave : regla.texto}
          cumple={regla.cumple}
          error={!!err.clave && (!regla.cumple || err.clave !== 'corta')}
          cuenta={regla.cuenta}
          cuentaVoz={regla.cuentaVoz}
        />
      </View>

      <Text className="mt-5 font-sans-medium text-[13px] leading-[19px] text-texto-2">
        Al registrarte aceptas los{' '}
        <Text
          accessibilityRole="link"
          suppressHighlighting
          onPress={() => abrirLegal('urlTerminos', aviso.mostrar)}
          className="font-sans-semibold text-texto underline"
        >
          términos de uso
        </Text>{' '}
        y la{' '}
        <Text
          accessibilityRole="link"
          suppressHighlighting
          onPress={() => abrirLegal('urlPrivacidad', aviso.mostrar)}
          className="font-sans-semibold text-texto underline"
        >
          política de privacidad
        </Text>
        .
      </Text>
    </Pantalla>
  );
}
