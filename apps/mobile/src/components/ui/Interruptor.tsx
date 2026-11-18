// ─────────────────────────────────────────────────────────────────────────────
// Interruptor · Zona: Kit de interfaz
//
// Qué hace: el interruptor de la marca (tokens.json, medida.rielInterruptor y color.riel*): riel
// de 52 × 32 con borde de 2 dp, perilla de 24 con radio 6, zona de toque de 48. Apagado: riel
// oscuro (o blanco en clara) y perilla gris a la izquierda. Encendido: riel ámbar y perilla
// grafito a la derecha. La perilla se mueve en 100 ms (salta si reducir movimiento está activo).
// Con `etiqueta` arma la fila completa: texto a la izquierda, interruptor a la derecha.
// Tócalo cuando: cambie cómo se ve o se anuncia un interruptor.
// No lo toques para: elegir entre más de dos opciones (usa Chips).
// Depende de: react-native (Animated), ../../lib/vibrar y ./Txt.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import { vibrarSeleccion } from '@/lib/vibrar';
import { Txt } from './Txt';

export function Interruptor({
  valor,
  onCambiar,
  etiqueta,
  detalle,
  disabled = false,
}: {
  valor: boolean;
  onCambiar: (v: boolean) => void;
  etiqueta?: string;
  detalle?: string;
  disabled?: boolean;
}) {
  // useState y no useRef: el valor animado se lee al pintar y el compilador de React no deja
  // leer refs durante el render.
  const [x] = useState(() => new Animated.Value(valor ? 1 : 0));

  useEffect(() => {
    let cancelado = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reducir) => {
        if (cancelado) return;
        Animated.timing(x, {
          toValue: valor ? 1 : 0,
          duration: reducir ? 0 : 100,
          easing: Easing.bezier(0, 0, 0.2, 1),
          useNativeDriver: true,
        }).start();
      });
    return () => {
      cancelado = true;
    };
  }, [valor, x]);

  const riel = (
    <View
      className={`h-8 w-[52px] justify-center rounded-control border-2 px-[2px] ${
        valor ? 'border-riel-encendido-borde bg-riel-encendido' : 'border-riel-apagado-borde bg-riel-apagado'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Animated.View style={{ transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }}>
        <View className={`h-6 w-6 rounded-perilla ${valor ? 'bg-perilla-encendida' : 'bg-perilla-apagada'}`} />
      </Animated.View>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityHint={detalle}
      accessibilityState={{ checked: valor, disabled }}
      disabled={disabled}
      onPress={() => {
        vibrarSeleccion();
        onCambiar(!valor);
      }}
      className={`min-h-12 flex-row items-center gap-3 ${etiqueta ? 'py-2' : ''}`}
    >
      {etiqueta ? (
        <View className="flex-1 gap-0.5">
          <Txt v="cuerpoMedio">{etiqueta}</Txt>
          {detalle ? <Txt v="sec">{detalle}</Txt> : null}
        </View>
      ) : null}
      {riel}
    </Pressable>
  );
}
