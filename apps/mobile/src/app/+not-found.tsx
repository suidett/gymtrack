import { router } from 'expo-router';
import { Boton, Cabecera, Pantalla, Txt } from '@/components/ui';

export default function NoEncontrada() {
  return (
    <Pantalla>
      <Cabecera titulo="Página no encontrada" />
      <Txt v="secundario" className="mb-4">Esa dirección no existe en la app.</Txt>
      <Boton titulo="Volver al inicio" onPress={() => router.replace('/')} />
    </Pantalla>
  );
}
