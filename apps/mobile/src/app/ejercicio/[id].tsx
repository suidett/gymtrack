// ─────────────────────────────────────────────────────────────────────────────
// Detalle de ejercicio · Zona: Rutas (área Ejercicios)
//
// Qué hace: el detalle de un ejercicio (PAN-10). Con id «nuevo» abre el formulario de ejercicio propio; ?nombre=, ?grupo= y ?equipo= lo llenan (vienen de la búsqueda sin resultados).
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router y @/features/alumno/DetalleEjercicio.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaEjercicio } from '@/features/alumno/DetalleEjercicio';

export default function DetalleEjercicio() {
  const { id, nombre, grupo, equipo } = useLocalSearchParams<{ id: string; nombre?: string; grupo?: string; equipo?: string }>();
  return <PantallaEjercicio key={String(id)} id={String(id)} prellenado={{ nombre: nombre ?? '', grupo: grupo ?? '', equipo: equipo ?? '' }} />;
}
