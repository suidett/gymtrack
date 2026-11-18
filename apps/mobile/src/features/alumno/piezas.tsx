// ─────────────────────────────────────────────────────────────────────────────
// Piezas de las pantallas del alumno · Zona: Alumno
//
// Qué hace: lo que se repite en Rutinas, Ejercicios, Progreso, Perfil y Motivos y todavía no está
// en el kit: el marco de una pestaña con su botón fijo abajo, la banda «Sin conexión», el
// esqueleto de carga, el error con Reintentar, la casilla de 32 dp, el avatar con iniciales, la
// fila de menú de 56 dp de las hojas, la fila de opción de radio, la etiqueta de 24 dp, los
// segmentos de semanas y el cuadro de cifra («34 sesiones»).
// Tócalo cuando: una de estas piezas cambie en todas las pantallas del alumno. Si alguna sirve a
// otras áreas, conviene pasarla al kit (components/ui).
// No lo toques para: una pieza de una sola pantalla (va en el archivo de la pantalla).
// Depende de: @/components/ui, react-native-safe-area-context y @/lib/tema.
// ─────────────────────────────────────────────────────────────────────────────
import { forwardRef, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAccion, Boton, BotonIcono, Icono, Txt } from '@/components/ui';
import { useTema } from '@/lib/tema';

// ── Marco de pestaña ─────────────────────────────────────────────────────────
/**
 * Pantalla dentro de las pestañas: título de 28 arriba, contenido con scroll y, si hay, el botón
 * fijo abajo pegado a la barra de pestañas (sin el margen de la barra de gestos, que ya pone ella).
 * `arriba` va fijo bajo el título (por ejemplo el buscador de Ejercicios).
 */
export function MarcoPestana({
  titulo,
  derecha,
  arriba,
  children,
  accion,
}: {
  titulo: string;
  derecha?: ReactNode;
  arriba?: ReactNode;
  children: ReactNode;
  accion?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      <View className="px-4">
        <View className="min-h-[56px] flex-row items-center justify-between pt-2">
          <Txt v="titulo" accessibilityRole="header">
            {titulo}
          </Txt>
          {derecha}
        </View>
        {arriba}
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {accion ? <BarraAccion enPestanas>{accion}</BarraAccion> : null}
    </View>
  );
}

// ── Avisos de estado ─────────────────────────────────────────────────────────
/** La banda de sin conexión: «Sin conexión.» en negrita y lo que queda disponible. */
export function BandaSinConexion({ texto }: { texto: string }) {
  return (
    <View accessibilityRole="alert" className="mb-4 flex-row items-start gap-2.5 rounded-control border border-sup-alta bg-sup px-3.5 py-3">
      <Icono nombre="sinDatos" tamano={20} />
      <Text className="flex-1 font-sans-medium text-[14px] leading-[20px] text-texto">
        <Text className="font-sans-bold">Sin conexión. </Text>
        {texto}
      </Text>
    </View>
  );
}

/** Bloques grises mientras carga. `filas` es cuántas tarjetas dibuja. */
export function Esqueleto({ filas = 3, etiqueta }: { filas?: number; etiqueta: string }) {
  const linea = (w: `${number}%` | number, h: number, mt = 0) => (
    <View className="rounded-[4px] bg-sup-alta" style={{ width: w, height: h, marginTop: mt }} />
  );
  return (
    <View accessibilityLabel={etiqueta} accessibilityState={{ busy: true }} className="gap-3">
      {Array.from({ length: filas }, (_, i) => (
        <View key={i} className="rounded-control border border-sup-alta bg-sup p-4">
          {linea('40%', 12)}
          {linea('70%', 20, 12)}
          {linea('55%', 12, 10)}
        </View>
      ))}
    </View>
  );
}

/** Cuando no hay nada guardado y la API falló. */
export function ErrorCarga({ texto = 'No pudimos cargar esto.', onReintentar }: { texto?: string; onReintentar: () => void }) {
  return (
    <View className="mt-6 items-start gap-3 rounded-control border border-sup-alta bg-sup p-4">
      <Txt v="h3">{texto}</Txt>
      <Txt v="sec">Revisa tu conexión e inténtalo de nuevo.</Txt>
      <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} />
    </View>
  );
}

