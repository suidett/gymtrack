import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Cabecera, Pantalla, Vacio } from '@/components/ui';
import { Bitacora } from '@/features/sesion/Bitacora';
import { Resumen } from '@/features/sesion/Resumen';
import { useStore } from '@/store/useStore';

export default function Sesion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sesion = useStore((s) => s.sesiones.find((x) => x.id === id));
  const [recienCerrada, setRecienCerrada] = useState(false);

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
