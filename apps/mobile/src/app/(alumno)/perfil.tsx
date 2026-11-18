// ─────────────────────────────────────────────────────────────────────────────
// Perfil · Zona: Rutas (área Perfil)
//
// Qué hace: la pestaña Perfil y ajustes del alumno (PAN-15). Con ?vincular=1 abre la hoja para ingresar el código del entrenador.
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router y @/features/alumno/Perfil.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaPerfil } from '@/features/alumno/Perfil';

export default function PerfilAlumno() {
  const { vincular } = useLocalSearchParams<{ vincular?: string }>();
  // La clave vuelve a montar la pantalla si llega de nuevo con ?vincular=1 (las pestañas no se desmontan).
  return <PantallaPerfil key={vincular ?? 'perfil'} abrirVincular={vincular === '1'} />;
}
