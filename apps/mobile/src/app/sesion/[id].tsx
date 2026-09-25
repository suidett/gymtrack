// ─────────────────────────────────────────────────────────────────────────────
// Ruta de la sesión · Zona: Rutas
//
// Qué hace: la pantalla /sesion/<id>. Busca la sesión en el store y decide qué mostrar: la bitácora si
// sigue en curso, el resumen si ya está cerrada, o un aviso si la sesión ya no existe (se descartó).
// Tócalo cuando: cambies qué pasa al entrar a una sesión o cómo se elige entre bitácora y resumen.
// No lo toques para: la tabla de series o el descanso (features/sesion/Bitacora.tsx) ni el resumen
// (features/sesion/Resumen.tsx). La ruta se mantiene delgada: solo decide y delega.
// Depende de: @/components/ui (Cabecera, Pantalla, Vacio), @/features/sesion/Bitacora,
// @/features/sesion/Resumen, @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Cabecera, Pantalla, Vacio } from '@/components/ui';
import { Bitacora } from '@/features/sesion/Bitacora';
import { Resumen } from '@/features/sesion/Resumen';
import { useStore } from '@/store/useStore';

/**
 * Pantalla de una sesión. Lee el `id` de la URL y no recibe props.
 * Muestra Bitacora mientras la sesión está en curso y Resumen cuando está cerrada. Las dos leen la misma
 * sesión del store, así que al cerrarla el cambio de estado hace el paso de una a otra sin navegar.
 */
export default function Sesion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sesion = useStore((s) => s.sesiones.find((x) => x.id === id));
  // Distingue "la cerré recién" (celebración) de "abrí una sesión vieja desde el historial" (cabecera normal).
  // Bitacora avisa por onCerrar justo antes de cerrar en el store, por eso al re-renderizar ya está en true.
  const [recienCerrada, setRecienCerrada] = useState(false);

  // Pasa al descartar una sesión (se borra del store) o si el enlace apunta a un id que ya no existe.
  if (!sesion) {
    return (
      <Pantalla>
        <Cabecera titulo="Sesión" atras />
        <Vacio titulo="Esta sesión ya no existe" accion="Volver al inicio" onAccion={() => router.dismissTo('/')} />
      </Pantalla>
    );
  }
  if (sesion.estado === 'cerrada') return <Resumen sesion={sesion} celebrar={recienCerrada} />;
  return <Bitacora sesion={sesion} onCerrar={() => setRecienCerrada(true)} />;
}
