// ─────────────────────────────────────────────────────────────────────────────
// Pantallas de acceso · Zona: Rutas
//
// Qué hace: agrupa Ingreso, Crear cuenta, Recuperar y Restablecer en una pila sin cabecera. Solo
// existe sin sesión (lo decide src/app/_layout.tsx); si alguien llega con sesión, lo manda al
// inicio de su rol.
// Tócalo cuando: sumes una pantalla de acceso o cambies cuál se abre primero.
// No lo toques para: el contenido de cada pantalla (su archivo en esta carpeta).
// Depende de: @/lib/sesion (useSesion) y @/lib/tema (fondo de la pila).
// ─────────────────────────────────────────────────────────────────────────────
import { Redirect, Stack } from 'expo-router';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';

// Ingreso es la primera: es a la que se llega sin sesión.
export const unstable_settings = { initialRouteName: 'ingreso' };

export default function AccesoLayout() {
  const { estado, rol } = useSesion();
  const { c } = useTema();
  if (estado === 'con-sesion') return <Redirect href={rol === 'entrenador' ? '/entrenador' : '/'} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fondo }, animation: 'slide_from_right' }}>
      <Stack.Screen name="ingreso" />
      <Stack.Screen name="crear-cuenta" />
      <Stack.Screen name="recuperar" />
      <Stack.Screen name="restablecer" />
    </Stack>
  );
}
