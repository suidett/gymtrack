import { etiquetaMarca, fmtDuracion, fmtFecha, fmtMarca, fmtVolumen, type WorkoutSession } from '@gymtrack/shared';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Boton, Cabecera, CampoDiferido, Dato, Fila, Pantalla, Separador, Tarjeta, Txt } from '@/components/ui';
import { resumenSets } from '@/lib/formato';
import { useStore } from '@/store/useStore';

export function Resumen({ sesion, celebrar }: { sesion: WorkoutSession; celebrar: boolean }) {
  const setObservacionSesion = useStore((s) => s.setObservacionSesion);
  const cerradaAt = sesion.cerradaAt ?? sesion.iniciadaAt;
  const series = sesion.ejercicios.reduce((a, e) => a + e.sets.length, 0);

  return (
    <Pantalla>
      {celebrar ? (
        <View className="items-center gap-1 py-3">
          <Text className="font-mono text-[11px] uppercase tracking-widest text-accent">Felicidades</Text>
          <Txt v="titulo">Rutina completada</Txt>
          <Txt v="secundario">Terminaste {sesion.nombreDia}.</Txt>
        </View>
      ) : (
        <Cabecera titulo={sesion.nombreDia} subtitulo={fmtFecha(cerradaAt, 'larga')} atras />
      )}

      <View className="items-center py-2">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-accent-soft">
          <Text className="font-mono-semibold text-3xl text-accent-deep">{series}</Text>
          <Text className="font-sans text-xs text-accent-deep">series</Text>
        </View>
      </View>

      <View className="mt-2 flex-row gap-2">
        <Dato valor={fmtVolumen(sesion.volumenKg ?? 0)} etiqueta="volumen total" />
        <Dato valor={fmtDuracion(sesion.duracionS ?? 0)} etiqueta="tiempo" />
        {sesion.kcalEstimadas != null ? <Dato valor={String(sesion.kcalEstimadas)} etiqueta="kcal estimadas" /> : null}
      </View>

      {sesion.prs.length > 0 ? (
        <>
          <Separador titulo="Récords de hoy" />
          <Tarjeta className="py-1">
            {sesion.prs.map((pr, i) => (
              <Fila
                key={`${pr.exerciseId}-${pr.tipo}`}
                ultimo={i === sesion.prs.length - 1}
                izquierda={
                  <>
                    <Txt v="cuerpoMedio">{pr.nombre}</Txt>
                    <Txt v="secundario">
                      {etiquetaMarca(pr.tipo)}
                      {pr.anterior != null ? ` · antes ${fmtMarca({ tipo: pr.tipo, valor: pr.anterior })}` : ' · primer récord'}
                    </Txt>
                  </>
                }
                derecha={<Text className="font-mono-semibold text-base text-accent-deep">{fmtMarca(pr)}</Text>}
              />
            ))}
          </Tarjeta>
        </>
      ) : null}

      {sesion.sugerencias.length > 0 ? (
        <>
          <Separador titulo="Para la próxima sesión" />
          {sesion.sugerencias.map((s) => (
            <Tarjeta key={s.routineExerciseId} className="mb-2">
              <Txt v="h3">{s.nombre}</Txt>
              <Txt v="secundario" className="mt-1">{s.texto}</Txt>
            </Tarjeta>
          ))}
        </>
      ) : null}

      <Separador titulo="Lo que hiciste" />
      <Tarjeta className="py-1">
        {sesion.ejercicios.map((e, i) => (
          <Fila
            key={e.id}
            ultimo={i === sesion.ejercicios.length - 1}
            izquierda={
              <>
                <Txt v="cuerpoMedio">{e.nombre}</Txt>
                <Txt v="mono" className="mt-0.5">{e.sets.length ? resumenSets(e.sets, e.tipoCarga) : 'sin series'}</Txt>
                {e.observacion ? <Txt v="secundario" className="mt-0.5">{e.observacion}</Txt> : null}
              </>
            }
          />
        ))}
      </Tarjeta>

      <CampoDiferido
        etiqueta="Observación de la sesión"
        className="mt-5"
        valor={sesion.observacion}
        onConfirmar={(t) => setObservacionSesion(sesion.id, t)}
        placeholder="Cómo te sentiste, qué cambiarías"
        multiline
      />

      <View className="mt-6 gap-2">
        <Boton titulo="Ver mi progreso" variante="acento" onPress={() => router.dismissTo('/progreso')} />
        <Boton titulo="Volver al inicio" variante="fantasma" onPress={() => router.dismissTo('/')} />
      </View>
    </Pantalla>
  );
}
