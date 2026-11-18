// ─────────────────────────────────────────────────────────────────────────────
// Perfil del entrenador · Zona: Rutas (área Entrenador)
//
// Qué hace: la pestaña Perfil del entrenador (PAN-15 con rol entrenador): sus cifras, el código
// para invitar, preferencias, avisos, exportar, borrar la cuenta y cerrar sesión.
// Tócalo cuando: la ruta cambie de nombre o de parámetros. La pantalla vive en
// src/features/entrenador/PantallaPerfilEntrenador.tsx.
// No lo toques para: el Perfil del alumno ((alumno)/perfil.tsx) ni quién puede entrar
// (src/app/_layout.tsx y entrenador/_layout.tsx).
// Depende de: @/features/entrenador.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaPerfilEntrenador } from '@/features/entrenador';

export default function PerfilEntrenador() {
  return <PantallaPerfilEntrenador />;
}
