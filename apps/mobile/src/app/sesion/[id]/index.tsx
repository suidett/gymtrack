// ─────────────────────────────────────────────────────────────────────────────
// Registro de sesión · Zona: Rutas (área Entrenar)
//
// Qué hace: el registro de la sesión en curso con su capa de descanso (PAN-11 y PAN-12,
// registro.html). `id` es el de la sesión. La pantalla vive en
// src/features/entrenar/PantallaRegistro.tsx; aquí solo se lee el id y se monta.
// Tócalo cuando: la ruta necesite opciones propias.
// No lo toques para: lo que muestra el registro (PantallaRegistro.tsx) ni quién entra o el gesto
// de volver (src/app/_layout.tsx).
// Depende de: expo-router y @/features/entrenar/PantallaRegistro.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaRegistro } from '@/features/entrenar/PantallaRegistro';

export default function RegistroSesion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaRegistro id={String(id ?? '')} />;
}
