// ─────────────────────────────────────────────────────────────────────────────
// Rutinas del entrenador · Zona: Rutas (área Rutinas)
//
// Qué hace: la pestaña Rutinas del entrenador: su biblioteca y la hoja para asignar (PAN-06, versión entrenador). Es la misma pantalla del alumno, que cambia según el rol.
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: @/features/alumno/Rutinas.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaRutinas } from '@/features/alumno/Rutinas';

export default function RutinasEntrenador() {
  return <PantallaRutinas />;
}
