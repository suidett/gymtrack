// ─────────────────────────────────────────────────────────────────────────────
// Ingreso (pantalla) · Zona: Acceso
//
// Qué hace: PAN-01, como docs/pantallas/ingreso.html. Selector «Ingresas como» Cliente o
// Entrenador, correo y contraseña con Mostrar, «Olvidé mi contraseña» y, abajo al alcance del
// pulgar, «Ingresar» y «¿No tienes cuenta? Regístrate» (que abre Crear cuenta con ese rol ya
// marcado). Estados: normal, cargando (barra fina y «Ingresando…»), error de credenciales (no
// dice cuál de los dos está mal y borra la contraseña), sin conexión y demasiados intentos con
// cuenta regresiva desde el Retry-After. Abajo, «Continuar con Google» (BotonGoogle.tsx); en web
// Google vuelve a esta pantalla y aquí se recoge el token. Si el correo de Google no tiene
// cuenta, la pantalla pasa a «Completa tu cuenta». Con éxito no navega: el layout raíz lleva a
// cada rol a su inicio solo (al alumno sin encuesta, a la Encuesta).
// Tócalo cuando: cambie la maqueta de Ingreso.
// No lo toques para: a dónde va cada rol (src/app/_layout.tsx) ni cómo se guardan los tokens
// (src/lib/sesion).
// Depende de: @/components/ui, @/lib/sesion (useSesion), expo-router, ./componentes,
// ./validacion, ./errores y lo de Google (./BotonGoogle, ./useIngresoGoogle, ./PasoCuentaGoogle).
// ─────────────────────────────────────────────────────────────────────────────
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { Boton, CampoTexto, Ceja, Pantalla, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { SeccionGoogle } from './BotonGoogle';
import { BarraCarga, LogoApilado, Mensaje, Segmento, useCuentaRegresiva } from './componentes';
import {
  errorDeIngreso,
  esErrorDeRed,
  formatoReloj,
  formTrasErrorIngreso,
  MENSAJE_SIN_RED_INGRESO,
  type MensajePantalla,
} from './errores';
import { PasoCuentaGoogle } from './PasoCuentaGoogle';
import { useIngresoGoogle } from './useIngresoGoogle';
import { limpiarCorreo, sinErrores, validarIngreso, type Errores, type FormIngreso, type RolAcceso, LARGO_MAXIMO } from './validacion';

const ROLES: { id: RolAcceso; nombre: string }[] = [
  { id: 'cliente', nombre: 'Cliente' },
  { id: 'entrenador', nombre: 'Entrenador' },
];

const MENSAJE_VENCIDA: MensajePantalla = {
  titulo: 'Tu sesión venció',
  texto: 'Por seguridad, ingresa de nuevo para seguir.',
  tono: 'neutro',
};

export function PantallaIngreso() {
  const { ingresar, ultimoCierre, api } = useSesion();
  const aviso = useAviso();
  const params = useLocalSearchParams<{ rol?: string }>();
  const [rol, setRol] = useState<RolAcceso>(params.rol === 'entrenador' ? 'entrenador' : 'cliente');
  const [form, setForm] = useState<FormIngreso>({ correo: '', clave: '' });
  const [err, setErr] = useState<Errores<keyof FormIngreso>>({});
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajePantalla | null>(ultimoCierre === 'vencida' ? MENSAJE_VENCIDA : null);
  const [tipoMensaje, setTipoMensaje] = useState<'credenciales' | 'bloqueo' | 'red' | 'otro' | null>(null);
  const bloqueo = useCuentaRegresiva();
  // En web, Google vuelve a esta pantalla: el hook recoge el token al montar.
  const google = useIngresoGoogle({ rol, leerRetorno: true });
  const correoRef = useRef<TextInput>(null);
  const claveRef = useRef<TextInput>(null);

  // Al abrir, una consulta liviana a /health dice si hay red; si no, se ve «Sin conexión» de
  // entrada. El botón sigue activo: tocarlo vuelve a intentar.
  useEffect(() => {
    let vivo = true;
    api.cliente.salud().catch((e: unknown) => {
      if (vivo && esErrorDeRed(e)) {
        setMensaje(MENSAJE_SIN_RED_INGRESO);
        setTipoMensaje('red');
      }
    });
    return () => {
      vivo = false;
    };
  }, [api]);

  function cambiar(campo: keyof FormIngreso, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErr((e) => ({ ...e, [campo]: undefined }));
    // Al escribir, el error de credenciales se va: ya está corrigiendo.
    if (tipoMensaje === 'credenciales') {
      setMensaje(null);
      setTipoMensaje(null);
    }
  }

  async function enviar() {
    if (cargando || bloqueo.resta > 0) return;
    const e = validarIngreso(form);
    setErr(e);
    if (!sinErrores(e)) {
      (e.correo ? correoRef : claveRef).current?.focus();
      return;
    }
    setCargando(true);
    setMensaje(null);
    setTipoMensaje(null);
    google.limpiarMensaje();
    try {
      const usuario = await ingresar({ email: limpiarCorreo(form.correo), password: form.clave });
      // La cuenta manda: si eligió el otro rol, igual entra al suyo, y se lo decimos.
      const esEntrenador = usuario.rol === 'trainer';
      if (esEntrenador !== (rol === 'entrenador')) {
        aviso.mostrar(esEntrenador ? 'Tu cuenta es de entrenador: entraste a Clientes.' : 'Tu cuenta es de cliente: entraste a tu inicio.');
      }
    } catch (error) {
      const r = errorDeIngreso(error);
      setCargando(false);
      if (r.tipo === 'correo') {
        setErr({ correo: r.texto });
        correoRef.current?.focus();
        return;
      }
      setMensaje(r.mensaje);
      setTipoMensaje(r.tipo);
      setForm((f) => formTrasErrorIngreso(f, r));
      if (r.tipo === 'bloqueo') bloqueo.iniciar(r.esperaS);
      if (r.tipo === 'credenciales') claveRef.current?.focus();
    }
  }

  const resta = bloqueo.resta;
  const tituloBoton = resta > 0 ? `Espera ${formatoReloj(resta)}` : 'Ingresar';
  const ocupado = cargando || google.cargando;
  const mensajeVisible = mensaje ?? google.mensaje;

  // El correo de Google no tiene cuenta: se piden rol, nombre y apellido.
  if (google.paso) return <PasoCuentaGoogle google={google} paso={google.paso} />;

  return (
    <View className="flex-1 bg-fondo">
      <Pantalla
        cabecera={<BarraCarga etiqueta={google.cargando ? 'Conectando con Google' : 'Ingresando'} visible={ocupado} />}
        accion={
          <View className="gap-1">
            <Boton
              titulo={tituloBoton}
              alto
              ancho
              cargando={cargando ? 'Ingresando…' : false}
              disabled={resta > 0 || google.cargando}
              onPress={enviar}
            />
            <Boton
              titulo="¿No tienes cuenta? Regístrate"
              variante="fantasma"
              ancho
              disabled={ocupado}
              onPress={() => router.push({ pathname: '/crear-cuenta', params: { rol } })}
            />
          </View>
        }
      >
        <LogoApilado />
        <Ceja>Ingresas como</Ceja>
        <Segmento opciones={ROLES} valor={rol} onCambio={setRol} etiqueta="Ingresas como" disabled={ocupado} />
        {mensajeVisible ? <Mensaje mensaje={mensajeVisible} /> : null}
        <View className="mt-4">
          <CampoTexto
            ref={correoRef}
            etiqueta="Correo"
            maxLength={LARGO_MAXIMO.correo}
            valor={form.correo}
            onCambiar={(v) => cambiar('correo', v)}
            error={err.correo}
            editable={!ocupado}
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
        </View>
        <View className="mt-4">
          <CampoTexto
            ref={claveRef}
            etiqueta="Contraseña"
            maxLength={LARGO_MAXIMO.clave}
            valor={form.clave}
            onCambiar={(v) => cambiar('clave', v)}
            error={err.clave}
            editable={!ocupado}
            contrasena
            autoComplete="current-password"
            textContentType="password"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="go"
            onSubmitEditing={enviar}
          />
        </View>
        <View className="-mr-3 mt-1 flex-row justify-end">
          <Boton titulo="Olvidé mi contraseña" variante="fantasma" disabled={ocupado} onPress={() => router.push('/recuperar')} />
        </View>
        <SeccionGoogle google={google} rol={rol} disabled={cargando} />
      </Pantalla>
    </View>
  );
}
