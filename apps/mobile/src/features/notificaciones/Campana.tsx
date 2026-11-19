// ─────────────────────────────────────────────────────────────────────────────
// Campana · Zona: Notificaciones (app)
//
// Qué hace: el botón de la campana de la barra de arriba de Hoy (alumno) y de Clientes
// (entrenador): 48 × 48 dp (más que los 44 mínimos), el ícono de trazo de la marca y, si hay
// notificaciones sin leer, la insignia con el número («9+» desde 10) como la de la pestaña
// Alertas. Al tocarla abre la pantalla Notificaciones. Mientras está a la vista mantiene la lista
// al día (cada 15 s con la app al frente y al volver a la pantalla).
// Tócalo cuando: cambie cómo se ve la campana o a dónde lleva.
// No lo toques para: el contador en sí (./almacen.ts) ni cada cuánto se consulta (./sondeo.ts).
// Depende de: expo-router, react-native-svg, @/lib/sesion, @/lib/tema, @/lib/vibrar, ./instancia y ./logica.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { vibrarPresion } from '@/lib/vibrar';
import { useNotificaciones, useNotificacionesEnVivo } from './instancia';
import { etiquetaCampana, textoContador } from './logica';

/** La campana en la grilla de 24 de los íconos (Icono.tsx): cuerpo, base y badajo. */
const TRAZO_CAMPANA = 'M18 16.5V11a6 6 0 0 0-12 0v5.5L4 18.5h16zM10 21.5h4';

/** El ícono solo, con el trazo de 2,5 y puntas cuadradas de los demás íconos. */
export function IconoCampana({ tamano = 24, color }: { tamano?: number; color?: string }) {
  const { c } = useTema();
  return (
    // aria-hidden en el View: el Svg pasaría los props de accesibilidad de React Native al DOM en la web.
    <View aria-hidden>
      <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
        <Path d={TRAZO_CAMPANA} stroke={color ?? c.texto} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
      </Svg>
    </View>
  );
}

/** El botón de la barra de arriba. Va pegado al borde derecho (el -mr-3 alinea el ícono con el contenido). */
export function Campana() {
  const { usuario } = useSesion();
  useNotificacionesEnVivo(usuario?.id);
  const sinLeer = useNotificaciones((s) => s.sinLeer);
  const insignia = textoContador(sinLeer);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaCampana(sinLeer)}
      accessibilityHint="Abre tus notificaciones"
      onPressIn={() => vibrarPresion()}
      onPress={() => router.push('/notificaciones')}
      className="-mr-3 h-12 w-12 items-center justify-center rounded-control active:bg-fantasma-pres"
    >
      <IconoCampana />
      {insignia ? (
        <View
          className="absolute right-1 top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-fondo bg-accion px-1"
          aria-hidden
        >
          <Text className="font-mono-bold text-[11px] leading-[13px] text-accion-texto">{insignia}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
