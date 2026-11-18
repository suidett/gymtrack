// ─────────────────────────────────────────────────────────────────────────────
// Piezas de las pantallas de acceso · Zona: Acceso
//
// Qué hace: las piezas que repiten Ingreso, Crear cuenta, Recuperar y la Encuesta y que el kit
// todavía no tiene (las «Piezas de acceso» de las maquetas): logotipo apilado, mensaje con
// barra a la izquierda, barra fina de cargando, selector de rol en dos segmentos, opción grande
// que se invierte al elegirla, opción con casilla, baldosa con cifra grande, regla visible de
// la contraseña, casilla de consentimiento, las seis cajas del código, el más y menos que deja
// escribir la cifra, la fila del resumen y la cuenta regresiva.
// Tócalo cuando: cambie cómo se ve una de estas piezas en las maquetas de acceso. Si otra área
// necesita una, conviene subirla a src/components/ui (pídelo al dueño del kit).
// No lo toques para: la lógica de cada pantalla (su archivo Pantalla*.tsx) ni los textos de
// validación (validacion.ts).
// Depende de: @/components/ui (Txt, Icono, Simbolo), @/lib/tema (colores de íconos y SVG),
// @/lib/vibrar, @gymtrack/tokens (tiempos de repetición) y ./errores (restaHasta).
// ─────────────────────────────────────────────────────────────────────────────
import { movimiento } from '@gymtrack/tokens';
import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, TextInput, View } from 'react-native';
import { Icono, Simbolo, Txt } from '@/components/ui';
import { useTema } from '@/lib/tema';
import { vibrarPresion, vibrarSeleccion } from '@/lib/vibrar';
import type { Tramo } from './encuesta';
import type { MensajePantalla } from './errores';
import { restaHasta } from './errores';

// ── Logotipo apilado ─────────────────────────────────────────────────────────
/** El símbolo arriba y «GymTrack» abajo, centrados (logotipo-apilado de la marca). */
export function LogoApilado() {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Ingresar a GymTrack"
      className="items-center pb-10 pt-16"
    >
      <Simbolo tamano={72} />
      <View className="mt-3 flex-row">
        <Text className="font-sans-semibold text-[34px] leading-[40px] text-texto">Gym</Text>
        <Text className="font-sans-semibold text-[34px] leading-[40px] text-texto" style={{ marginLeft: -3 }}>
          Track
        </Text>
      </View>
    </View>
  );
}

// ── Mensaje con barra ────────────────────────────────────────────────────────
/** Título corto y una línea de qué hacer, con la barra roja (o gris si es neutro) a la izquierda. */
export function Mensaje({ mensaje, className = '' }: { mensaje: MensajePantalla; className?: string }) {
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={`mt-4 overflow-hidden rounded-control border border-sup-alta bg-sup py-3 pl-[18px] pr-3.5 ${className}`}
    >
      <View className={`absolute bottom-0 left-0 top-0 w-1 ${mensaje.tono === 'neutro' ? 'bg-texto-2' : 'bg-peligro'}`} />
      <Text className="font-sans-bold text-[16px] leading-[21px] text-texto">{mensaje.titulo}</Text>
      <Txt v="sec" className="mt-0.5">
        {mensaje.texto}
      </Txt>
    </View>
  );
}

// ── Cargando ─────────────────────────────────────────────────────────────────
/**
 * Barra fina de 3 dp bajo la barra de estado, con un tramo ámbar que corre sin rebotes. Va en la
 * `cabecera` de Pantalla (de borde a borde) y siempre ocupa su alto, para que nada salte al
 * aparecer. Con movimiento reducido queda quieta.
 */
export function BarraCarga({ etiqueta, visible }: { etiqueta: string; visible: boolean }) {
  if (!visible) return <View className="-mx-4 h-[3px]" />;
  return <BarraCargaActiva etiqueta={etiqueta} />;
}

