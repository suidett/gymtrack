// ─────────────────────────────────────────────────────────────────────────────
// Recuperar contraseña · Zona: Rutas (área Acceso)
//
// Qué hace: monta la pantalla Recuperar (PAN-03, pedir el enlace) en /recuperar.
// Tócalo cuando: cambie la URL o las opciones de esta ruta. La pantalla vive en
// src/features/acceso/PantallaRecuperar.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx) ni el contenido de la
// pantalla (su archivo en features/acceso).
// Depende de: @/features/acceso.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaRecuperar } from '@/features/acceso';

export default function Recuperar() {
  return <PantallaRecuperar />;
}
