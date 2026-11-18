// ─────────────────────────────────────────────────────────────────────────────
// Detalle de rutina · Zona: Rutas (área Rutinas)
//
// Qué hace: el plan de una rutina (PAN-08). ?dia=<n> abre ese día (0 es el primero).
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router y @/features/alumno/DetalleRutina.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaDetalleRutina } from '@/features/alumno/DetalleRutina';

export default function DetalleRutina() {
  const { id, dia } = useLocalSearchParams<{ id: string; dia?: string }>();
  const n = dia !== undefined && dia !== '' && Number.isFinite(Number(dia)) ? Number(dia) : undefined;
  return <PantallaDetalleRutina key={`${id}-${dia ?? ''}`} id={String(id)} diaInicial={n} />;
}
