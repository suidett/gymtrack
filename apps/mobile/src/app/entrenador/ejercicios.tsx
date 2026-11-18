// ─────────────────────────────────────────────────────────────────────────────
// Ejercicios del entrenador · Zona: Rutas (área Ejercicios)
//
// Qué hace: la pestaña Ejercicios del entrenador (PAN-09, sin la columna de récord). Es la misma pantalla del alumno, que cambia según el rol.
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: @/features/alumno/Ejercicios.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaEjercicios } from '@/features/alumno/Ejercicios';

export default function EjerciciosEntrenador() {
  return <PantallaEjercicios />;
}
