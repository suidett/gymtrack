// ─────────────────────────────────────────────────────────────────────────────
// Pestañas del entrenador · Zona: Rutas
//
// Qué hace: las cinco pestañas del entrenador (Clientes, Rutinas, Ejercicios, Alertas, Perfil)
// con la barra de texto de la marca. Viven bajo /entrenador para que sus rutas no choquen con
// las del alumno (/rutinas, /perfil). Si quien entra es alumno, lo manda a sus pestañas.
// Tócalo cuando: agregues, quites o reordenes una pestaña del entrenador, o quieras mostrar la
// insignia de Alertas (options.tabBarBadge).
// No lo toques para: lo que muestra una pestaña (su archivo en esta carpeta).
// Depende de: @/components/ui (BarraPestanas), @/lib/sesion y @/lib/tema.
// ─────────────────────────────────────────────────────────────────────────────
import { Redirect, Tabs } from 'expo-router';
import { BarraPestanas, type PropsBarraPestanas } from '@/components/ui';
import { useInsigniaAlertas } from '@/features/entrenador';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';

export default function EntrenadorLayout() {
  const { estado, rol } = useSesion();
  const { c } = useTema();
  // Las alertas nuevas las cuentan Clientes y Alertas al cargar (features/entrenador/instancia.ts).
  const nuevas = useInsigniaAlertas((s) => s.nuevas);
  if (estado !== 'con-sesion') return <Redirect href="/ingreso" />;
  if (rol !== 'entrenador') return <Redirect href="/" />;
  return (
    <Tabs
      tabBar={(p) => <BarraPestanas {...(p as unknown as PropsBarraPestanas)} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.fondo } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="rutinas" options={{ title: 'Rutinas' }} />
      <Tabs.Screen name="ejercicios" options={{ title: 'Ejercicios' }} />
      <Tabs.Screen name="alertas" options={{ title: 'Alertas', tabBarBadge: nuevas || undefined }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
