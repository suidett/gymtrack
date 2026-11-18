// ─────────────────────────────────────────────────────────────────────────────
// Hoy · Zona: Rutas (área Entrenar)
//
// Qué hace: la pestaña Hoy del alumno (PAN-05, hoy.html). Toda la pantalla vive en
// src/features/entrenar/PantallaHoy.tsx; aquí solo se monta.
// Tócalo cuando: la ruta necesite opciones propias.
// No lo toques para: lo que muestra Hoy (PantallaHoy.tsx) ni quién entra (src/app/_layout.tsx).
// Depende de: @/features/entrenar/PantallaHoy.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaHoy } from '@/features/entrenar/PantallaHoy';

export default function Hoy() {
  return <PantallaHoy />;
}
