// ─────────────────────────────────────────────────────────────────────────────
// Clientes · Zona: Rutas (área Entrenador)
//
// Qué hace: la pestaña Clientes del entrenador (PAN-16), su inicio: adherencia de la semana,
// «Por revisar», la lista con filtros y buscador, y el código para invitar.
// Tócalo cuando: la ruta cambie de nombre o de parámetros. La pantalla vive en
// src/features/entrenador/PantallaClientes.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx y entrenador/_layout.tsx).
// Depende de: @/features/entrenador.
// ─────────────────────────────────────────────────────────────────────────────
import { PantallaClientes } from '@/features/entrenador';

export default function Clientes() {
  return <PantallaClientes />;
}
