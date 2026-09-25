// ─────────────────────────────────────────────────────────────────────────────
// Agregar ejercicio a un día · Zona: Rutas
//
// Qué hace: muestra la biblioteca de ejercicios (buscador y filtro por grupo) para sumar uno al día
// de la rutina que viene en la ruta. Al tocarlo lo agrega con valores por defecto (3 series, 8 a 12
// reps o 30 a 45 s, RIR 2, el descanso del perfil) y vuelve al editor de la rutina.
// Tócalo cuando: cambien los valores con que nace un ejercicio en la rutina o lo que se muestra a la
// derecha de cada fila (el "+" o "en el día").
// No lo toques para: el buscador y los chips de grupo, que viven en src/components/ListaEjercicios.tsx;
// ni para ajustar series o reps una vez agregado, eso es ./ejercicio/[reId].tsx.
// Depende de: @gymtrack/shared (tipos Exercise, RoutineExercise), @/components/ListaEjercicios,
// @/components/ui, @/lib/ids (newId) y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────
import type { Exercise, RoutineExercise } from '@gymtrack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ListaEjercicios } from '@/components/ListaEjercicios';
import { Boton, Cabecera, Pantalla, Txt, Vacio } from '@/components/ui';
import { newId } from '@/lib/ids';
import { useStore } from '@/store/useStore';

/**
 * Pantalla /rutina/[id]/agregar?dia=<id del día>. Recibe por la ruta el id de la rutina y el del día.
 * No devuelve nada a quien la abrió: al elegir un ejercicio guarda la rutina y hace router.back().
 */
export default function AgregarEjercicio() {
  // ── Datos del store ──────────────────────────────────────────────────────────
  const { id, dia } = useLocalSearchParams<{ id: string; dia: string }>();
  const rutina = useStore((s) => s.rutinas.find((r) => r.id === id));
  const ejercicios = useStore((s) => s.ejercicios);
  // Del perfil sale el descanso por defecto con que nace cada ejercicio.
  const perfil = useStore((s) => s.perfil);
  const guardarRutina = useStore((s) => s.guardarRutina);
  const diaObj = rutina?.dias.find((d) => d.id === dia);

  // ── Guardia: el día ya no existe ─────────────────────────────────────────────
  // Pasa si se quitó el día (o la rutina entera) mientras esta pantalla estaba abierta.
  if (!rutina || !diaObj) {
    return (
      <Pantalla>
        <Cabecera titulo="Agregar ejercicio" atras />
        <Vacio titulo="No encontré el día de la rutina" />
      </Pantalla>
    );
  }

  // ── Agregar el ejercicio al día ──────────────────────────────────────────────
  // Solo informa: el mismo ejercicio se puede agregar dos veces en un día (por ejemplo, dos bloques
  // del mismo levantamiento con distinto rango). Si se quiere impedir, es aquí donde se decide.
  const yaEsta = (ex: Exercise) => diaObj.ejercicios.some((re) => re.exerciseId === ex.id);

  function agregar(ex: Exercise) {
    // TypeScript no arrastra el descarte de la guardia dentro de una función anidada; se repite.
    if (!rutina || !diaObj) return;
    // En un ejercicio de tiempo las "reps" son segundos: parte en 30 a 45 s en vez de 8 a 12.
    const esTiempo = ex.tipoCarga === 'tiempo';
    const re: RoutineExercise = {
      id: newId(),
      exerciseId: ex.id,
      // Va al final del día; después se reordena con las flechas del editor.
      orden: diaObj.ejercicios.length,
      series: 3,
      repsMin: esTiempo ? 30 : 8,
      repsMax: esTiempo ? 45 : 12,
      rirObjetivo: 2,
      descansoS: perfil.descansoDefaultS,
      // Parte con el incremento del ejercicio; en la rutina se puede cambiar sin tocar la biblioteca.
      incrementoKg: ex.incrementoKg,
      // null: la primera sesión parte de 0 y el alumno escribe el peso ahí.
      pesoInicialKg: null,
    };
    guardarRutina({
      ...rutina,
      dias: rutina.dias.map((d) => (d.id === diaObj.id ? { ...d, ejercicios: [...d.ejercicios, re] } : d)),
    });
    // Vuelve al editor, que ya muestra el ejercicio nuevo porque lee del store.
    router.back();
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Pantalla>
      <Cabecera titulo="Agregar ejercicio" subtitulo={`A ${diaObj.nombre}`} atras />
      {/* A la derecha de cada fila: "en el día" si ya está, o un "+" si no. Tocar la fila agrega igual. */}
      <ListaEjercicios
        ejercicios={ejercicios}
        onPress={agregar}
        derecha={(ex) =>
          yaEsta(ex) ? <Txt v="etiquetaPrimaria">en el día</Txt> : <Text className="font-sans-bold text-2xl text-primary">+</Text>
        }
      />
      {/* nuevo.tsx hace router.back() al guardar, así que se vuelve aquí con el ejercicio ya en la lista. */}
      <Boton titulo="Crear un ejercicio nuevo" variante="fantasma" className="mt-4" onPress={() => router.push('/ejercicio/nuevo')} />
    </Pantalla>
  );
}
