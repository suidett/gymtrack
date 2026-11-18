// ─────────────────────────────────────────────────────────────────────────────
// Nueva contraseña · Zona: Rutas (área Acceso)
//
// Qué hace: monta la pantalla Nueva contraseña (PAN-03, desde el enlace) en /restablecer?token=. Es el
// destino del enlace del correo, gymtrack://restablecer?token=... (ENLACE_RESTABLECER_URL de la API).
// Tócalo cuando: cambie la URL o las opciones de esta ruta. La pantalla vive en
// src/features/acceso/PantallaRestablecer.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx) ni el contenido de la
// pantalla (su archivo en features/acceso).
// Depende de: @/features/acceso.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaRestablecer } from '@/features/acceso';

export default function Restablecer() {
  return <PantallaRestablecer />;
}
