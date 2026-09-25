// ─────────────────────────────────────────────────────────────────────────────
// Nuevo ejercicio · Zona: Rutas
//
// Qué hace: la pantalla para crear un ejercicio propio en la biblioteca. Solo arma la cabecera y
// delega el formulario; al guardar, lo agrega al store y vuelve a la pantalla anterior (la pestaña
// Ejercicios o el selector "Agregar ejercicio" de una rutina).
// Tócalo cuando: cambie el título o qué pasa justo después de guardar (por ejemplo, abrir la ficha
// recién creada en vez de volver).
// No lo toques para: los campos y la validación, eso es src/components/FormularioEjercicio.tsx; ni
// para cómo se guarda (id, propio, creadoAt), eso es agregarEjercicio en src/store/useStore.ts.
// Depende de: @/components/FormularioEjercicio, @/components/ui y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { FormularioEjercicio } from '@/components/FormularioEjercicio';
import { Cabecera, Pantalla } from '@/components/ui';
import { useStore } from '@/store/useStore';

/**
 * Pantalla /ejercicio/nuevo. No recibe parámetros. Al guardar hace router.back(), así quien la abrió
 * (la pestaña Ejercicios o el selector de una rutina) vuelve con la lista ya actualizada desde el store.
 */
export default function NuevoEjercicio() {
  // El store le pone id, propio: true y creadoAt; el formulario solo entrega los campos escritos.
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
