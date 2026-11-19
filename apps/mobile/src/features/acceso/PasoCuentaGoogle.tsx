// ─────────────────────────────────────────────────────────────────────────────
// Completa tu cuenta (después de Google) · Zona: Acceso
//
// Qué hace: lo que se ve cuando alguien entra con Google y su correo todavía no tiene cuenta.
// Con el estilo de Crear cuenta: el correo de Google arriba, el rol en grande («Como cliente» o
// «Como entrenador», no se cambia después) y nombre y apellido llenos con lo que dio Google, que
// se pueden corregir. Los errores salen al tocar «Crear mi cuenta», bajo cada campo, y se van al
// corregir. La cuenta queda sin contraseña: para entrar con correo se crea con «Olvidé mi
// contraseña», y se avisa aquí. Con éxito no navega: el layout raíz lleva a cada rol a su inicio.
// Tócalo cuando: cambie qué se pide para crear la cuenta con Google.
// No lo toques para: el envío a la API (useIngresoGoogle.ts) ni la regla de los campos
// (validacion.ts y packages/shared).
// Depende de: @/components/ui, ./componentes, ./google, ./legal, ./validacion y
// ./useIngresoGoogle.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState } from 'react';
import { Text, View, type TextInput } from 'react-native';
import { BotonIcono, Boton, CampoTexto, Ceja, Pantalla, Titulo, Txt, useAviso } from '@/components/ui';
import { BarraCarga, Mensaje, OpcionGrande } from './componentes';
import { formatoReloj } from './errores';
import { formDesdePerfil } from './google';
import { abrirLegal } from './legal';
import type { IngresoGoogle, PasoGoogle } from './useIngresoGoogle';
import {
  ORDEN_CUENTA_GOOGLE,
  primerError,
  sinErrores,
  validarCuentaGoogle,
  type Errores,
  type FormCuentaGoogle,
  type RolAcceso,
  LARGO_MAXIMO,
} from './validacion';

export function PasoCuentaGoogle({ google, paso }: { google: IngresoGoogle; paso: PasoGoogle }) {
  const aviso = useAviso();
  const [form, setForm] = useState<FormCuentaGoogle>(() => formDesdePerfil(paso.perfil, paso.rol));
  const [err, setErr] = useState<Errores<keyof FormCuentaGoogle>>({});
  const [intento, setIntento] = useState(false);
  const nombreRef = useRef<TextInput>(null);
  const apellidoRef = useRef<TextInput>(null);
  const cargando = google.cargando;
  const espera = google.espera;

  function enfocar(campo: keyof FormCuentaGoogle) {
    if (campo === 'nombre') nombreRef.current?.focus();
    if (campo === 'apellido') apellidoRef.current?.focus();
  }

  function cambiar(campo: 'nombre' | 'apellido', valor: string) {
    const nuevo = { ...form, [campo]: valor };
    setForm(nuevo);
    // Tras el primer intento cada campo se revisa al escribir: el error se va apenas se corrige.
    setErr((e) => {
      const siguiente = { ...e };
      const ahora = validarCuentaGoogle(nuevo)[campo];
      if (intento && ahora) siguiente[campo] = ahora;
      else delete siguiente[campo];
      return siguiente;
    });
  }

  function elegirRol(rol: RolAcceso) {
    setForm((f) => ({ ...f, rol }));
    setErr((e) => ({ ...e, rol: undefined }));
  }

  async function enviar() {
    if (cargando || espera > 0) return;
    setIntento(true);
    const e = validarCuentaGoogle(form);
    setErr(e);
    if (!sinErrores(e)) {
      const primero = primerError(e, ORDEN_CUENTA_GOOGLE);
      if (primero) enfocar(primero);
      return;
    }
    const r = await google.crearCuenta({ rol: form.rol, nombre: form.nombre.trim(), apellido: form.apellido.trim() });
    if (r?.tipo === 'campo') {
      setErr((x) => ({ ...x, [r.campo]: r.mensaje }));
      enfocar(r.campo);
    }
  }

  return (
    <Pantalla
      cabecera={
        <View>
          <BarraCarga etiqueta="Creando tu cuenta" visible={cargando} />
          <View className="-ml-3 h-14 flex-row items-center">
            <BotonIcono icono="atras" etiqueta="Volver sin crear la cuenta" disabled={cargando} onPress={google.volver} />
          </View>
        </View>
      }
      accion={
        <Boton
          titulo={espera > 0 ? `Espera ${formatoReloj(espera)}` : 'Crear mi cuenta'}
          alto
          ancho
          cargando={cargando ? 'Creando tu cuenta…' : false}
          disabled={espera > 0}
          onPress={enviar}
        />
      }
    >
      <Titulo className="mt-1">Completa tu cuenta</Titulo>
      <Txt v="sec" className="mt-2">
        Entraste con Google como {paso.perfil.email}. Falta elegir cómo vas a usar GymTrack.
      </Txt>
      {google.mensaje ? <Mensaje mensaje={google.mensaje} /> : null}

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
            maxLength={LARGO_MAXIMO.nombre}
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
            maxLength={LARGO_MAXIMO.nombre}
            valor={form.apellido}
            onCambiar={(v) => cambiar('apellido', v)}
            error={err.apellido}
            editable={!cargando}
            autoComplete="family-name"
            textContentType="familyName"
            autoCapitalize="words"
            returnKeyType="go"
            onSubmitEditing={enviar}
          />
        </View>
      </View>

      <Text className="mt-5 font-sans-medium text-[13px] leading-[19px] text-texto-2">
        Tu cuenta queda sin contraseña. Si después quieres entrar con tu correo, créala con «Olvidé mi contraseña» en Ingreso.
      </Text>

      <Text className="mt-3 font-sans-medium text-[13px] leading-[19px] text-texto-2">
        Al crear tu cuenta aceptas los{' '}
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
