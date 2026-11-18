// ─────────────────────────────────────────────────────────────────────────────
// Rutina completada · Zona: Rutas (área Entrenar)
//
// Qué hace: el cierre de la sesión `id` (PAN-13, completada.html). La pantalla vive en
// src/features/entrenar/PantallaCompletada.tsx; aquí solo se lee el id y se monta.
// Tócalo cuando: la ruta necesite opciones propias.
// No lo toques para: lo que muestra el cierre (PantallaCompletada.tsx) ni quién entra
// (src/app/_layout.tsx).
// Depende de: expo-router y @/features/entrenar/PantallaCompletada.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaCompletada } from '@/features/entrenar/PantallaCompletada';

export default function SesionCompletada() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaCompletada id={String(id ?? '')} />;
}
