// ─────────────────────────────────────────────────────────────────────────────
// Ejercicios · Zona: Rutas (área Ejercicios)
//
// Qué hace: la pestaña Ejercicios del alumno: buscar y filtrar la biblioteca (PAN-09).
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: @/features/alumno/Ejercicios.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaEjercicios } from '@/features/alumno/Ejercicios';

export default function EjerciciosAlumno() {
  return <PantallaEjercicios />;
}
