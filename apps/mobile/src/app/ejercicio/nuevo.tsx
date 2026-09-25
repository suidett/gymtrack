import { router } from 'expo-router';
import { FormularioEjercicio } from '@/components/FormularioEjercicio';
import { Cabecera, Pantalla } from '@/components/ui';
import { useStore } from '@/store/useStore';

export default function NuevoEjercicio() {
  const agregarEjercicio = useStore((s) => s.agregarEjercicio);
  return (
    <Pantalla>
      <Cabecera titulo="Nuevo ejercicio" subtitulo="Queda en tu biblioteca, listo para cualquier rutina." atras />
      <FormularioEjercicio
        textoGuardar="Guardar ejercicio"
        onGuardar={(d) => {
          agregarEjercicio(d);
          router.back();
        }}
      />
    </Pantalla>
  );
}
