// ─────────────────────────────────────────────────────────────────────────────
// Motivos de la baja · Zona: Rutas (área Alertas del alumno)
//
// Qué hace: la pantalla que pide los motivos de una alerta de baja (PAN-20) y muestra los consejos.
// Tócalo cuando: cambien los parámetros de la ruta. La pantalla vive en src/features/alumno/.
// No lo toques para: cambiar lo que muestra la pantalla (su archivo en src/features/alumno/) ni
// quién puede entrar (src/app/_layout.tsx).
// Depende de: expo-router y @/features/alumno/Motivos.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { PantallaMotivos } from '@/features/alumno/Motivos';

export default function Motivos() {
  const { alertaId } = useLocalSearchParams<{ alertaId: string }>();
  return <PantallaMotivos key={String(alertaId)} alertaId={String(alertaId)} />;
}
