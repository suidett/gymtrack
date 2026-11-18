// ─────────────────────────────────────────────────────────────────────────────
// Símbolo y logotipo de la marca · Zona: Kit de interfaz
//
// Qué hace: dibuja el símbolo «Más» (un menos al que se le suma un trazo vertical ámbar) en SVG,
// con las medidas de docs/marca/v2/mas/notas.md: grilla de 24, versión ajustada a píxel para 16
// y la regla de color (dos tonos sobre oscuro; un color grafito sobre claro bajo 48 dp). También
// el logotipo horizontal: símbolo más «GymTrack» en Archivo 600.
// Tócalo cuando: cambie el dibujo o la regla de color del símbolo.
// No lo toques para: el ícono de la app (apps/mobile/assets y app.json).
// Depende de: react-native-svg, @gymtrack/tokens (marca) y ../../lib/tema.
// ─────────────────────────────────────────────────────────────────────────────
import { marca } from '@gymtrack/tokens';
import { Text, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import { useTema } from '@/lib/tema';

// ── Símbolo ──────────────────────────────────────────────────────────────────
/**
 * El símbolo. `tamano` en dp (por defecto 24). `vertical` y `tramos` fuerzan colores (lo usa el
 * botón de más, que pinta los tramos con el texto del tema). Sin ellos sigue la regla de la marca.
 */
export function Simbolo({ tamano = 24, vertical, tramos }: { tamano?: number; vertical?: string; tramos?: string }) {
  const { c, modo } = useTema();
  // Sobre claro, desde 48 dp va en dos tonos; bajo 48, en un color (tokens: simb-v y simb-h).
  const dosTonosClaro = modo === 'clara' && tamano >= 48;
  const colorV = vertical ?? (dosTonosClaro ? marca.ambar : c['simb-v']);
  const colorH = tramos ?? c['simb-h'];

  if (tamano <= 16) {
    // Versión ajustada a píxel (logo/simbolo-16-sobre-oscuro.svg): sin radio, cortes de 1 px.
    return (
      <Svg width={tamano} height={tamano} viewBox="0 0 16 16" accessibilityElementsHidden importantForAccessibility="no">
        <G shapeRendering="crispEdges">
          <Rect x={1} y={6} width={4} height={3} fill={colorH} />
          <Rect x={10} y={6} width={4} height={3} fill={colorH} />
          <Rect x={6} y={1} width={3} height={13} fill={colorV} />
        </G>
      </Svg>
    );
  }
  const { vertical: v, tramoIzquierdo: ti, tramoDerecho: td, radio } = marca.simbolo;
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Rect x={ti[0]} y={ti[1]} width={ti[2]} height={ti[3]} rx={radio} fill={colorH} />
      <Rect x={td[0]} y={td[1]} width={td[2]} height={td[3]} rx={radio} fill={colorH} />
      <Rect x={v[0]} y={v[1]} width={v[2]} height={v[3]} rx={radio} fill={colorV} />
    </Svg>
  );
}

// ── Logotipo ─────────────────────────────────────────────────────────────────
/**
 * Logotipo horizontal: símbolo y «GymTrack». `alto` es el alto del símbolo en dp (mínimo 16).
 * El par «m T» va cerrado 0,1 em, como pide la marca, para que se lea una sola palabra.
 */
export function Logotipo({ alto = 24 }: { alto?: number }) {
  // El símbolo mide la G más un 15 %: la letra queda en alto / 1,15.
  const letra = Math.round(alto / 1.15 / 0.72);
  return (
    <View className="flex-row items-center" accessible accessibilityRole="image" accessibilityLabel="GymTrack">
      <Simbolo tamano={alto} />
      <View className="flex-row" style={{ marginLeft: alto / 2 }}>
        <Text className="font-sans-semibold text-texto" style={{ fontSize: letra }}>
          Gym
        </Text>
        <Text className="font-sans-semibold text-texto" style={{ fontSize: letra, marginLeft: -letra * 0.1 }}>
          Track
        </Text>
      </View>
    </View>
  );
}
