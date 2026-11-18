// ─────────────────────────────────────────────────────────────────────────────
// Ajustar cargas · Zona: Rutas (área Entrenador)
//
// Qué hace: sobrescribir las sugerencias de carga de la próxima sesión del cliente `id`
// (PAN-19, CU-42). Solo entrenador.
// Tócalo cuando: la ruta cambie de nombre o de parámetros. La pantalla vive en
// src/features/entrenador/PantallaAjustarCargas.tsx.
// No lo toques para: cambiar quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router (useLocalSearchParams) y @/features/entrenador.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaAjustarCargas } from '@/features/entrenador';

export default function AjustarCargas() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaAjustarCargas key={id} clienteId={String(id ?? '')} />;
}