function BarraCargaActiva({ etiqueta }: { etiqueta: string }) {
  const [ancho, setAncho] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let animacion: Animated.CompositeAnimation | null = null;
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reducir) => {
        if (!vivo || reducir) return;
        animacion = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
        animacion.start();
      });
    return () => {
      vivo = false;
      animacion?.stop();
    };
  }, [x]);
  const tramo = ancho * 0.4;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      className="-mx-4 h-[3px] overflow-hidden bg-sup-alta"
    >
      <Animated.View
        className="absolute bottom-0 top-0 bg-accion"
        style={{ width: tramo, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-tramo, ancho] }) }] }}
      />
    </View>
  );
}

// ── Selector de rol (Ingreso) ────────────────────────────────────────────────
export function Segmento<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
  disabled = false,
}: {
  opciones: { id: T; nombre: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} className="mt-2 flex-row rounded-control border-2 border-borde p-[2px]">
      {opciones.map((o) => {
        const si = o.id === valor;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: si, disabled }}
            disabled={disabled}
            onPress={() => {
              vibrarSeleccion();
              onCambio(o.id);
            }}
            className={`h-12 flex-1 items-center justify-center rounded-control ${si ? 'bg-texto' : 'active:bg-fantasma-pres'}`}
          >
            <Text className={`font-sans-semibold text-[16px] ${si ? 'text-fondo' : 'text-texto'}`}>{o.nombre}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Opción grande de una sola respuesta ──────────────────────────────────────
/** 64 dp de alto; la elegida se invierte (fondo del texto, letra del fondo) y lleva el visto. */
export function OpcionGrande({
  titulo,
  detalle,
  activa,
  onPress,
  disabled = false,
}: {
  titulo: string;
  detalle?: string;
  activa: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTema();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      accessibilityState={{ checked: activa, disabled }}
      disabled={disabled}
      onPress={() => {
        vibrarSeleccion();
        onPress();
      }}
      className={`min-h-[64px] flex-row items-center gap-3 rounded-control border-2 py-2.5 pl-4 pr-3.5 ${
        activa ? 'border-texto bg-texto' : 'border-borde bg-sup active:bg-fantasma-pres'
      }`}
    >
      <View className="flex-1 gap-0.5">
        <Text className={`font-sans-semibold text-[17px] leading-[22px] ${activa ? 'text-fondo' : 'text-texto'}`}>{titulo}</Text>
        {detalle ? (
          <Text className={`font-sans-medium text-[14px] leading-[19px] ${activa ? 'text-fondo' : 'text-texto-2'}`}>{detalle}</Text>
        ) : null}
      </View>
      <View className="h-6 w-6 items-center justify-center">{activa ? <Icono nombre="visto" color={c.fondo} /> : null}</View>
    </Pressable>
  );
}

// ── Opción con casilla (varias respuestas) ───────────────────────────────────
/** 56 dp; la fila no se invierte: se marca la casilla de 32 en ámbar. */
export function OpcionCasilla({ titulo, activa, onPress }: { titulo: string; activa: boolean; onPress: () => void }) {
  const { c } = useTema();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={titulo}
      accessibilityState={{ checked: activa }}
      onPress={() => {
        vibrarSeleccion();
        onPress();
      }}
      className={`min-h-[56px] flex-1 flex-row items-center gap-3 rounded-control border-2 bg-sup py-2 pl-3.5 pr-3 ${
        activa ? 'border-hecho-borde' : 'border-borde active:bg-fantasma-pres'
      }`}
    >
      <Text className="flex-1 font-sans-semibold text-[16px] leading-[21px] text-texto">{titulo}</Text>
      <View
        className={`h-8 w-8 items-center justify-center rounded-control border-2 ${
          activa ? 'border-hecho-borde bg-hecho-fondo' : 'border-marcar-borde'
        }`}
      >
        {activa ? <Icono nombre="visto" tamano={20} color={c.visto} /> : null}
      </View>
    </Pressable>
  );
}

// ── Baldosa con cifra ────────────────────────────────────────────────────────
export function Baldosa({
  cifra,
  unidad,
  voz,
  activa,
  onPress,
}: {
  cifra: string;
  unidad: string;
  voz: string;
  activa: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={voz}
      accessibilityState={{ checked: activa }}
      onPress={() => {
        vibrarSeleccion();
        onPress();
      }}
      className={`h-24 flex-1 items-center justify-center gap-2 rounded-control border-2 ${
        activa ? 'border-texto bg-texto' : 'border-borde bg-sup active:bg-fantasma-pres'
      }`}
    >
      <Text className={`font-mono-bold text-[34px] leading-[38px] ${activa ? 'text-fondo' : 'text-texto'}`} style={{ fontVariant: ['tabular-nums'] }}>
        {cifra}
      </Text>
      <Text className={`font-sans-medium text-[14px] leading-[16px] ${activa ? 'text-fondo' : 'text-texto-2'}`}>{unidad}</Text>
    </Pressable>
  );
}

// ── Casilla chica (regla de la contraseña y consentimiento) ──────────────────
function CajaVisto({ marcada, error = false }: { marcada: boolean; error?: boolean }) {
  const { c } = useTema();
  return (
    <View
      className={`h-6 w-6 items-center justify-center rounded-[4px] border-2 ${
        marcada ? 'border-hecho-borde bg-hecho-fondo' : error ? 'border-peligro' : 'border-marcar-borde'
      }`}
    >
      {marcada ? <Icono nombre="visto" tamano={20} color={c.visto} /> : null}
    </View>
  );
}

/** La regla visible bajo la contraseña: se marca sola al llegar al mínimo. */
export function ReglaContrasena({
  texto,
  cumple,
  error,
  cuenta,
  cuentaVoz,
}: {
  texto: string;
  cumple: boolean;
  error: boolean;
  cuenta: string | null;
  cuentaVoz: string | null;
}) {
  const color = error ? 'font-sans-semibold text-peligro' : cumple ? 'font-sans-medium text-texto' : 'font-sans-medium text-texto-2';
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${texto}${cumple ? ', cumplida' : cuentaVoz ? `, llevas ${cuentaVoz}` : ''}`}
      className="mt-2 flex-row items-center gap-2"
    >
      <CajaVisto marcada={cumple} error={error} />
      <Text className={`flex-1 text-[14px] leading-[18px] ${color}`}>{texto}</Text>
      {cuenta ? <Text className="font-mono-medium text-[13px] text-texto-2">{cuenta}</Text> : null}
    </View>
  );
}

/** Casilla propia de consentimiento (Ley 21.719): 48 dp de toque, texto a la derecha. */
export function CasillaConsentimiento({
  marcada,
  onPress,
  texto,
  disabled = false,
}: {
  marcada: boolean;
  onPress: () => void;
  texto: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={texto}
      accessibilityState={{ checked: marcada, disabled }}
      disabled={disabled}
      onPress={() => {
        vibrarSeleccion();
        onPress();
      }}
      className="min-h-[48px] flex-row items-start gap-3 pb-1 pt-1"
    >
      <CajaVisto marcada={marcada} />
      <Text className="flex-1 font-sans-medium text-[14px] leading-[20px] text-texto">{texto}</Text>
    </Pressable>
  );
}

// ── Código de 6 caracteres ───────────────────────────────────────────────────
/**
 * Seis cajas de 44 × 56 dp, una por carácter. Encima va un TextInput transparente que recibe
 * el teclado: tocar cualquier caja lo enfoca.
 */
export const CampoCodigo = forwardRef<
  TextInput,
  { valor: string; onCambiar: (v: string) => void; estado: 'normal' | 'valido' | 'error'; onListo?: () => void }
>(function CampoCodigo({ valor, onCambiar, estado, onListo }, ref) {
  const [foco, setFoco] = useState(false);
  const actual = Math.min(valor.length, 5);
  const borde = estado === 'valido' ? 'border-hecho-borde' : estado === 'error' ? 'border-peligro' : 'border-campo-borde';
  return (
    <View className="relative flex-row gap-2 self-start">
      {Array.from({ length: 6 }, (_, i) => {
        const enFoco = foco && estado === 'normal' && i === actual && valor.length < 6;
        return (
          <View
            key={i}
            className={`h-14 w-11 items-center justify-center rounded-control border-2 bg-campo-fondo ${enFoco ? 'border-campo-edicion' : borde}`}
          >
            {valor[i] ? (
              <Text className="font-mono-bold text-[28px] leading-[32px] text-texto">{valor[i]}</Text>
            ) : enFoco ? (
              <View className="h-7 w-[2px] bg-texto" />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={valor}
        onChangeText={onCambiar}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        onSubmitEditing={onListo}
        accessibilityLabel="Código de entrenador, 6 caracteres"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        caretHidden
        maxLength={6}
        returnKeyType="done"
        className="absolute inset-0 text-[16px] text-transparent"
        style={{ opacity: 0.02 }}
      />
    </View>
  );
});

// ── Más y menos con cifra escribible ─────────────────────────────────────────
/**
 * Como el Paso del kit (56 dp, repite al mantener), pero la cifra del centro se puede tocar y
 * escribir. Con `escribible` en false el centro es solo texto (el mes).
 */
export function PasoEscribible({
  etiqueta,
  texto,
  unidad,
  onEscribir,
  onPasar,
  teclado = 'number-pad',
  largo = 3,
  escribible = true,
  limiteMin = false,
  limiteMax = false,
  error = false,
  textoCentro,
}: {
  etiqueta: string;
  texto: string;
  unidad?: string;
  onEscribir?: (t: string) => void;
  onPasar: (dir: 1 | -1) => void;
  teclado?: 'number-pad' | 'decimal-pad';
  largo?: number;
  escribible?: boolean;
  limiteMin?: boolean;
  limiteMax?: boolean;
  error?: boolean;
  /** Texto del centro cuando no es escribible (nombre del mes); va en Archivo 700 de 22. */
  textoCentro?: string;
}) {
  const { c } = useTema();
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pasos = useRef(0);
  const entrada = useRef<TextInput>(null);

  const detener = useCallback(() => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
    pasos.current = 0;
  }, []);
  useEffect(() => detener, [detener]);

  function empezar(dir: 1 | -1) {
    detener();
    vibrarSeleccion();
    onPasar(dir);
    const { inicio, paso, rapido, pasosAntesDeRapido } = movimiento.repeticion;
    const repetir = () => {
      pasos.current += 1;
      onPasar(dir);
      reloj.current = setTimeout(repetir, pasos.current >= pasosAntesDeRapido ? rapido : paso);
    };
    reloj.current = setTimeout(repetir, inicio);
  }

  return (
    <View className="h-14 flex-row gap-1" accessibilityLabel={etiqueta}>
      <BotonPaso etiqueta={`${etiqueta}: menos`} limite={limiteMin} onIn={() => empezar(-1)} onOut={detener}>
        <View className={`h-1 w-[18px] rounded-[1px] ${limiteMin ? 'bg-desh-texto' : 'bg-texto'}`} />
      </BotonPaso>
      <Pressable
        accessible={!escribible}
        accessibilityLabel={escribible ? undefined : `${etiqueta}: ${textoCentro ?? '-'}`}
        onPress={() => entrada.current?.focus()}
        className={`flex-1 flex-row items-center justify-center gap-1.5 overflow-hidden rounded-control border-2 bg-campo-fondo ${
          error ? 'border-peligro' : 'border-campo-borde'
        }`}
      >
        {escribible ? (
          <TextInput
            ref={entrada}
            value={texto}
            onChangeText={onEscribir}
            placeholder="-"
            placeholderTextColor={c['texto-2']}
            keyboardType={teclado}
            maxLength={largo}
            selectTextOnFocus
            accessibilityLabel={etiqueta}
            selectionColor={c['campo-edicion']}
            cursorColor={c['campo-edicion']}
            className="min-w-[24px] p-0 text-center font-mono-bold text-[30px] text-texto"
            style={{ fontVariant: ['tabular-nums'] }}
          />
        ) : (
          <Text className="font-sans-bold text-[22px] leading-[26px] text-texto">{textoCentro ?? '-'}</Text>
        )}
        {unidad ? <Text className="mt-2.5 font-sans-medium text-[13px] text-texto-2">{unidad}</Text> : null}
      </Pressable>
      <BotonPaso etiqueta={`${etiqueta}: más`} limite={limiteMax} onIn={() => empezar(1)} onOut={detener}>
        <Simbolo tamano={24} tramos={limiteMax ? c['desh-texto'] : c.texto} vertical={limiteMax ? c['desh-texto'] : undefined} />
      </BotonPaso>
    </View>
  );
}

function BotonPaso({
  etiqueta,
  limite,
  onIn,
  onOut,
  children,
}: {
  etiqueta: string;
  limite: boolean;
  onIn: () => void;
  onOut: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: limite }}
      onPressIn={onIn}
      onPressOut={onOut}
      className={`h-14 w-14 items-center justify-center rounded-control border-2 ${
        limite ? 'border-sup-alta bg-sec-fondo' : 'border-sec-borde bg-sec-fondo active:border-sec-pres-borde active:bg-sec-pres'
      }`}
    >
      {children}
    </Pressable>
  );
}

// ── Texto con cifras en mono ─────────────────────────────────────────────────
/** Pinta los tramos de una respuesta: las cifras en JetBrains Mono, el resto en Archivo. */
export function TextoConCifras({ tramos, className }: { tramos: Tramo[]; className: string }) {
  return (
    <Text className={className}>
      {tramos.map((t, i) =>
        t.cifra ? (
          <Text key={i} className="font-mono-bold text-[15px]" style={{ fontVariant: ['tabular-nums'] }}>
            {t.texto}
          </Text>
        ) : (
          <Text key={i}>{t.texto}</Text>
        ),
      )}
    </Text>
  );
}

// ── Fila del resumen ─────────────────────────────────────────────────────────
export function FilaResumen({
  ceja,
  tramos,
  onPress,
  ultimo = false,
  disabled = false,
}: {
  ceja: string;
  tramos: Tramo[];
  onPress: () => void;
  ultimo?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTema();
  const voz = `${ceja}: ${tramos.map((t) => t.texto).join('')}. Toca para cambiarla.`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={voz}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        vibrarPresion();
        onPress();
      }}
      className={`min-h-[60px] flex-row items-center gap-2 py-2 pr-1 active:bg-fantasma-pres ${ultimo ? '' : 'border-b border-sup-alta'}`}
    >
      <View className="flex-1">
        <Text className="font-sans-semibold text-[12px] leading-[16px] text-texto-2">{ceja}</Text>
        <TextoConCifras tramos={tramos} className="mt-0.5 font-sans-semibold text-[16px] leading-[21px] text-texto" />
      </View>
      <Icono nombre="adelante" color={c['texto-2']} />
    </Pressable>
  );
}

// ── Ceja en peligro ──────────────────────────────────────────────────────────
/** La ceja roja de «Límite de envíos» y «Enlace vencido». */
export function CejaAlerta({ children }: { children: ReactNode }) {
  return <Text className="font-sans-semibold text-[13px] leading-[17px] text-peligro">{children}</Text>;
}

// ── Cuenta regresiva ─────────────────────────────────────────────────────────
/**
 * Segundos que faltan, al segundo. `iniciar(s)` arranca desde s; al llegar a 0 se detiene sola.
 * La hora se lee en los callbacks, nunca en el render (regla del compilador de React).
 */
export function useCuentaRegresiva() {
  const [fin, setFin] = useState<number | null>(null);
  const [resta, setResta] = useState(0);
  useEffect(() => {
    if (fin == null) return;
    const id = setInterval(() => {
      const r = restaHasta(fin, Date.now());
      setResta(r);
      if (r === 0) setFin(null);
    }, 1000);
    return () => clearInterval(id);
  }, [fin]);
  const iniciar = useCallback((segundos: number) => {
    setFin(Date.now() + segundos * 1000);
    setResta(Math.max(0, Math.ceil(segundos)));
  }, []);
  const detener = useCallback(() => {
    setFin(null);
    setResta(0);
  }, []);
  return { resta, iniciar, detener };
}
