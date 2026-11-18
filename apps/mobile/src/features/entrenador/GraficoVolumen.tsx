// ─────────────────────────────────────────────────────────────────────────────
// Gráfico de volumen por semana · Zona: Entrenador (app)
//
// Qué hace: las barras del volumen por semana de un cliente en su Ficha (ficha.html, «Progreso»),
// en toneladas, con la semana en curso punteada y la cifra de la última semana completa encima.
// Debajo de cada barra va el día en que empieza la semana y, cuando cambia, el mes.
// Tócalo cuando: cambie cómo se dibuja el gráfico de la Ficha.
// No lo toques para: los datos (GET /me/progress/volume, en api.ts).
// Depende de: react-native-svg, @/lib/tema (colores para el SVG) y @gymtrack/shared (fmtNum, MESES).
// ─────────────────────────────────────────────────────────────────────────────
import { fmtNum, MESES } from '@gymtrack/shared';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTema } from '@/lib/tema';
import type { Volumen } from './contrato';

const W = 346;
const H = 186;
const IZQ = 30;
const ARR = 28;
const ABA = 40;

export function GraficoVolumen({ semanas }: { semanas: Volumen['semanas'] }) {
  const { c } = useTema();
  if (!semanas.length) return null;
  const t = semanas.map((s) => s.volumen_kg / 1000);
  const max = Math.max(5, Math.ceil(Math.max(...t) / 5) * 5);
  const alto = H - ARR - ABA;
  const y = (v: number) => ARR + alto * (1 - v / max);
  const slot = (W - IZQ) / semanas.length;
  const bw = Math.min(22, slot - 6);
  const grilla = [0, max / 2, max];
  const completas = semanas.filter((s) => !s.en_curso);
  const ultima = completas.length ? semanas.indexOf(completas[completas.length - 1]!) : -1;
  const etiqueta = `Volumen por semana en toneladas: ${semanas.map((s, i) => `${fmtNum(t[i] ?? 0)}${s.en_curso ? ' en curso' : ''}`).join(', ')}.`;
  const fecha = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel={etiqueta} accessible>
      <SvgText x={0} y={10} fontSize={11} fill={c['texto-2']}>
        t
      </SvgText>
      {grilla.map((v) => (
        <Line key={`g${v}`} x1={IZQ} x2={W} y1={y(v)} y2={y(v)} stroke={c['sup-alta']} strokeWidth={v ? 1 : 1.5} />
      ))}
      {grilla.map((v) => (
        <SvgText key={`e${v}`} x={IZQ - 8} y={y(v) + 4} fontSize={11} fill={c['texto-2']} textAnchor="end">
          {fmtNum(v, 0)}
        </SvgText>
      ))}
      {semanas.map((s, i) => {
        const v = t[i] ?? 0;
        const x = IZQ + slot * i + (slot - bw) / 2;
        return (
          <Rect
            key={`b${s.semana_inicio}${i}`}
            x={x}
            y={y(v)}
            width={bw}
            height={Math.max(0, y(0) - y(v))}
            rx={1}
            fill={s.en_curso ? 'transparent' : c['hecho-fondo']}
            stroke={c['hecho-borde']}
            strokeWidth={s.en_curso ? 1.5 : 1}
            strokeDasharray={s.en_curso ? '3 3' : undefined}
          />
        );
      })}
      {semanas.map((s, i) => {
        const x = IZQ + slot * i + slot / 2;
        const d = fecha(s.semana_inicio);
        const previa = i > 0 ? fecha(semanas[i - 1]!.semana_inicio) : null;
        const mes = !previa || previa.getMonth() !== d.getMonth() ? (MESES[d.getMonth()] ?? '').slice(0, 3) : '';
        return [
          <SvgText key={`d${i}`} x={x} y={H - 22} fontSize={11} fill={c['texto-2']} textAnchor="middle">
            {Number.isNaN(d.getTime()) ? '' : String(d.getDate())}
          </SvgText>,
          mes ? (
            <SvgText key={`m${i}`} x={x} y={H - 6} fontSize={11} fill={c['texto-2']} textAnchor="middle">
              {mes}
            </SvgText>
          ) : null,
        ];
      })}
      {ultima >= 0 ? (
        <SvgText x={IZQ + slot * ultima + slot / 2} y={y(t[ultima] ?? 0) - 6} fontSize={12} fontWeight="700" fill={c.texto} textAnchor="middle">
          {fmtNum(t[ultima] ?? 0)}
        </SvgText>
      ) : null}
    </Svg>
  );
}
