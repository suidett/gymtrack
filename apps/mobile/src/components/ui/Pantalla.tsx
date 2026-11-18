// ─────────────────────────────────────────────────────────────────────────────
// Marco de pantalla · Zona: Kit de interfaz
//
// Qué hace: el marco de cada pantalla (sistema.css, .tel-contenido y .tel-accion): fondo del
// tema hasta arriba, margen lateral de 16, scroll con aire abajo y, si hace falta, la barra de
// acción fija abajo (relleno 12/16, línea de 1 dp arriba) para el botón principal. Más la
// cabecera con el botón de volver de 48 dp, ceja, título y lo que vaya a la derecha, y el
// marcador «En construcción» que usan las rutas que todavía no se arman.
// Tócalo cuando: cambie el margen, el fondo o la cabecera de todas las pantallas.
// No lo toques para: el contenido de una pantalla.
// Depende de: expo-router (volver), ./Boton, ./Txt y react-native-safe-area-context.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonIcono } from './Boton';
import { Simbolo } from './Simbolo';
import { Ceja, Txt } from './Txt';

// ── Marco ────────────────────────────────────────────────────────────────────
/**
 * Pantalla completa. `scroll` (por defecto true) pone el contenido en un ScrollView; en false
 * va en un View de alto completo (para una FlatList propia). `sinPadding` quita el margen de 16.
 * `accion` es lo que va fijo abajo (por ejemplo <Boton alto ancho titulo="Guardar" />).
 * `sinBordeSuperior` es para pantallas dentro de las pestañas, donde el inset ya lo pone la barra.
 */
export function Pantalla({
  children,
  scroll = true,
  sinPadding = false,
  accion,
  cabecera,
}: {
  children: ReactNode;
  scroll?: boolean;
  sinPadding?: boolean;
  accion?: ReactNode;
  /** Lo que va fijo arriba, fuera del scroll (por ejemplo una <Cabecera>). */
  cabecera?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const padding = sinPadding ? '' : 'px-4';
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-fondo"
      style={{ paddingTop: insets.top }}
    >
      {cabecera ? <View className={padding}>{cabecera}</View> : null}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={`${padding} pb-6 pt-2`}
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${padding} pt-2`}>{children}</View>
      )}
      {accion ? <BarraAccion>{accion}</BarraAccion> : null}
    </KeyboardAvoidingView>
  );
}

// ── Barra de acción ──────────────────────────────────────────────────────────
/** La franja fija de abajo con el botón principal. Respeta la barra de gestos del teléfono. */
export function BarraAccion({ children, enPestanas = false }: { children: ReactNode; enPestanas?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="gap-2 border-t border-sup-alta bg-fondo px-4 pt-3"
      style={{ paddingBottom: 12 + (enPestanas ? 0 : insets.bottom) }}
    >
      {children}
    </View>
  );
}

// ── Cabecera ─────────────────────────────────────────────────────────────────
/**
 * Fila de título. `titulo`, `ceja` (arriba, chica), `subtitulo` (abajo, secundario), `atras`
 * (muestra Volver) y `derecha` (un BotonIcono o un Boton fantasma). `alVolver` reemplaza lo que
 * hace Volver (por ejemplo, pedir confirmación antes de salir).
 * Sin historial (se abrió directo en esta ruta) Volver lleva al inicio.
 */
export function Cabecera({
  titulo,
  subtitulo,
  ceja,
  atras = false,
  cerrar = false,
  alVolver,
  derecha,
}: {
  titulo?: string;
  subtitulo?: string;
  ceja?: string;
  atras?: boolean;
  /** Muestra una X en vez de la flecha (pantallas que se abren encima, como Nueva rutina). */
  cerrar?: boolean;
  alVolver?: () => void;
  derecha?: ReactNode;
}) {
  const volver = alVolver ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View className="mb-2 min-h-[56px] flex-row items-center gap-2">
      {atras || cerrar ? (
        <View className="-ml-3">
          <BotonIcono icono={cerrar ? 'cerrar' : 'atras'} etiqueta={cerrar ? 'Cerrar' : 'Volver'} onPress={volver} />
        </View>
      ) : null}
      <View className="flex-1">
        {ceja ? <Ceja>{ceja}</Ceja> : null}
        {titulo ? (
          <Txt v={atras || cerrar ? 'h3' : 'titulo'} accessibilityRole="header">
            {titulo}
          </Txt>
        ) : null}
        {subtitulo ? (
          <Txt v="sec" className="mt-0.5">
            {subtitulo}
          </Txt>
        ) : null}
      </View>
      {derecha}
    </View>
  );
}

// ── Marcador ─────────────────────────────────────────────────────────────────
/**
 * Lo que muestran las rutas que todavía no se construyen. `titulo` es el nombre de la pantalla
 * y `area` quién la arma. `atras` muestra Volver (para las de pantalla completa).
 */
export function EnConstruccion({ titulo, area, atras = false }: { titulo: string; area: string; atras?: boolean }) {
  return (
    <Pantalla cabecera={<Cabecera atras={atras} ceja={area} titulo={titulo} />}>
      <View className="mt-10 items-center gap-4">
        <Simbolo tamano={48} />
        <Txt v="h3">En construcción</Txt>
        <Txt v="sec" className="text-center">
          Esta pantalla todavía no está lista.
        </Txt>
      </View>
    </Pantalla>
  );
}
