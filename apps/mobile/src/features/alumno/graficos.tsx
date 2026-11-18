// ─────────────────────────────────────────────────────────────────────────────
// Gráficos del alumno · Zona: Alumno
//
// Qué hace: los tres gráficos de Progreso y Detalle de ejercicio, dibujados con SVG como en las
// maquetas: barras de volumen por semana (ámbar con borde; la semana en curso punteada), línea de
// peso o de 1RM estimado (ámbar oscuro en clara, puntos con el último relleno) y la línea chica de
// tendencia de cada medida. La grilla es gris y las cifras van en JetBrains Mono de 11.
// Tócalo cuando: cambie cómo se ve un gráfico.
// No lo toques para: qué datos muestra (los arma la pantalla).
// Depende de: react-native-svg, @gymtrack/tokens (fuentes) y @/lib/tema (colores del tema activo).
// ─────────────────────────────────────────────────────────────────────────────
import { fonts } from '@gymtrack/tokens';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTema } from '@/lib/tema';

const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fecha = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);
const coma1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

// ── Barras de volumen ────────────────────────────────────────────────────────
export function BarrasVolumen({
  semanas,
  seleccion,
  etiqueta,
}: {
  semanas: { desde: string; toneladas: number; enCurso: boolean }[];
  seleccion: number;
  etiqueta: string;
}) {
  const { c } = useTema();
  const W = 380;
  const H = 184;
  const gx = 32;
  const top = 20;
  const bottom = 40;
  const plotH = H - top - bottom;
  const tope = Math.max(10, Math.ceil(Math.max(...semanas.map((s) => s.toneladas), 0) / 10) * 10 + 2);
  const slot = (W - gx) / Math.max(1, semanas.length);
  const bw = Math.min(26, slot - 8);
  const y = (t: number) => top + plotH - (t / tope) * plotH;
  const marcas = [0, Math.round(tope / 20) * 10 || 5, Math.round(tope / 10) * 10].filter((v, i, a) => a.indexOf(v) === i && v <= tope);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={etiqueta} className="mt-4">
      <Svg width="100%" height={undefined} viewBox={`0 0 ${W} ${H}`} style={{ aspectRatio: W / H }}>
        {marcas.map((v) => (
          <Line key={`g${v}`} x1={gx} x2={W} y1={y(v)} y2={y(v)} stroke={v ? c['sup-alta'] : c.borde} strokeWidth={1} />
        ))}
        {marcas
          .filter((v) => v > 0)
          .map((v) => (
            <SvgText key={`t${v}`} x={0} y={y(v) + 4} fontSize={11} fontFamily={fonts.mono.medium} fill={c['texto-2']}>
              {`${v} t`}
            </SvgText>
          ))}
        {semanas.map((s, i) => {
          const x = gx + i * slot + (slot - bw) / 2;
          const d = fecha(s.desde);
          const nuevoMes = i === 0 || fecha(semanas[i - 1]?.desde ?? s.desde).getMonth() !== d.getMonth();
          return (
            <G key={s.desde}>
              <Rect
                x={x}
                y={y(s.toneladas)}
                width={bw}
                height={Math.max(0, (s.toneladas / tope) * plotH)}
                rx={2}
                fill={s.enCurso ? c['fila-hecha'] : c['hecho-fondo']}
                stroke={c['hecho-borde']}
                strokeWidth={1.5}
                strokeDasharray={s.enCurso ? '4 3' : undefined}
              />
              <SvgText
                x={x + bw / 2}
                y={y(s.toneladas) - 6}
                textAnchor="middle"
                fontSize={11}
                fontFamily={i === seleccion ? fonts.mono.bold : fonts.mono.medium}
                fill={i === seleccion ? c.texto : c['texto-2']}
              >
                {coma1(s.toneladas)}
              </SvgText>
              <SvgText x={x + bw / 2} y={H - 22} textAnchor="middle" fontSize={11} fontFamily={fonts.mono.medium} fill={c['texto-2']}>
                {String(d.getDate())}
              </SvgText>
              {nuevoMes ? (
                <SvgText x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={11} fontFamily={fonts.mono.medium} fill={c['texto-2']}>
                  {MES3[d.getMonth()]}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Línea en el tiempo ───────────────────────────────────────────────────────
/**
 * Línea de valores por fecha (peso corporal o 1RM estimado). `seleccion` marca un punto (el
 * último por defecto) y `onElegir` hace el gráfico tocable: elige el punto más cercano al toque.
 */
export function LineaTiempo({
  puntos,
  seleccion,
  onElegir,
  etiqueta,
}: {
  puntos: { fecha: string; valor: number }[];
  seleccion?: number;
  onElegir?: (i: number) => void;
  etiqueta: string;
}) {
  const { c } = useTema();
  const [ancho, setAncho] = useState(0);
  const W = 380;
  const H = 184;
  const gx = 32;
  const top = 12;
  const bottom = 28;
  const pad = 10;
  const plotH = H - top - bottom;
  if (puntos.length < 2) return null;
  const vals = puntos.map((p) => p.valor);
  const rango = Math.max(...vals) - Math.min(...vals);
  const paso = rango > 40 ? 10 : rango > 12 ? 5 : 1;
  const lo = Math.floor((Math.min(...vals) - paso * 0.2) / paso) * paso;
  const hi = Math.ceil((Math.max(...vals) + paso * 0.2) / paso) * paso;
  const t0 = fecha(puntos[0]?.fecha ?? '').getTime();
  const span = Math.max(1, fecha(puntos[puntos.length - 1]?.fecha ?? '').getTime() - t0);
  const x = (iso: string) => gx + pad + ((fecha(iso).getTime() - t0) / span) * (W - gx - 2 * pad);
  const y = (v: number) => top + plotH - ((v - lo) / Math.max(1e-6, hi - lo)) * plotH;
  const sel = seleccion ?? puntos.length - 1;
  const marcas: number[] = [];
  for (let v = lo; v <= hi && marcas.length < 8; v += paso) marcas.push(v);
  const primerosDelMes = puntos.filter((p, i) => i === 0 || fecha(puntos[i - 1]?.fecha ?? '').getMonth() !== fecha(p.fecha).getMonth());
  const dibujo = (
    <Svg width="100%" height={undefined} viewBox={`0 0 ${W} ${H}`} style={{ aspectRatio: W / H }}>
      {marcas.map((v) => (
        <Line key={`g${v}`} x1={gx} x2={W} y1={y(v)} y2={y(v)} stroke={v === lo ? c.borde : c['sup-alta']} strokeWidth={1} />
      ))}
      {marcas.map((v) => (
        <SvgText key={`t${v}`} x={0} y={y(v) + 4} fontSize={11} fontFamily={fonts.mono.medium} fill={c['texto-2']}>
          {String(v)}
        </SvgText>
      ))}
      {primerosDelMes.map((p) => (
        <SvgText key={`m${p.fecha}`} x={x(p.fecha)} y={H - 6} textAnchor="middle" fontSize={11} fontFamily={fonts.mono.medium} fill={c['texto-2']}>
          {MES3[fecha(p.fecha).getMonth()]}
        </SvgText>
      ))}
      {onElegir ? (
        <Line x1={x(puntos[sel]?.fecha ?? '')} x2={x(puntos[sel]?.fecha ?? '')} y1={top - 6} y2={top + plotH} stroke={c.borde} strokeWidth={1} />
      ) : null}
      <Path
        d={puntos.map((p, i) => `${i ? 'L' : 'M'}${x(p.fecha).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ')}
        fill="none"
        stroke={c['acento-texto']}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {puntos.map((p, i) => (
        <Circle
          key={`p${i}`}
          cx={x(p.fecha)}
          cy={y(p.valor)}
          r={i === sel ? 6 : 3.5}
          fill={i === sel ? c['hecho-fondo'] : c.fondo}
          stroke={i === sel ? c['hecho-borde'] : c['acento-texto']}
          strokeWidth={i === sel ? 2.5 : 2}
        />
      ))}
    </Svg>
  );
  return (
    <View
      className="mt-4"
      accessible={!onElegir}
      accessibilityRole={onElegir ? undefined : 'image'}
      accessibilityLabel={onElegir ? undefined : etiqueta}
      onLayout={(ev) => setAncho(ev.nativeEvent.layout.width)}
    >
      {onElegir ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}. Toca para ver cada sesión.`}
          onPress={(ev) => {
            // El toque llega en dp del ancho real; el gráfico se dibuja en las unidades del viewBox.
            const xv = ev.nativeEvent.locationX * (ancho ? W / ancho : 1);
            let mejor = 0;
            let dist = Infinity;
            puntos.forEach((p, i) => {
              const d = Math.abs(x(p.fecha) - xv);
              if (d < dist) {
                dist = d;
                mejor = i;
              }
            });
            onElegir(mejor);
          }}
        >
          {dibujo}
        </Pressable>
      ) : (
        dibujo
      )}
    </View>
  );
}

// ── Línea chica de tendencia ─────────────────────────────────────────────────
export function Chispa({ serie }: { serie: number[] }) {
  const { c } = useTema();
  const W = 56;
  const H = 24;
  const p = 4;
  if (serie.length < 2) return null;
  const lo = Math.min(...serie);
  const hi = Math.max(...serie);
  const x = (i: number) => p + (i / (serie.length - 1)) * (W - 2 * p);
  const y = (v: number) => (hi === lo ? H / 2 : H - p - ((v - lo) / (hi - lo)) * (H - 2 * p));
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} accessibilityElementsHidden importantForAccessibility="no">
      <Path d={serie.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={c['acento-texto']} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={x(serie.length - 1)} cy={y(serie[serie.length - 1] ?? 0)} r={3} fill={c['acento-texto']} />
    </Svg>
  );
}