// ── Piezas chicas ────────────────────────────────────────────────────────────
/** El botón de opciones de 48 dp: tres cuadros en vertical, como en las maquetas. */
export function BotonOpciones({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      className="h-12 w-12 items-center justify-center gap-[2.75px] rounded-control active:bg-fantasma-pres"
    >
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-[3.5px] w-[3.5px] rounded-[1px] bg-texto" />
      ))}
    </Pressable>
  );
}

/** La casilla de 32 dp: ámbar con el visto cuando está marcada; gris si está deshabilitada. */
export function Casilla({ marcada, apagada = false }: { marcada: boolean; apagada?: boolean }) {
  const { c } = useTema();
  const fondo = apagada ? 'border-sup-alta bg-sup-alta' : marcada ? 'border-hecho-borde bg-hecho-fondo' : 'border-marcar-borde bg-transparent';
  return (
    <View className={`h-8 w-8 items-center justify-center rounded-control border-2 ${fondo}`}>
      {marcada ? <Icono nombre="visto" tamano={20} color={apagada ? c['texto-2'] : c.visto} /> : null}
    </View>
  );
}

/** Cuadrado con iniciales: 40 dp (32 `chico`, 56 `grande`). */
export function Avatar({ texto, tamano = 'normal' }: { texto: string; tamano?: 'chico' | 'normal' | 'grande' }) {
  const lado = tamano === 'chico' ? 'h-8 w-8' : tamano === 'grande' ? 'h-14 w-14' : 'h-10 w-10';
  const letra = tamano === 'chico' ? 'text-[12px]' : tamano === 'grande' ? 'text-[18px]' : 'text-[14px]';
  return (
    <View className={`${lado} items-center justify-center rounded-control bg-sup-alta`} accessibilityElementsHidden importantForAccessibility="no">
      <Text className={`font-mono-bold ${letra} text-texto`}>{texto}</Text>
    </View>
  );
}

/** Etiqueta de 24 dp: normal (borde), `acento` (texto ámbar), `llena` (ámbar) o `peligro`. */
export function Marca({ texto, tono = 'normal' }: { texto: string; tono?: 'normal' | 'acento' | 'llena' | 'peligro' }) {
  const caja = {
    normal: 'border-borde bg-transparent',
    acento: 'border-hecho-borde bg-transparent',
    llena: 'border-hecho-borde bg-hecho-fondo',
    peligro: 'border-peligro bg-transparent',
  }[tono];
  const letra = { normal: 'text-texto-2', acento: 'text-acento-texto', llena: 'text-visto', peligro: 'text-peligro' }[tono];
  return (
    <View className={`h-6 justify-center self-start rounded-[4px] border px-2 ${caja}`}>
      <Text className={`font-sans-semibold text-[12px] ${letra}`}>{texto}</Text>
    </View>
  );
}

/** Fila de una hoja de opciones: 56 dp, título y una nota chica debajo. */
export function FilaMenu({
  titulo,
  nota,
  onPress,
  disabled = false,
  peligro = false,
}: {
  titulo: string;
  nota?: string;
  onPress: () => void;
  disabled?: boolean;
  peligro?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={nota ? `${titulo}. ${nota}` : titulo}
      accessibilityState={{ disabled }}
      className="min-h-[56px] justify-center gap-0.5 rounded-control px-4 py-2 active:bg-fantasma-pres"
    >
      <Text
        className={`font-sans-semibold text-[16px] ${disabled ? 'text-desh-texto' : peligro ? 'text-peligro' : 'text-texto'}`}
      >
        {titulo}
      </Text>
      {nota ? <Text className={`font-sans-medium text-[13px] leading-[18px] ${disabled ? 'text-desh-texto' : 'text-texto-2'}`}>{nota}</Text> : null}
    </Pressable>
  );
}

/** Fila elegible con casilla (varias) o como radio (una). Alto mínimo de 56 dp. */
export function FilaElegible({
  titulo,
  detalle,
  marcada,
  onPress,
  disabled = false,
  radio = false,
  izquierda,
  derecha,
}: {
  titulo: string;
  detalle?: string;
  marcada: boolean;
  onPress?: () => void;
  disabled?: boolean;
  radio?: boolean;
  izquierda?: ReactNode;
  derecha?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      accessibilityState={{ checked: marcada, disabled }}
      className="min-h-[56px] flex-row items-center gap-3 border-b border-sup-alta py-2 active:bg-fantasma-pres"
    >
      {izquierda}
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className={`font-sans-semibold text-[16px] ${disabled ? 'text-texto-2' : 'text-texto'}`}>{titulo}</Text>
          {derecha}
        </View>
        {detalle ? <Txt v="sec">{detalle}</Txt> : null}
      </View>
      <Casilla marcada={marcada} apagada={disabled} />
    </Pressable>
  );
}

