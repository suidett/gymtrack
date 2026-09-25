import type { Exercise, RoutineExercise } from '@gymtrack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ListaEjercicios } from '@/components/ListaEjercicios';
import { Boton, Cabecera, Pantalla, Txt, Vacio } from '@/components/ui';
import { newId } from '@/lib/ids';
import { useStore } from '@/store/useStore';

export default function AgregarEjercicio() {
  const { id, dia } = useLocalSearchParams<{ id: string; dia: string }>();
  const rutina = useStore((s) => s.rutinas.find((r) => r.id === id));
  const ejercicios = useStore((s) => s.ejercicios);
  const perfil = useStore((s) => s.perfil);
  const guardarRutina = useStore((s) => s.guardarRutina);
  const diaObj = rutina?.dias.find((d) => d.id === dia);

  if (!rutina || !diaObj) {
    return (
      <Pantalla>
        <Cabecera titulo="Agregar ejercicio" atras />
        <Vacio titulo="No encontré el día de la rutina" />
      </Pantalla>
    );
  }

  const yaEsta = (ex: Exercise) => diaObj.ejercicios.some((re) => re.exerciseId === ex.id);

  function agregar(ex: Exercise) {
    if (!rutina || !diaObj) return;
    const esTiempo = ex.tipoCarga === 'tiempo';
    const re: RoutineExercise = {
      id: newId(),
      exerciseId: ex.id,
      orden: diaObj.ejercicios.length,
      series: 3,
      repsMin: esTiempo ? 30 : 8,
      repsMax: esTiempo ? 45 : 12,
      rirObjetivo: 2,
      descansoS: perfil.descansoDefaultS,
      incrementoKg: ex.incrementoKg,
      pesoInicialKg: null,
    };
    guardarRutina({
      ...rutina,
      dias: rutina.dias.map((d) => (d.id === diaObj.id ? { ...d, ejercicios: [...d.ejercicios, re] } : d)),
    });
    router.back();
  }

  return (
    <Pantalla>
      <Cabecera titulo="Agregar ejercicio" subtitulo={`A ${diaObj.nombre}`} atras />
      <ListaEjercicios
        ejercicios={ejercicios}
        onPress={agregar}
        derecha={(ex) =>
          yaEsta(ex) ? <Txt v="etiquetaPrimaria">en el día</Txt> : <Text className="font-sans-bold text-2xl text-primary">+</Text>
        }
      />
      <Boton titulo="Crear un ejercicio nuevo" variante="fantasma" className="mt-4" onPress={() => router.push('/ejercicio/nuevo')} />
    </Pantalla>
  );
}
