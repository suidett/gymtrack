import { etiquetaMarca, fmtFecha, fmtMarca, marcaVigente, sesionesCerradas, type Exercise } from '@gymtrack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { InteractionManager, Text, View } from 'react-native';
import { FormularioEjercicio } from '@/components/FormularioEjercicio';
import { Boton, Cabecera, Confirmar, Dato, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { resumenSets } from '@/lib/formato';
import { useStore } from '@/store/useStore';

const NOMBRE_PATRON: Record<Exercise['patron'], string> = {
  empuje: 'empuje',
  tiron: 'tirón',
  rodilla: 'rodilla',
  cadera: 'cadera',
  core: 'core',
  aislamiento: 'aislamiento',
};

export default function DetalleEjercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = useStore((s) => s.ejercicios.find((e) => e.id === id));
  const sesiones = useStore((s) => s.sesiones);
  const rutinas = useStore((s) => s.rutinas);
  const editarEjercicio = useStore((s) => s.editarEjercicio);
  const eliminarEjercicio = useStore((s) => s.eliminarEjercicio);
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const historial = useMemo(() => {
    if (!ex) return [];
    return sesionesCerradas(sesiones)
      .map((s) => ({ s, ej: s.ejercicios.find((e) => e.exerciseId === ex.id) }))
      .filter((x): x is { s: (typeof sesiones)[number]; ej: NonNullable<typeof x.ej> } => !!x.ej && x.ej.sets.length > 0)
      .slice(0, 12);
  }, [ex, sesiones]);
  const marca = useMemo(() => (ex ? marcaVigente(ex.id, ex.tipoCarga, sesiones) : null), [ex, sesiones]);

  if (!ex) {
    return (
      <Pantalla>
        <Cabecera titulo="Ejercicio" atras />
        <Vacio titulo="Este ejercicio ya no existe" />
      </Pantalla>
    );
  }

  if (editando) {
    return (
      <Pantalla>
        <Cabecera titulo="Editar ejercicio" atras />
        <FormularioEjercicio
          inicial={ex}
          textoGuardar="Guardar cambios"
          onGuardar={(d) => {
            editarEjercicio(ex.id, d);
            setEditando(false);
          }}
        />
        <Boton titulo="Cancelar" variante="fantasma" className="mt-3" onPress={() => setEditando(false)} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Cabecera titulo={ex.nombre} subtitulo={`${ex.grupo} · ${ex.equipo} · ${NOMBRE_PATRON[ex.patron]}`} atras />
      <View className="flex-row gap-2">
        <Dato valor={marca ? fmtMarca(marca) : '–'} etiqueta={marca ? `récord · ${etiquetaMarca(marca.tipo)}` : 'sin récord todavía'} />
        <Dato valor={String(historial.length)} etiqueta="sesiones registradas" />
      </View>

      {ex.instrucciones ? (
        <Tarjeta className="mt-4">
          <Txt v="etiqueta" className="mb-1">Instrucciones</Txt>
          <Txt>{ex.instrucciones}</Txt>
        </Tarjeta>
      ) : null}
      <Tarjeta className="mt-4">
        <Txt v="etiqueta" className="mb-1">Referencia</Txt>
        <Txt v="secundario">Los videos y fotos de referencia llegan en la siguiente fase. Por ahora, las instrucciones escritas.</Txt>
      </Tarjeta>

      <Separador titulo="Historial" />
      {historial.length === 0 ? (
        <Vacio titulo="Todavía no lo registras" texto="Cuando lo hagas en una sesión, cada serie queda aquí." />
      ) : (
        <Tarjeta className="py-1">
          {historial.map(({ s, ej }, i) => (
            <Fila
              key={s.id}
              ultimo={i === historial.length - 1}
              onPress={() => router.push(`/sesion/${s.id}`)}
              izquierda={
                <>
                  <Txt v="cuerpoMedio">
                    {fmtFecha(s.cerradaAt ?? s.iniciadaAt)} · {s.nombreDia}
                  </Txt>
                  <Txt v="mono" className="mt-0.5">{resumenSets(ej.sets, ej.tipoCarga)}</Txt>
                  {ej.observacion ? <Txt v="secundario" className="mt-0.5">{ej.observacion}</Txt> : null}
                </>
              }
            />
          ))}
        </Tarjeta>
      )}

      {ex.propio ? (
        <View className="mt-6 gap-2">
          <Boton titulo="Editar ejercicio" variante="secundario" onPress={() => setEditando(true)} />
          <Boton titulo="Eliminar ejercicio" variante="peligro" onPress={() => setConfirmar(true)} />
          {confirmar ? (
            <Confirmar
              pregunta="¿Eliminar este ejercicio de tu biblioteca?"
              si="Sí, eliminar"
              onSi={() => {
                // Se comprueba antes de borrar: si está en una rutina no se navega, se explica.
                const usado = rutinas.some((r) => r.dias.some((d) => d.ejercicios.some((re) => re.exerciseId === ex.id)));
                if (usado) {
                  setError('Está en una rutina (activa o archivada). Quítalo de la rutina primero.');
                  setConfirmar(false);
                  return;
                }
                // Primero la vuelta y recién después el borrado, para no ver "ya no existe" durante la animación.
                const id = ex.id;
                router.back();
                InteractionManager.runAfterInteractions(() => {
                  eliminarEjercicio(id);
                });
              }}
              onNo={() => setConfirmar(false)}
            />
          ) : null}
          {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
        </View>
      ) : (
        <Txt v="pequeno" className="mt-6">
          Ejercicio de la biblioteca base: no se edita. Si necesitas una variante, créala como ejercicio propio.
        </Txt>
      )}
    </Pantalla>
  );
}
