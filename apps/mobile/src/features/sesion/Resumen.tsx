// ─────────────────────────────────────────────────────────────────────────────
// Resumen · Zona: Sesión
//
// Qué hace: la pantalla de una sesión ya cerrada: series hechas, volumen, tiempo, calorías, los récords
// de hoy, la sugerencia para la próxima sesión por ejercicio, lo que se hizo y una observación general.
// Recién terminada muestra la celebración; abierta desde el historial, la cabecera normal con la fecha.
// Tócalo cuando: cambies qué se muestra al cerrar o cómo se leen los récords y las sugerencias.
// No lo toques para: calcular récords, volumen o sugerencias; eso ya viene calculado dentro de la sesión
// desde packages/shared/src/cierre.ts (calcularCierre). Esta pantalla solo lo muestra.
// Depende de: @gymtrack/shared (etiquetaMarca, fmtDuracion, fmtFecha, fmtMarca, fmtVolumen), @/components/ui,
// @/lib/formato (resumenSets), @/store/useStore (setObservacionSesion).
// ─────────────────────────────────────────────────────────────────────────────
import { etiquetaMarca, fmtDuracion, fmtFecha, fmtMarca, fmtVolumen, type WorkoutSession } from '@gymtrack/shared';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Boton, Cabecera, CampoDiferido, Dato, Fila, Pantalla, Separador, Tarjeta, Txt } from '@/components/ui';
import { resumenSets } from '@/lib/formato';
import { useStore } from '@/store/useStore';

/**
 * Resumen de una sesión cerrada.
 * Recibe la sesión (ya cerrada, con prs, sugerencias y totales llenos) y `celebrar`: true solo cuando se
 * cerró recién en esta misma pantalla (lo decide app/sesion/[id].tsx). Muestra la pantalla completa.
 */
export function Resumen({ sesion, celebrar }: { sesion: WorkoutSession; celebrar: boolean }) {
  // ── Store y totales ──────────────────────────────────────────────────────────
  const setObservacionSesion = useStore((s) => s.setObservacionSesion);
  // Una sesión cerrada siempre debería traer cerradaAt; el respaldo a iniciadaAt es por datos viejos.
  const cerradaAt = sesion.cerradaAt ?? sesion.iniciadaAt;
  // Al cerrar, calcularCierre ya descartó las series pendientes: esto cuenta solo las hechas.
  const series = sesion.ejercicios.reduce((a, e) => a + e.sets.length, 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Pantalla>
      {/* Arriba: celebración si se acaba de cerrar; si no, cabecera con fecha y botón de volver */}
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

      {/* Totales. Las kcal solo existen si el alumno tiene peso corporal en el perfil */}
      <View className="mt-2 flex-row gap-2">
        <Dato valor={fmtVolumen(sesion.volumenKg ?? 0)} etiqueta="volumen total" />
        <Dato valor={fmtDuracion(sesion.duracionS ?? 0)} etiqueta="tiempo" />
        {sesion.kcalEstimadas != null ? <Dato valor={String(sesion.kcalEstimadas)} etiqueta="kcal estimadas" /> : null}
      </View>

      {/* Récords: una fila por ejercicio y tipo de marca (1RM estimado, reps o segundos).
          La key combina ambos porque un ejercicio tiene a lo más un récord por tipo */}
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

      {/* Sugerencias que el motor dejó guardadas en la sesión; la bitácora las mostrará la próxima vez */}
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

      {/* Detalle por ejercicio: series en formato "60×8 · 60×8" más la observación que se anotó */}
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

      {/* dismissTo saca la sesión de la pila: al tocar atrás después no se vuelve al resumen */}
      <View className="mt-6 gap-2">
        <Boton titulo="Ver mi progreso" variante="acento" onPress={() => router.dismissTo('/progreso')} />
        <Boton titulo="Volver al inicio" variante="fantasma" onPress={() => router.dismissTo('/')} />
      </View>
    </Pantalla>
  );
}
