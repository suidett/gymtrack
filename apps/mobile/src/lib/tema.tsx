// ─────────────────────────────────────────────────────────────────────────────
// Tema activo · Zona: Diseño
//
// Qué hace: elige entre modo gimnasio (oscuro, el principal) y clara, recuerda la elección en el
// teléfono y la aplica a toda la app llenando las variables CSS (--fondo, --texto...) que leen
// las clases bg-fondo, text-texto-2, etc. También da los hexadecimales del tema activo para lo
// que no acepta className (íconos SVG, la barra de estado, el fondo de la pila de navegación).
// Tócalo cuando: cambie dónde se guarda la preferencia o haga falta saber el tema en otro lugar.
// No lo toques para: cambiar un color (packages/tokens/index.js).
// Depende de: @gymtrack/tokens (temas, variablesTema), nativewind (vars) y AsyncStorage (la
// preferencia de tema no es secreta).
// ─────────────────────────────────────────────────────────────────────────────
import { temas, variablesTema, type NombreTema, type Tema } from '@gymtrack/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vars } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

// ── Variables por tema ───────────────────────────────────────────────────────
// Se calculan una sola vez al cargar el módulo.
const VARIABLES = {
  gimnasio: vars(variablesTema('gimnasio')),
  clara: vars(variablesTema('clara')),
} as const;

const CLAVE = 'gymtrack.tema';

interface ValorTema {
  /** 'gimnasio' u 'clara'. */
  modo: NombreTema;
  /** Hexadecimales del tema activo: c.fondo, c.texto, c['texto-2']... */
  c: Tema;
  cambiarModo(m: NombreTema): void;
}

const Contexto = createContext<ValorTema>({ modo: 'gimnasio', c: temas.gimnasio, cambiarModo: () => {} });

// ── Proveedor ────────────────────────────────────────────────────────────────
/** Envuelve la app. Todo lo que está adentro ve el tema elegido. */
export function TemaProvider({ children, inicial = 'gimnasio' }: { children: ReactNode; inicial?: NombreTema }) {
  const [modo, setModo] = useState<NombreTema>(inicial);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((v) => {
        if (v === 'gimnasio' || v === 'clara') setModo(v);
      })
      .catch(() => {});
  }, []);

  const cambiarModo = useCallback((m: NombreTema) => {
    setModo(m);
    AsyncStorage.setItem(CLAVE, m).catch(() => {});
  }, []);

  const valor = useMemo(() => ({ modo, c: temas[modo], cambiarModo }), [modo, cambiarModo]);

  return (
    <Contexto.Provider value={valor}>
      <View style={[{ flex: 1, backgroundColor: temas[modo].fondo }, VARIABLES[modo]]}>{children}</View>
    </Contexto.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/** El tema activo y cómo cambiarlo (Perfil y ajustes, «Modo gimnasio»). */
export function useTema(): ValorTema {
  return useContext(Contexto);
}
