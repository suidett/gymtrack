// ─────────────────────────────────────────────────────────────────────────────
// Nueva rutina · Zona: Rutas (área Rutinas)
//
// Qué hace: el editor de rutinas (PAN-07). Sin parámetros crea una; ?editar=<id> edita esa rutina; ?cliente=<id> (entrenador) la asigna a ese cliente al guardar.
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router y @/features/alumno/EditorRutina.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaEditorRutina } from '@/features/alumno/EditorRutina';

export default function NuevaRutina() {
  const { editar, cliente } = useLocalSearchParams<{ editar?: string; cliente?: string }>();
  return <PantallaEditorRutina key={editar ?? 'nueva'} editarId={editar || undefined} clienteId={cliente || undefined} />;
}
