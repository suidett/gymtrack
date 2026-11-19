// ─────────────────────────────────────────────────────────────────────────────
// Notificaciones · Zona: Rutas (área Notificaciones)
//
// Qué hace: la pantalla que abre la campana de Hoy (alumno) y de Clientes (entrenador), en
// /notificaciones, encima de las pestañas. La ven los dos roles (src/app/_layout.tsx, con sesión).
// Toda la pantalla vive en src/features/notificaciones/PantallaNotificaciones.tsx; aquí solo se monta.
// Tócalo cuando: la ruta necesite opciones propias.
// No lo toques para: lo que muestra (PantallaNotificaciones.tsx) ni quién entra (src/app/_layout.tsx).
// Depende de: @/features/notificaciones.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaNotificaciones } from '@/features/notificaciones';

export default function Notificaciones() {
  return <PantallaNotificaciones />;
}
