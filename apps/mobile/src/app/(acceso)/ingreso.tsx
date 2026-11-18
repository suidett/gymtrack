// ─────────────────────────────────────────────────────────────────────────────
// Ingreso · Zona: Rutas (área Acceso)
//
// Qué hace: monta la pantalla Ingreso (PAN-01) en /ingreso. Acepta ?rol=entrenador para dejar marcado el
// rol (lo usa «¿Ya tienes cuenta? Ingresa» de Crear cuenta).
// Tócalo cuando: cambie la URL o las opciones de esta ruta. La pantalla vive en
// src/features/acceso/PantallaIngreso.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx) ni el contenido de la
// pantalla (su archivo en features/acceso).
// Depende de: @/features/acceso.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaIngreso } from '@/features/acceso';

export default function Ingreso() {
  return <PantallaIngreso />;
}
