// ─────────────────────────────────────────────────────────────────────────────
// Rutinas · Zona: Rutas (área Rutinas)
//
// Qué hace: la pestaña Rutinas del alumno (PAN-06).
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: @/features/alumno/Rutinas.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaRutinas } from '@/features/alumno/Rutinas';

export default function RutinasAlumno() {
  return <PantallaRutinas />;
}
