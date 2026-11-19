// ─────────────────────────────────────────────────────────────────────────────
// Recuperar contraseña (pedir el enlace) · Zona: Acceso
//
// Qué hace: PAN-03, primera mitad de docs/pantallas/recuperar.html. Pide el correo y manda
// POST /v1/auth/password/forgot. Pasos: «Pedir el enlace» (con correo mal escrito y enviando),
// «Enlace enviado» (no confirma que el correo tenga cuenta, dice a qué hora vence el enlace,
// reenvío a los 60 s con «n de 3 en esta hora») y «Límite de envíos» (3 por hora por correo,
// con la hora en que se podrá pedir otro). El enlace del correo abre la app en Restablecer.
// Tócalo cuando: cambie la maqueta de Recuperar en estos pasos.
// No lo toques para: la contraseña nueva desde el enlace (PantallaRestablecer.tsx).
// Depende de: @/components/ui, @/lib/sesion (api.cliente.olvideContrasena), expo-router,
// ./componentes, ./recuperar, ./validacion y ./errores.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Platform, Text, View, type TextInput } from 'react-native';
import { Boton, BotonIcono, CampoTexto, Ceja, Pantalla, Separador, Tarjeta, Titulo, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { BarraCarga, CejaAlerta, Mensaje, useCuentaRegresiva } from './componentes';
import { errorDePedirEnlace, formatoReloj, horaCorta, type MensajePantalla } from './errores';
import {
  avisoReenvio,
  enviosEnLaHora,
  ENVIOS_POR_HORA,
  ESPERA_REENVIO_S,
  llegoAlLimite,
  proximoPermitido,
  registrarEnvio,
  SIN_ENVIOS,
  venceEnlace,
  type Envios,
} from './recuperar';
import { errorCorreo, limpiarCorreo, LARGO_MAXIMO } from './validacion';

type Paso = 'pedir' | 'enviado' | 'limite';

const MENSAJE_SIN_RED: MensajePantalla = {
  titulo: 'Sin conexión',
  texto: 'Para pedir el enlace necesitas internet. Revisa la señal o el wifi e intenta de nuevo.',
  tono: 'neutro',
};
const MENSAJE_FALLO: MensajePantalla = {
  titulo: 'No pudimos enviar el enlace',
  texto: 'Algo falló de nuestro lado. Intenta de nuevo en un momento.',
  tono: 'peligro',
};

/** Abre la app de correo. En iOS, Mail; en Android, el selector de apps de correo. */
export async function abrirCorreo(avisar: (t: string) => void) {
  const url = Platform.OS === 'ios' ? 'message://' : 'mailto:';
  try {
    await Linking.openURL(url);
  } catch {
    avisar('No encontramos una app de correo. Ábrela tú y busca el enlace de GymTrack.');
  }
}

/** Una línea de «¿No te llega?» con su raya a la izquierda. */
function Pista({ children }: { children: string }) {
  return (
    <View className="flex-row items-start py-1.5">
      <View className="mr-2.5 mt-[9px] h-[3px] w-2 rounded-[1px] bg-texto-2" />
      <Txt v="cuerpo" className="flex-1 text-[15px] leading-[21px]">
        {children}
      </Txt>
    </View>
  );
}

export function PantallaRecuperar() {
  const { api } = useSesion();
  const aviso = useAviso();
  const [paso, setPaso] = useState<Paso>('pedir');
  const [correo, setCorreo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajePantalla | null>(null);
  const [envios, setEnvios] = useState<Envios>(SIN_ENVIOS);
  const [vence, setVence] = useState<number | null>(null);
  const [permitido, setPermitido] = useState<number | null>(null);
  const reenvio = useCuentaRegresiva();
  const correoRef = useRef<TextInput>(null);

  /** Manda el pedido. `reenviando` es true desde «Reenviar enlace». */
  async function pedir(reenviando: boolean) {
    if (cargando) return;
    const e = errorCorreo(correo);
    if (e) {
      setErr(e);
      correoRef.current?.focus();
      return;
    }
    const limpio = limpiarCorreo(correo);
    const ahora = Date.now();
    // Si la cuenta local ya llegó a 3, no se gasta una llamada que daría 429.
    if (llegoAlLimite(envios.correo === limpio ? envios : SIN_ENVIOS, ahora)) {
      setPermitido(proximoPermitido(envios, ahora, null));
      setPaso('limite');
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await api.cliente.olvideContrasena(limpio);
      const despues = Date.now();
      const nuevos = registrarEnvio(envios, limpio, despues);
      setEnvios(nuevos);
      setVence(venceEnlace(nuevos));
      reenvio.iniciar(ESPERA_REENVIO_S);
      setPaso('enviado');
      if (reenviando) aviso.mostrar(avisoReenvio(enviosEnLaHora(nuevos, despues)));
    } catch (error) {
      const r = errorDePedirEnlace(error);
      if (r.tipo === 'limite') {
        setPermitido(proximoPermitido(envios, Date.now(), r.esperaS));
        setPaso('limite');
      } else if (r.tipo === 'correo') {
        setPaso('pedir');
        setErr(r.mensaje);
      } else if (reenviando) {
        aviso.mostrar(r.tipo === 'red' ? 'Sin conexión: no pudimos reenviar el enlace.' : 'No pudimos reenviar el enlace. Intenta de nuevo.');
      } else {
        setMensaje(r.tipo === 'red' ? MENSAJE_SIN_RED : MENSAJE_FALLO);
      }
    } finally {
      setCargando(false);
    }
  }

  function otroCorreo() {
    setPaso('pedir');
    setErr(null);
    setMensaje(null);
    reenvio.detener();
  }

  const volverIngreso = () => (router.canGoBack() ? router.back() : router.replace('/ingreso'));
  const cabecera = (
    <View>
      <BarraCarga etiqueta={paso === 'pedir' ? 'Enviando' : 'Reenviando'} visible={cargando} />
      <View className="-ml-3 h-14 flex-row items-center">
        <BotonIcono icono="atras" etiqueta="Volver al ingreso" disabled={cargando} onPress={volverIngreso} />
      </View>
    </View>
  );

  if (paso === 'enviado') {
    const resta = reenvio.resta;
    return (
      <Pantalla
        cabecera={cabecera}
        accion={
          <View className="gap-1">
            <Boton titulo="Abrir correo" alto ancho onPress={() => abrirCorreo(aviso.mostrar)} />
            <Boton
              titulo={resta > 0 ? `Reenviar en ${formatoReloj(resta)}` : 'Reenviar enlace'}
              variante="secundario"
              ancho
              disabled={resta > 0}
              cargando={cargando ? 'Reenviando…' : false}
              onPress={() => pedir(true)}
            />
          </View>
        }
      >
        <Ceja acento className="mt-2">
          Enlace enviado
        </Ceja>
        <Titulo className="mt-1">Revisa tu correo</Titulo>
        <Text className="mt-2 font-sans-medium text-[15px] leading-[21px] text-texto-2">
          Si <Text className="font-sans-semibold text-texto">{limpiarCorreo(correo)}</Text> tiene una cuenta en GymTrack, le llegó un enlace
          para crear una contraseña nueva.
        </Text>
        <Tarjeta className="mt-6 flex-row items-end justify-between gap-4">
          <View>
            <Ceja>El enlace vence a las</Ceja>
            <Text className="mt-1 font-mono-bold text-[32px] leading-[34px] text-texto" style={{ fontVariant: ['tabular-nums'] }}>
              {vence ? horaCorta(new Date(vence)) : '-'}
            </Text>
          </View>
          <Text className="text-right font-sans-medium text-[13px] leading-[18px] text-texto-2">{'Dura una hora\ny sirve una sola vez.'}</Text>
        </Tarjeta>
        <Separador titulo="¿No te llega?" />
        <Pista>Espera un par de minutos.</Pista>
        <Pista>Revisa las carpetas de spam y promociones.</Pista>
        <Pista>Revisa que el correo esté bien escrito.</Pista>
        <View className="-ml-3 mt-3 flex-row">
          <Boton titulo="Usar otro correo" variante="fantasma" onPress={otroCorreo} />
        </View>
      </Pantalla>
    );
  }

  if (paso === 'limite') {
    return (
      <Pantalla
        cabecera={cabecera}
        accion={
          <View className="gap-1">
            <Boton titulo="Abrir correo" alto ancho onPress={() => abrirCorreo(aviso.mostrar)} />
            <Boton titulo="Volver a ingresar" variante="fantasma" ancho onPress={volverIngreso} />
          </View>
        }
      >
        <View className="mt-2">
          <CejaAlerta>Límite de envíos</CejaAlerta>
        </View>
        <Titulo className="mt-1">Ya pediste {ENVIOS_POR_HORA} enlaces</Titulo>
        <Text className="mt-2 font-sans-medium text-[15px] leading-[21px] text-texto-2">
          Por seguridad, puedes pedir {ENVIOS_POR_HORA} por hora. Podrás pedir otro a las{' '}
          <Text className="font-mono-bold text-texto">{permitido ? horaCorta(new Date(permitido)) : '-'}</Text>.
        </Text>
        <Tarjeta className="mt-6">
          <Text className="font-sans-bold text-[16px] leading-[21px] text-texto">Mientras, revisa tu correo</Text>
          <Txt v="sec" className="mt-1">
            Puede que alguno ya te haya llegado a spam o promociones. Abre el más reciente.
          </Txt>
        </Tarjeta>
      </Pantalla>
    );
  }

  return (
    <Pantalla
      cabecera={cabecera}
      accion={<Boton titulo="Enviar enlace" alto ancho cargando={cargando ? 'Enviando…' : false} onPress={() => pedir(false)} />}
    >
      <Titulo className="mt-1">Recupera tu contraseña</Titulo>
      <Text className="mt-2 font-sans-medium text-[15px] leading-[21px] text-texto-2">
        Escribe el correo de tu cuenta. Te mandamos un enlace para crear una contraseña nueva.
      </Text>
      {mensaje ? <Mensaje mensaje={mensaje} /> : null}
      <View className="mt-4">
        <CampoTexto
          ref={correoRef}
          etiqueta="Correo"
          maxLength={LARGO_MAXIMO.correo}
          valor={correo}
          onCambiar={(v) => {
            setCorreo(v);
            setErr(null);
          }}
          error={err}
          editable={!cargando}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="send"
          onSubmitEditing={() => pedir(false)}
        />
      </View>
    </Pantalla>
  );
}
