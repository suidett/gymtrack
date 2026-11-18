// ─────────────────────────────────────────────────────────────────────────────
// Íconos de trazo · Zona: Kit de interfaz
//
// Qué hace: los íconos de línea de las maquetas (docs/pantallas), en una grilla de 24 con trazo
// de 2,5 y puntas cuadradas, como .btn-icono en sistema.css. Toman el color que les pases o el
// texto del tema activo.
// Tócalo cuando: una pantalla necesite un ícono que no está. Copia el `d` de la maqueta.
// No lo toques para: el símbolo de la marca (Simbolo.tsx).
// Depende de: react-native-svg y ../../lib/tema (color por defecto).
// ─────────────────────────────────────────────────────────────────────────────
import Svg, { Path } from 'react-native-svg';
import { useTema } from '@/lib/tema';

// ── Trazos ───────────────────────────────────────────────────────────────────
export const ICONOS = {
  atras: 'M20 12H5M11 5l-7 7 7 7',
  adelante: 'M9 5l7 7-7 7',
  izquierda: 'M15 5l-7 7 7 7',
  cerrar: 'M6 6l12 12M18 6L6 18',
  abajo: 'M6 9l6 6 6-6',
  arriba: 'M5 15l7-7 7 7',
  visto: 'M5 12.5l4.5 4.5 9.5-10',
  buscar: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5L20 20',
  borrar: 'M8 6h12v12H8l-5-6zM11 9.5l5 5M16 9.5l-5 5',
  subir: 'M12 4l7 8h-4v7H9v-7H5z',
  reproducir: 'M8 5v14l11-7z',
  pausa: 'M7 5h4v14H7zM13 5h4v14h-4z',
  candado: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  expandir: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  tendencia: 'M3 19l6-8h12',
  sinSenal: 'M3 4l18 16M7 18h10.5a3.5 3.5 0 0 0 1.4-6.7M6.6 9.2A5 5 0 0 0 7 18M10 6.3A5.5 5.5 0 0 1 16.4 9',
  sinDatos: 'M4 19h2M9 19v-4M14 19v-8M19 19V7M3 4l18 18',
  mas: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
} as const;

export type NombreIcono = keyof typeof ICONOS;

// ── Ícono ────────────────────────────────────────────────────────────────────
/** Ícono de 24 dp (o `tamano`). `color` por defecto es el texto del tema activo. */
export function Icono({ nombre, tamano = 24, color, grosor = 2.5 }: { nombre: NombreIcono; tamano?: number; color?: string; grosor?: number }) {
  const { c } = useTema();
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path d={ICONOS[nombre]} stroke={color ?? c.texto} strokeWidth={grosor} strokeLinecap="square" fill="none" />
    </Svg>
  );
}
