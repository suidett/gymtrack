import { fmtKg, type RoutineExercise } from '@gymtrack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Boton, Cabecera, Campo, Pantalla, Stepper, Tarjeta, Txt, Vacio } from '@/components/ui';
import { useStore } from '@/store/useStore';

function Ajuste({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Txt v="cuerpoMedio" className="flex-1">{etiqueta}</Txt>
      {children}
    </View>
  );
}

export default function ConfigEjercicio() {
  const { id, reId } = useLocalSearchParams<{ id: string; reId: string }>();
  const rutina = useStore((s) => s.rutinas.find((r) => r.id === id));
  const ejercicios = useStore((s) => s.ejercicios);
  const guardarRutina = useStore((s) => s.guardarRutina);

  const dia = rutina?.dias.find((d) => d.ejercicios.some((re) => re.id === reId));
  const re = dia?.ejercicios.find((x) => x.id === reId);
  const ex = ejercicios.find((e) => e.id === re?.exerciseId);

  if (!rutina || !dia || !re) {
    return (
      <Pantalla>
        <Cabecera titulo="Ejercicio" atras />
        <Vacio titulo="Este ejercicio ya no está en la rutina" />
      </Pantalla>
    );
  }

  const esTiempo = ex?.tipoCarga === 'tiempo';
  const patch = (p: Partial<RoutineExercise>) =>
    guardarRutina({
      ...rutina,
      dias: rutina.dias.map((d) =>
        d.id !== dia.id ? d : { ...d, ejercicios: d.ejercicios.map((x) => (x.id === re.id ? { ...x, ...p } : x)) },
      ),
    });
  const quitar = () => {
    guardarRutina({
      ...rutina,
      dias: rutina.dias.map((d) =>
        d.id !== dia.id
          ? d
          : { ...d, ejercicios: d.ejercicios.filter((x) => x.id !== re.id).map((x, i) => ({ ...x, orden: i })) },
      ),
    });
    router.back();
  };

  return (
    <Pantalla>
      <Cabecera titulo={ex?.nombre ?? 'Ejercicio'} subtitulo={`${dia.nombre} · ${ex?.grupo ?? ''} · ${ex?.equipo ?? ''}`} atras />
      <Tarjeta className="gap-4">
        <Ajuste etiqueta="Series">
          <Stepper valor={re.series} onCambio={(v) => patch({ series: v })} min={1} max={10} />
        </Ajuste>
        <Ajuste etiqueta={esTiempo ? 'Segundos mínimo' : 'Repeticiones mínimo'}>
          <Stepper
            valor={re.repsMin}
            onCambio={(v) => patch({ repsMin: v, repsMax: Math.max(v, re.repsMax) })}
            min={1}
            max={esTiempo ? 600 : 50}
            paso={esTiempo ? 5 : 1}
          />
        </Ajuste>
        <Ajuste etiqueta={esTiempo ? 'Segundos máximo' : 'Repeticiones máximo'}>
          <Stepper
            valor={re.repsMax}
            onCambio={(v) => patch({ repsMax: v, repsMin: Math.min(v, re.repsMin) })}
            min={1}
            max={esTiempo ? 600 : 50}
            paso={esTiempo ? 5 : 1}
          />
        </Ajuste>
        <Ajuste etiqueta="RIR objetivo">
          <Stepper valor={re.rirObjetivo} onCambio={(v) => patch({ rirObjetivo: v })} min={0} max={5} />
        </Ajuste>
        <Ajuste etiqueta="Descanso">
          <Stepper valor={re.descansoS} onCambio={(v) => patch({ descansoS: v })} min={15} max={600} paso={15} formato={(v) => `${v} s`} />
        </Ajuste>
        {!esTiempo ? (
          <Ajuste etiqueta="Incremento de carga">
            <Stepper valor={re.incrementoKg} onCambio={(v) => patch({ incrementoKg: v })} min={0} max={20} paso={0.5} formato={fmtKg} />
          </Ajuste>
        ) : null}
        {!esTiempo ? (
          <Ajuste etiqueta="Peso inicial">
            <Stepper
              valor={re.pesoInicialKg ?? 0}
              onCambio={(v) => patch({ pesoInicialKg: v })}
              min={0}
              max={500}
              paso={re.incrementoKg > 0 ? re.incrementoKg : 2.5}
              formato={(v) => (re.pesoInicialKg == null ? 'sin definir' : fmtKg(v))}
            />
          </Ajuste>
        ) : null}
      </Tarjeta>

      <Campo
        etiqueta="Nota para este ejercicio"
        className="mt-4"
        value={re.nota ?? ''}
        onChangeText={(t) => patch({ nota: t })}
        placeholder="Tempo, agarre, indicaciones"
        multiline
      />
      <Txt v="secundario" className="mt-3">
        Sin peso inicial, la primera sesión parte de 0 y lo ajustas ahí. Después la app propone la carga según la sesión anterior.
      </Txt>

      <Boton titulo="Listo" className="mt-6" onPress={() => router.back()} />
      <Boton titulo="Quitar de la rutina" variante="peligro" className="mt-2" onPress={quitar} />
    </Pantalla>
  );
}
