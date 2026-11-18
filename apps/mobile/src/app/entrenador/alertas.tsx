// ─────────────────────────────────────────────────────────────────────────────
// Alertas · Zona: Rutas (área Entrenador)
//
// Qué hace: la pestaña Alertas del entrenador (PAN-18): por revisar y resueltas, marcar vista y
// resolver.
// Tócalo cuando: la ruta cambie de nombre o de parámetros. La pantalla vive en
// src/features/entrenador/PantallaAlertas.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx y entrenador/_layout.tsx).
// Depende de: @/features/entrenador.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaAlertas } from '@/features/entrenador';

export default function Alertas() {
  return <PantallaAlertas />;
}
