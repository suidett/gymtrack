// ─────────────────────────────────────────────────────────────────────────────
// Crear cuenta · Zona: Rutas (área Acceso)
//
// Qué hace: monta la pantalla Crear cuenta (PAN-02) en /crear-cuenta. Acepta ?rol=cliente o
// ?rol=entrenador para dejar el rol marcado (lo manda «Regístrate» de Ingreso).
// Tócalo cuando: cambie la URL o las opciones de esta ruta. La pantalla vive en
// src/features/acceso/PantallaCrearCuenta.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx) ni el contenido de la
// pantalla (su archivo en features/acceso).
// Depende de: @/features/acceso.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaCrearCuenta } from '@/features/acceso';

export default function CrearCuenta() {
  return <PantallaCrearCuenta />;
}
