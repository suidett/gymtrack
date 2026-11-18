// ─────────────────────────────────────────────────────────────────────────────
// Aviso flotante · Zona: Kit de interfaz
//
// Qué hace: el aviso de sistema.css (.aviso): una franja con el texto del tema invertido, 16 dp
// de los bordes y 100 dp sobre el fondo, que entra en 120 ms y se va sola a los 4 s. Puede
// llevar una acción («Deshacer»). Se pide desde cualquier pantalla con useAviso().mostrar(...).
// Tócalo cuando: cambie cuánto dura o cómo se ve el aviso.
// No lo toques para: errores de un campo (van bajo el campo, en CampoTexto).
// Depende de: react-native (Animated) y las clases del preset.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native';

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface AccionAviso {
  titulo: string;
  onPress: () => void;
}

interface EstadoAviso {
  id: number;
  texto: string;
  accion?: AccionAviso;
}

interface ValorAviso {
  /** Muestra un aviso. Uno nuevo reemplaza al que estaba. */
  mostrar(texto: string, opciones?: { accion?: AccionAviso; duracionMs?: number }): void;
  ocultar(): void;
}

const Contexto = createContext<ValorAviso>({ mostrar: () => {}, ocultar: () => {} });

// ── Proveedor ────────────────────────────────────────────────────────────────
/** Va una vez en la raíz (src/app/_layout.tsx), encima de la navegación. */
export function AvisoProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<EstadoAviso | null>(null);
  const [opacidad] = useState(() => new Animated.Value(0));
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contador = useRef(0);

  const ocultar = useCallback(() => {
    if (reloj.current) clearTimeout(reloj.current);
    Animated.timing(opacidad, { toValue: 0, duration: 120, easing: Easing.bezier(0, 0, 0.2, 1), useNativeDriver: true }).start(
      () => setAviso(null),
    );
  }, [opacidad]);

  const mostrar = useCallback<ValorAviso['mostrar']>(
    (texto, opciones) => {
      if (reloj.current) clearTimeout(reloj.current);
      contador.current += 1;
      setAviso({ id: contador.current, texto, accion: opciones?.accion });
      AccessibilityInfo.announceForAccessibility(texto);
      Animated.timing(opacidad, { toValue: 1, duration: 120, easing: Easing.bezier(0, 0, 0.2, 1), useNativeDriver: true }).start();
      reloj.current = setTimeout(ocultar, opciones?.duracionMs ?? 4000);
    },
    [opacidad, ocultar],
  );

  useEffect(() => {
    const r = reloj;
    return () => {
      if (r.current) clearTimeout(r.current);
    };
  }, []);

  const valor = useMemo(() => ({ mostrar, ocultar }), [mostrar, ocultar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {aviso ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 100,
            opacity: opacidad,
            transform: [{ translateY: opacidad.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          }}
        >
          <View accessibilityLiveRegion="polite" className="flex-row items-center gap-3 rounded-control bg-aviso-fondo px-4 py-3.5">
            <Text className="flex-1 font-sans-semibold text-[14px] leading-[19px] text-aviso-texto">{aviso.texto}</Text>
            {aviso.accion ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  aviso.accion?.onPress();
                  ocultar();
                }}
                hitSlop={12}
              >
                <Text className="font-sans-bold text-[14px] text-aviso-texto underline">{aviso.accion.titulo}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </Contexto.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/** `const aviso = useAviso(); aviso.mostrar('Serie 2 desmarcada.', { accion: { titulo: 'Deshacer', onPress } })`. */
export function useAviso(): ValorAviso {
  return useContext(Contexto);
}
