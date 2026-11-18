// ─────────────────────────────────────────────────────────────────────────────
// Pestañas del alumno · Zona: Rutas
//
// Qué hace: las cinco pestañas del alumno (Hoy, Rutinas, Progreso, Ejercicios, Perfil) con la
// barra de texto de la marca. Si el alumno tiene la encuesta pendiente lo manda a la Encuesta
// (INT-002, APP-008); si quien entra es entrenador, a sus pestañas.
// Tócalo cuando: agregues, quites o reordenes una pestaña del alumno.
// No lo toques para: lo que muestra una pestaña (su archivo en esta carpeta).
// Depende de: @/components/ui (BarraPestanas), @/lib/sesion y @/lib/tema.
// ─────────────────────────────────────────────────────────────────────────────
import { Redirect, Tabs } from 'expo-router';
import { BarraPestanas, type PropsBarraPestanas } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';

export default function AlumnoLayout() {
  const { estado, rol, usuario } = useSesion();
  const { c } = useTema();
  if (estado !== 'con-sesion') return <Redirect href="/ingreso" />;
  if (rol === 'entrenador') return <Redirect href="/entrenador" />;
  if (usuario?.encuesta_pendiente) return <Redirect href="/encuesta" />;
  // El orden de los Tabs.Screen es el orden en la barra; `index` es Hoy.
  return (
    <Tabs
      tabBar={(p) => <BarraPestanas {...(p as unknown as PropsBarraPestanas)} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.fondo } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="rutinas" options={{ title: 'Rutinas' }} />
      <Tabs.Screen name="progreso" options={{ title: 'Progreso' }} />
      <Tabs.Screen name="ejercicios" options={{ title: 'Ejercicios' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
