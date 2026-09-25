// ─────────────────────────────────────────────────────────────────────────────
// Ajustes de un ejercicio en la rutina · Zona: Rutas
//
// Qué hace: edita la prescripción de un ejercicio dentro de un día: series, rango de repeticiones
// (o de segundos si es de tiempo), RIR objetivo, descanso, incremento de carga, peso inicial y una
// nota. También lo quita de la rutina.
// Tócalo cuando: cambien los límites o los pasos de esos ajustes, aparezca un campo nuevo en
// RoutineExercise, o cambie el texto de ayuda del peso inicial.
// No lo toques para: los datos del ejercicio en sí (nombre, grupo, equipo), que se editan en
// src/app/ejercicio/[id].tsx; ni para cómo la sesión usa estos valores al proponer la carga, eso es
// packages/shared/src/progression.ts e iniciarSesion en src/store/useStore.ts.
// Depende de: @gymtrack/shared (fmtKg y el tipo RoutineExercise), @/components/ui y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────
import { fmtKg, type RoutineExercise } from '@gymtrack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { InteractionManager, View } from 'react-native';
import { Boton, Cabecera, CampoDiferido, Pantalla, Stepper, Tarjeta, Txt, Vacio } from '@/components/ui';
import { useStore } from '@/store/useStore';

// ── Fila de ajuste ───────────────────────────────────────────────────────────

/** Una fila del formulario: la etiqueta ocupa el espacio libre a la izquierda y el control va a la derecha. */
function Ajuste({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Txt v="cuerpoMedio" className="flex-1">{etiqueta}</Txt>
      {children}
    </View>
  );
}

/**
 * Pantalla /rutina/[id]/ejercicio/[reId]. Recibe el id de la rutina y el id del ejercicio DENTRO de
 * la rutina (RoutineExercise.id, no Exercise.id). Guarda cada cambio al instante con guardarRutina;
 * el botón "Listo" solo vuelve atrás.
 */
