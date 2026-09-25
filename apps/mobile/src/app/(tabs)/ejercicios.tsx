// ─────────────────────────────────────────────────────────────────────────────
// Pantalla Ejercicios · Zona: Rutas
//
// Qué hace: muestra la biblioteca completa del alumno (los ejercicios base más los propios) con
// buscador y filtro por grupo, y al lado de cada uno su récord vigente si tiene. Desde aquí se
// crea un ejercicio nuevo o se entra a la ficha de uno.
// Tócalo cuando: cambies qué se ve a la derecha de cada ejercicio o a dónde llevan los botones.
// No lo toques para: cambiar el buscador, los chips de grupo o la fila (src/components/ListaEjercicios.tsx),
// el formulario de crear o editar (src/components/FormularioEjercicio.tsx y src/app/ejercicio/),
// cómo se calcula el récord (marcaVigente en packages/shared/src/cierre.ts) ni la biblioteca base
// (packages/shared/src/exercises.seed.ts).
// Depende de: @gymtrack/shared (fmtMarca, marcaVigente, MarcaHistorica), @/components/ListaEjercicios,
// @/components/ui y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────

import { fmtMarca, marcaVigente, type MarcaHistorica } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { ListaEjercicios } from '@/components/ListaEjercicios';
import { Boton, Cabecera, Pantalla, Txt } from '@/components/ui';
import { useStore } from '@/store/useStore';

/**
 * Pestaña Ejercicios. No recibe props. La lista, el buscador y el filtro los pone
 * ListaEjercicios; esta pantalla solo decide qué va a la derecha de cada fila y a dónde se navega.
 */
export default function Ejercicios() {
  // ── Estado del store ─────────────────────────────────────────────────────────
  const ejercicios = useStore((s) => s.ejercicios);
  const sesiones = useStore((s) => s.sesiones);

  // ── Récord por ejercicio ─────────────────────────────────────────────────────
  // Mapa id del ejercicio -> mejor marca vigente, armado una sola vez por cambio de datos para
  // que dibujar cada fila sea una búsqueda directa y no un recorrido de todas las sesiones.
  // Los ejercicios sin ninguna serie completada no entran al mapa.
  const marcas = useMemo(() => {
    const m = new Map<string, MarcaHistorica>();
    for (const e of ejercicios) {
      const mv = marcaVigente(e.id, e.tipoCarga, sesiones);
      if (mv) m.set(e.id, mv);
    }
    return m;
  }, [ejercicios, sesiones]);

  // ── Render ───────────────────────────────────────────────────────────────────
  // `derecha` es una función que la lista llama por cada ejercicio (render prop): así la lista
  // no sabe nada de récords y se puede reusar en el selector de la rutina.
  return (
    <Pantalla>
      <Cabecera
        titulo="Ejercicios"
        subtitulo={`${ejercicios.length} en tu biblioteca`}
        derecha={<Boton titulo="Crear" variante="secundario" chico onPress={() => router.push('/ejercicio/nuevo')} />}
      />
      <ListaEjercicios
        ejercicios={ejercicios}
        onPress={(e) => router.push(`/ejercicio/${e.id}`)}
        derecha={(e) => {
          const m = marcas.get(e.id);
          return m ? (
            <View className="items-end">
              <Txt v="mono">{fmtMarca(m)}</Txt>
              <Txt v="monoSecundario">récord</Txt>
            </View>
          ) : (
            <Txt v="monoSecundario">sin récord</Txt>
          );
        }}
      />
    </Pantalla>
  );
}
