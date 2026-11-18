// ─────────────────────────────────────────────────────────────────────────────
// Más y menos · Zona: Kit de interfaz
//
// Qué hace: el control estrella de la marca (sistema.css, .paso): tres piezas separadas 4 dp,
// botón de menos de 56 dp, la cifra grande al medio (JetBrains Mono 700, 30) con su unidad, y
// el botón de más de 56 dp con el símbolo. Mantener presionado repite: primero a los 400 ms,
// después cada 100 ms y, pasados 10 pasos, cada 50 ms (tokens.json, movimiento.repeticion).
// Al tocar vibra de selección; al chocar con el mínimo o el máximo vibra de aviso y no cambia.
// Tócalo cuando: cambie cómo se suma o se resta en toda la app (kilos, repeticiones, RIR).
// No lo toques para: formatear el número (pásale `formato`, por ejemplo fmtKg de shared).
// Depende de: ./Simbolo, ./Txt y ../../lib/vibrar.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { movimiento } from '@gymtrack/tokens';
import { useTema } from '@/lib/tema';
import { vibrarLimite, vibrarSeleccion } from '@/lib/vibrar';
import { Simbolo } from './Simbolo';

// ── Formato por defecto ──────────────────────────────────────────────────────
/** Enteros sin decimal («85»), el decimal solo si existe y con coma («82,5»). */
export function formatoCifra(n: number): string {
  const redondo = Math.round(n * 100) / 100;
  return Number.isInteger(redondo) ? String(redondo) : String(redondo).replace('.', ',');
}

export interface PropsPaso {
  valor: number;
  onCambiar: (v: number) => void;
  /** Cuánto suma o resta cada toque (2,5 kg, 1 repetición). */
  paso?: number;
  min?: number;
  max?: number;
  /** «kg», «reps», «RIR». */
  unidad?: string;
  formato?: (n: number) => string;
  /** Qué se está cambiando, para el lector de pantalla («Kilos»). */
  etiqueta: string;
}

// ── Componente ───────────────────────────────────────────────────────────────
export function Paso({ valor, onCambiar, paso = 1, min = 0, max = 9999, unidad, formato = formatoCifra, etiqueta }: PropsPaso) {
  const { c } = useTema();
  // El valor más reciente vive en una ref para que la repetición no use uno viejo. Se actualiza
  // en un efecto, nunca durante el render.
  const actual = useRef(valor);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pasos = useRef(0);

  useEffect(() => {
    actual.current = valor;
  }, [valor]);

  useEffect(() => {
    const r = reloj;
    return () => {
      if (r.current) clearTimeout(r.current);
    };
  }, []);

  function detener() {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
    pasos.current = 0;
  }

  /** Aplica un paso. Devuelve false si chocó con el límite. */
  function aplicar(signo: 1 | -1): boolean {
    const siguiente = Math.round((actual.current + signo * paso) * 1000) / 1000;
    if (siguiente < min || siguiente > max) {
      vibrarLimite();
      return false;
    }
    actual.current = siguiente;
    vibrarSeleccion();
    onCambiar(siguiente);
    return true;
  }

  function empezar(signo: 1 | -1) {
    detener();
    if (!aplicar(signo)) return;
    const { inicio, paso: cada, rapido, pasosAntesDeRapido } = movimiento.repeticion;
    const repetir = () => {
      pasos.current += 1;
      if (!aplicar(signo)) return detener();
      reloj.current = setTimeout(repetir, pasos.current >= pasosAntesDeRapido ? rapido : cada);
    };
    reloj.current = setTimeout(repetir, inicio);
  }

  const enMin = valor - paso < min;
  const enMax = valor + paso > max;
  const texto = formato(valor);

  return (
    <View className="h-[56px] flex-row gap-1">
      <BotonPaso etiqueta={`Restar ${formato(paso)} a ${etiqueta}`} limite={enMin} onIn={() => empezar(-1)} onOut={detener}>
        <View className={`h-1 w-[18px] rounded-[1px] ${enMin ? 'bg-desh-texto' : 'bg-texto'}`} />
      </BotonPaso>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={etiqueta}
        accessibilityValue={{ text: `${texto}${unidad ? ` ${unidad}` : ''}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => aplicar(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        className="min-w-[120px] flex-1 flex-row items-center justify-center gap-1.5 overflow-hidden rounded-control border-2 border-campo-borde bg-campo-fondo"
      >
        <Text className="font-mono-bold text-[30px] leading-[34px] text-texto" style={{ fontVariant: ['tabular-nums'] }}>
          {texto}
        </Text>
        {unidad ? <Text className="mt-2.5 font-sans-medium text-[13px] text-texto-2">{unidad}</Text> : null}
      </View>
      <BotonPaso etiqueta={`Sumar ${formato(paso)} a ${etiqueta}`} limite={enMax} onIn={() => empezar(1)} onOut={detener}>
        <Simbolo tamano={24} tramos={enMax ? c['desh-texto'] : c.texto} vertical={enMax ? c['desh-texto'] : undefined} />
      </BotonPaso>
    </View>
  );
}

// ── Pieza de más o menos ─────────────────────────────────────────────────────
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
      className={`h-[56px] w-[56px] items-center justify-center rounded-control border-2 ${
        limite ? 'border-sup-alta bg-sec-fondo' : 'border-sec-borde bg-sec-fondo active:border-sec-pres-borde active:bg-sec-pres'
      }`}
    >
      {children}
    </Pressable>
  );
}