export default function ConfigEjercicio() {
  // ── Estado y datos del store ─────────────────────────────────────────────────
  const { id, reId } = useLocalSearchParams<{ id: string; reId: string }>();
  const rutina = useStore((s) => s.rutinas.find((r) => r.id === id));
  const ejercicios = useStore((s) => s.ejercicios);
  const guardarRutina = useStore((s) => s.guardarRutina);

  // La ruta no trae el id del día: se busca el día que contiene este reId.
  const dia = rutina?.dias.find((d) => d.ejercicios.some((re) => re.id === reId));
  const re = dia?.ejercicios.find((x) => x.id === reId);
  // ex puede faltar si el ejercicio se borró de la biblioteca; la pantalla sigue funcionando sin él.
  const ex = ejercicios.find((e) => e.id === re?.exerciseId);

  // ── Guardia: el ejercicio ya no está ─────────────────────────────────────────
  if (!rutina || !dia || !re) {
    return (
      <Pantalla>
        <Cabecera titulo="Ejercicio" atras />
        <Vacio titulo="Este ejercicio ya no está en la rutina" />
      </Pantalla>
    );
  }

  // ── Helpers para guardar y quitar ────────────────────────────────────────────
  // Cambia etiquetas ("Segundos" en vez de "Repeticiones"), rangos y pasos, y esconde lo de carga.
  const esTiempo = ex?.tipoCarga === 'tiempo';
  // Mezcla los campos recibidos sobre este RoutineExercise y entrega la rutina completa al store.
  const patch = (p: Partial<RoutineExercise>) =>
    guardarRutina({
      ...rutina,
      dias: rutina.dias.map((d) =>
        d.id !== dia.id ? d : { ...d, ejercicios: d.ejercicios.map((x) => (x.id === re.id ? { ...x, ...p } : x)) },
      ),
    });
  const quitar = () => {
    // Primero la vuelta y recién después el cambio, para no ver "ya no está" durante la animación.
    // Los que quedan se renumeran para que `orden` siga siendo 0, 1, 2... sin huecos.
    const sinEste = {
      ...rutina,
      dias: rutina.dias.map((d) =>
        d.id !== dia.id
          ? d
          : { ...d, ejercicios: d.ejercicios.filter((x) => x.id !== re.id).map((x, i) => ({ ...x, orden: i })) },
      ),
    };
    router.back();
    InteractionManager.runAfterInteractions(() => {
      guardarRutina(sinEste);
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Pantalla>
      <Cabecera titulo={ex?.nombre ?? 'Ejercicio'} subtitulo={`${dia.nombre} · ${ex?.grupo ?? ''} · ${ex?.equipo ?? ''}`} atras />
      <Tarjeta className="gap-4">
        <Ajuste etiqueta="Series">
          <Stepper valor={re.series} onCambio={(v) => patch({ series: v })} min={1} max={10} />
        </Ajuste>
        {/* Mínimo y máximo se empujan entre sí para que nunca quede min > max.
            En ejercicios de tiempo son segundos: de 5 en 5 hasta 600. */}
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
        {/* RIR: repeticiones en reserva que debería dejar el alumno (0 es al fallo). */}
        <Ajuste etiqueta="RIR objetivo">
          <Stepper valor={re.rirObjetivo} onCambio={(v) => patch({ rirObjetivo: v })} min={0} max={5} />
        </Ajuste>
        {/* De 15 en 15 segundos; lo usa el temporizador de descanso de la sesión. */}
        <Ajuste etiqueta="Descanso">
          <Stepper valor={re.descansoS} onCambio={(v) => patch({ descansoS: v })} min={15} max={600} paso={15} formato={(v) => `${v} s`} />
        </Ajuste>
        {/* Sin carga no hay incremento ni peso inicial: en ejercicios de tiempo se esconden los dos. */}
        {!esTiempo ? (
          <Ajuste etiqueta="Incremento de carga">
            <Stepper valor={re.incrementoKg} onCambio={(v) => patch({ incrementoKg: v })} min={0} max={20} paso={0.5} formato={fmtKg} />
          </Ajuste>
        ) : null}
        {/* null se muestra como 0. `editable` deja tocar la cifra y escribirla; el paso sigue el
            incremento del ejercicio (2,5 si es 0). Tocar "+" o "-" con null lo deja definido. */}
        {!esTiempo ? (
          <View className="gap-2">
            <Ajuste etiqueta="Peso inicial">
              <Stepper
                editable
                valor={re.pesoInicialKg ?? 0}
                onCambio={(v) => patch({ pesoInicialKg: v })}
                min={0}
                max={500}
                paso={re.incrementoKg > 0 ? re.incrementoKg : 2.5}
              />
            </Ajuste>
            {re.pesoInicialKg == null ? (
              <Txt v="pequeno">Sin definir: la primera sesión parte de 0 y lo escribes ahí.</Txt>
            ) : (
              <Boton titulo="Quitar peso inicial" variante="fantasma" chico className="self-start" onPress={() => patch({ pesoInicialKg: null })} />
            )}
          </View>
        ) : null}
      </Tarjeta>

      {/* Guarda al perder el foco, no con cada tecla: el store se persiste completo en cada cambio. */}
      <CampoDiferido
        etiqueta="Nota para este ejercicio"
        className="mt-4"
        valor={re.nota ?? ''}
        onConfirmar={(t) => patch({ nota: t })}
        placeholder="Tempo, agarre, indicaciones"
        multiline
      />

      {/* "Listo" solo vuelve: todo quedó guardado con cada cambio. Quitar no pide confirmación
          porque el ejercicio sigue en la biblioteca y se puede volver a agregar. */}
      <Boton titulo="Listo" className="mt-6" onPress={() => router.back()} />
      <Boton titulo="Quitar de la rutina" variante="peligro" className="mt-2" onPress={quitar} />
    </Pantalla>
  );
}
