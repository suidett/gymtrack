// ─────────────────────────────────────────────────────────────────────────────
// Ficha del cliente · Zona: Rutas (área Entrenador)
//
// Qué hace: la ficha del cliente `id` vista por su entrenador (PAN-17). Solo entrenador.
// Tócalo cuando: la ruta cambie de nombre o de parámetros. La pantalla vive en
// src/features/entrenador/PantallaFicha.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router (useLocalSearchParams) y @/features/entrenador.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaFicha } from '@/features/entrenador';

export default function FichaCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaFicha key={id} id={String(id ?? '')} />;
}