/** Los segmentos de las semanas: hechas en ámbar, la actual en el color del texto. */
export function Semanas({ total, actual }: { total: number; actual: number }) {
  return (
    <View className="mt-4 flex-row gap-[3px]" accessibilityElementsHidden importantForAccessibility="no">
      {Array.from({ length: Math.max(1, total) }, (_, i) => (
        <View
          key={i}
          className={`h-2 flex-1 rounded-[1px] ${i < actual - 1 ? 'bg-hecho-fondo' : i === actual - 1 ? 'bg-texto' : 'bg-sup-alta'}`}
        />
      ))}
    </View>
  );
}

/** Cuadro con una cifra grande, su unidad chica y una leyenda («34 sesiones»). */
export function CuadroCifra({ valor, unidad, leyenda, extra }: { valor: string; unidad?: string; leyenda: string; extra?: ReactNode }) {
  return (
    <View className="flex-1 rounded-control border border-sup-alta bg-sup px-3 py-3" accessible accessibilityLabel={`${valor} ${unidad ?? ''} ${leyenda}`}>
      <Text className="font-mono-bold text-[22px] text-texto" style={{ fontVariant: ['tabular-nums'] }}>
        {valor}
        {unidad ? <Text className="font-mono-bold text-[13px] text-texto-2"> {unidad}</Text> : null}
      </Text>
      <Text className="mt-0.5 font-sans-medium text-[13px] leading-[17px] text-texto-2">
        {leyenda}
        {extra}
      </Text>
    </View>
  );
}

/** Texto con partes en cifra (mono), para «Semana 3 de 8 · 4 días por semana». */
export function ConCifras({ partes, className = '' }: { partes: (string | number)[]; className?: string }) {
  return (
    <Text className={`font-sans-medium text-[14px] leading-[20px] text-texto-2 ${className}`}>
      {partes.map((p, i) =>
        typeof p === 'number' ? (
          <Text key={i} className="font-mono-bold text-texto">
            {p}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
}

// ── Buscador ─────────────────────────────────────────────────────────────────
/** Campo de búsqueda de 56 dp con la lupa y el botón para borrar lo escrito. */
export const Buscador = forwardRef<
  TextInput,
  { valor: string; onCambiar: (v: string) => void; etiqueta?: string; onFocus?: () => void; onBlur?: () => void }
>(function Buscador({ valor, onCambiar, etiqueta = 'Buscar ejercicio', onFocus, onBlur }, ref) {
  const { c } = useTema();
  return (
    <View className="h-[56px] flex-row items-center rounded-control border-2 border-campo-borde bg-campo-fondo pl-3">
      <Icono nombre="buscar" tamano={22} color={c['texto-2']} />
      <TextInput
        ref={ref}
        value={valor}
        onChangeText={onCambiar}
        placeholder={etiqueta}
        accessibilityLabel={etiqueta}
        placeholderTextColor={c['desh-texto']}
        selectionColor={c['campo-edicion']}
        cursorColor={c['campo-edicion']}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onFocus={onFocus}
        onBlur={onBlur}
        className="h-full flex-1 px-2 font-sans-medium text-[16px] text-texto"
      />
      {valor ? <BotonIcono icono="cerrar" etiqueta="Borrar la búsqueda" onPress={() => onCambiar('')} /> : null}
    </View>
  );
});

/** Fila con un rótulo a la izquierda (y una ayuda chica) y un control a la derecha (el más y menos). */
export function FilaControl({ rotulo, ayuda, children }: { rotulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <View className="mt-3 flex-row items-center gap-3">
      <View className="flex-1">
        <Text className="font-sans-bold text-[15px] leading-[19px] text-texto">{rotulo}</Text>
        {ayuda ? <Text className="font-sans-medium text-[13px] leading-[17px] text-texto-2">{ayuda}</Text> : null}
      </View>
      <View className="w-[228px]">{children}</View>
    </View>
  );
}
