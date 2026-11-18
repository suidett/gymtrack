// ─────────────────────────────────────────────────────────────────────────────
// Progreso · Zona: Rutas (área Progreso)
//
// Qué hace: la pestaña Progreso (PAN-14). Acepta ?vista=fuerza|peso|medidas para abrir en esa vista.
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router y @/features/alumno/Progreso.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaProgreso } from '@/features/alumno/Progreso';

export default function Progreso() {
  const { vista } = useLocalSearchParams<{ vista?: string }>();
  const v = vista === 'peso' || vista === 'medidas' || vista === 'fuerza' ? vista : undefined;
  return <PantallaProgreso key={v ?? 'fuerza'} vistaInicial={v} />;
}
