import {
  etiquetaMarca,
  fmtDuracion,
  fmtFecha,
  fmtHace,
  fmtMarca,
  fmtNum,
  fmtVolumen,
  sesionesCerradas,
  sugerenciaVigente,
  ultimaVez,
  type WorkoutSession,
  type WorkoutSet,
} from '@gymtrack/shared';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Boton,
  BotonRedondo,
  Cabecera,
  CampoDiferido,
  Confirmar,
  Dato,
  Fila,
  Pantalla,
  Separador,
  Stepper,
  Tarjeta,
  Txt,
  Vacio,
} from '@/components/ui';
import { resumenSets } from '@/lib/formato';
import { useStore } from '@/store/useStore';

export default function Sesion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sesion = useStore((s) => s.sesiones.find((x) => x.id === id));
  const [recienCerrada, setRecienCerrada] = useState(false);

  if (!sesion) {
    return (
      <Pantalla>
        <Cabecera titulo="Sesión" atras />
        <Vacio titulo="Esta sesión ya no existe" accion="Volver al inicio" onAccion={() => router.dismissTo('/')} />
      </Pantalla>
    );
  }
  if (sesion.estado === 'cerrada') return <Resumen sesion={sesion} celebrar={recienCerrada} />;
  return <Bitacora sesion={sesion} onCerrar={() => setRecienCerrada(true)} />;
}

/** Envuelto fuera del componente: la regla de pureza del compilador de React no admite Date.now() en el cuerpo. */
function ahoraMs(): number {
  return Date.now();
}

const KEEP_AWAKE_DESCANSO = 'gymtrack-descanso';

function avisarFinDescanso() {
  if (Platform.OS === 'web') return;
  Vibration.vibrate([0, 300, 150, 300]);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// ---------------------------------------------------------------- Bitácora

function Bitacora({ sesion, onCerrar }: { sesion: WorkoutSession; onCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const sesiones = useStore((s) => s.sesiones);
  const actualizarSet = useStore((s) => s.actualizarSet);
  const marcarSet = useStore((s) => s.marcarSet);
  const agregarSet = useStore((s) => s.agregarSet);
  const quitarSet = useStore((s) => s.quitarSet);
  const setObservacionEjercicio = useStore((s) => s.setObservacionEjercicio);
  const cerrarSesion = useStore((s) => s.cerrarSesion);
  const descartarSesion = useStore((s) => s.descartarSesion);

  // Se retoma en el primer ejercicio con series pendientes, no siempre en el primero.
  const [idx, setIdx] = useState(() => {
    const n = sesion.ejercicios.findIndex((e) => e.sets.some((s) => !s.completada));
    return n < 0 ? Math.max(0, sesion.ejercicios.length - 1) : n;
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [ahora, setAhora] = useState(ahoraMs);
  const [descanso, setDescansoEstado] = useState<{ fin: number; total: number } | null>(null);
  const descansoRef = useRef<{ fin: number; total: number } | null>(null);
  const [confirmar, setConfirmar] = useState<null | 'salir' | 'vacia'>(null);
  const saliendo = useRef(false);

  const setDescanso = (d: { fin: number; total: number } | null) => {
    descansoRef.current = d;
    setDescansoEstado(d);
  };

  useEffect(() => {
    const t = setInterval(() => {
      const t0 = ahoraMs();
      setAhora(t0);
      const d = descansoRef.current;
      if (d && t0 >= d.fin) {
        descansoRef.current = null;
        setDescansoEstado(null);
        avisarFinDescanso();
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // El botón atrás de Android (y el gesto de iOS) pasan por la misma confirmación que "Salir".
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (saliendo.current) return;
      e.preventDefault();
      setConfirmar('salir');
    });
  }, [navigation]);

  // Con la pantalla apagada Android pausa los timers: mientras corre el descanso, se mantiene encendida.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (descanso) {
      activateKeepAwakeAsync(KEEP_AWAKE_DESCANSO).catch(() => {});
      return () => {
        deactivateKeepAwake(KEEP_AWAKE_DESCANSO).catch(() => {});
      };
    }
    return undefined;
  }, [descanso]);

  const ejercicios = sesion.ejercicios;
  const i = Math.min(idx, Math.max(0, ejercicios.length - 1));
  const ej = ejercicios[i];
  const cerradas = useMemo(() => sesionesCerradas(sesiones), [sesiones]);
  const ultima = useMemo(() => (ej ? ultimaVez(ej.exerciseId, cerradas) : null), [ej, cerradas]);
  const sugerencia = useMemo(
    () => (ej?.routineExerciseId ? sugerenciaVigente(ej.routineExerciseId, cerradas) : null),
    [ej, cerradas],
  );

  const transcurrido = Math.floor((ahora - new Date(sesion.iniciadaAt).getTime()) / 1000);
  const totalHechas = ejercicios.reduce((a, e) => a + e.sets.filter((s) => s.completada).length, 0);
  const totalSeries = ejercicios.reduce((a, e) => a + e.sets.length, 0);

  function salirAhora() {
    saliendo.current = true;
    if (router.canGoBack()) router.back();
    else router.dismissTo('/');
  }

  if (!ej) {
    return (
      <Pantalla>
        <Cabecera titulo={sesion.nombreDia} atras />
        <Vacio
          titulo="Este día no tiene ejercicios"
          texto="Agrégalos en la rutina y vuelve a empezar."
          accion="Descartar sesión"
          onAccion={() => {
            descartarSesion(sesion.id);
            salirAhora();
          }}
        />
      </Pantalla>
    );
  }

  const activaId =
    editandoId && ej.sets.some((s) => s.id === editandoId) ? editandoId : (ej.sets.find((s) => !s.completada)?.id ?? null);
  const esTiempo = ej.tipoCarga === 'tiempo';
  const pasoKg = ej.objetivo.incrementoKg > 0 ? ej.objetivo.incrementoKg : 2.5;
  const ultimoEjercicio = i === ejercicios.length - 1;
  const pctHechas = totalSeries ? Math.round((totalHechas / totalSeries) * 100) : 0;
  // La serie que viene después del descanso: la primera pendiente, sea o no la fila activa.
  const proxima = ej.sets.find((s) => !s.completada) ?? null;

  function irA(n: number) {
    setIdx(n);
    setEditandoId(null);
  }
  function marcar(set: WorkoutSet, fallo: boolean) {
    const editando = set.completada;
    // Al editar una serie ya hecha se conserva su fallo, salvo que se marque "Fallé" de nuevo.
    marcarSet(sesion.id, ej!.id, set.id, editando && !fallo ? set.fallo : fallo);
    setEditandoId(null);
    if (editando) return;
    const quedan = ej!.sets.some((s) => !s.completada && s.id !== set.id);
    if (ej!.descansoS > 0 && (quedan || !ultimoEjercicio)) {
      const t0 = ahoraMs();
      setAhora(t0);
      setDescanso({ fin: t0 + ej!.descansoS * 1000, total: ej!.descansoS });
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
  function limpiarFallo(set: WorkoutSet) {
    marcarSet(sesion.id, ej!.id, set.id, false);
    setEditandoId(null);
  }
  function masDescanso() {
    const d = descansoRef.current;
    if (!d) return;
    const t0 = ahoraMs();
    setAhora(t0);
    setDescanso({ fin: Math.max(d.fin, t0) + 30_000, total: d.total + 30 });
  }
  function terminar() {
    if (totalHechas === 0) {
      setConfirmar('vacia');
      return;
    }
    onCerrar();
    cerrarSesion(sesion.id);
  }

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="border-b border-line bg-surface px-5 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setConfirmar('salir')} className="rounded-full border border-line px-3 py-1.5 active:opacity-70">
            <Text className="font-sans-semibold text-xs text-ink-muted">Salir</Text>
          </Pressable>
          <Text className="font-mono-medium text-sm text-ink">{fmtDuracion(transcurrido)}</Text>
          <Text className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
            Ejercicio {i + 1} de {ejercicios.length}
          </Text>
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <BotonRedondo glifo="‹" etiqueta="ejercicio anterior" disabled={i === 0} onPress={() => irA(i - 1)} />
          <View className="flex-1">
            <Txt v="h2" numberOfLines={2}>{ej.nombre}</Txt>
            <Txt v="secundario">
              Objetivo {ej.objetivo.series} × {ej.objetivo.repsMin} a {ej.objetivo.repsMax}
              {esTiempo ? ' s' : ''} · RIR {ej.objetivo.rirObjetivo}
            </Txt>
          </View>
          <BotonRedondo glifo="›" etiqueta="ejercicio siguiente" disabled={ultimoEjercicio} onPress={() => irA(i + 1)} />
        </View>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-field">
          <View className="h-full rounded-full bg-primary" style={{ width: `${pctHechas}%` }} />
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-64 pt-4" keyboardShouldPersistTaps="handled">
        {confirmar === 'salir' ? (
          <View className="mb-3">
            <Confirmar
              peligro={false}
              pregunta="La sesión queda guardada en curso. La retomas desde Hoy."
              si="Salir"
              onSi={salirAhora}
              onNo={() => setConfirmar(null)}
            />
          </View>
        ) : null}
        {confirmar === 'vacia' ? (
          <View className="mb-3">
            <Confirmar
              pregunta="No registraste ninguna serie. ¿Descartar la sesión?"
              si="Sí, descartar"
              onSi={() => {
                descartarSesion(sesion.id);
                salirAhora();
              }}
              onNo={() => setConfirmar(null)}
            />
          </View>
        ) : null}

        {sugerencia ? (
          <Tarjeta tono="primario" className="mb-3">
            <Txt v="etiquetaPrimaria" className="mb-1">Objetivo de hoy</Txt>
            <Txt>{sugerencia.texto}</Txt>
          </Tarjeta>
        ) : null}

        <Tarjeta className="py-2">
          <View className="flex-row px-1 pb-1">
            <Text className="w-12 font-mono text-[11px] uppercase tracking-widest text-ink-muted">serie</Text>
            <Text className="flex-1 font-mono text-[11px] uppercase tracking-widest text-ink-muted">kg</Text>
            <Text className="flex-1 font-mono text-[11px] uppercase tracking-widest text-ink-muted">{esTiempo ? 'seg' : 'reps'}</Text>
            <Text className="w-14 font-mono text-[11px] uppercase tracking-widest text-ink-muted">rir</Text>
            <View className="w-10" />
          </View>
          {ej.sets.map((s) =>
            s.id === activaId ? (
              <FilaActiva
                key={s.id}
                set={s}
                esTiempo={esTiempo}
                pasoKg={pasoKg}
                onCambio={(p) => actualizarSet(sesion.id, ej.id, s.id, p)}
                onMarcar={() => marcar(s, false)}
                onFallo={() => marcar(s, true)}
                onLimpiarFallo={() => limpiarFallo(s)}
              />
            ) : (
              <FilaSet
                key={s.id}
                set={s}
                onPress={() => setEditandoId(s.id)}
                onQuitar={
                  !s.completada && s.serieN === ej.sets.length && ej.sets.length > 1
                    ? () => quitarSet(sesion.id, ej.id, s.id)
                    : undefined
                }
              />
            ),
          )}
        </Tarjeta>

        <View className="mt-3 flex-row items-start justify-between gap-3">
          <Txt v="etiqueta">Última vez</Txt>
          <Txt v="mono" className="flex-1 text-right">
            {ultima ? `${resumenSets(ultima.sets, ej.tipoCarga)} · ${fmtHace(ultima.fecha)}` : 'primera vez'}
          </Txt>
        </View>
        <Boton titulo="Añadir serie" variante="fantasma" chico className="mt-3 self-start" onPress={() => agregarSet(sesion.id, ej.id)} />

        <CampoDiferido
          key={ej.id}
          etiqueta="Observación o dolor en este ejercicio"
          className="mt-5"
          valor={ej.observacion}
          onConfirmar={(t) => setObservacionEjercicio(sesion.id, ej.id, t)}
          placeholder="Por ejemplo, molestia en el hombro derecho en la tercera serie"
          multiline
        />
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {descanso ? (
          <PanelDescanso
            restante={Math.min(descanso.total, Math.max(0, Math.ceil((descanso.fin - ahora) / 1000)))}
            total={descanso.total}
            siguiente={
              proxima
                ? `Siguiente: serie ${proxima.serieN} · ${ej.nombre}`
                : ultimoEjercicio
                  ? 'Última serie hecha'
                  : `Siguiente: ${ejercicios[i + 1]?.nombre ?? ''}`
            }
            onMas={masDescanso}
            onSaltar={() => setDescanso(null)}
          />
        ) : null}
        <Boton titulo={ultimoEjercicio ? 'Terminar rutina' : 'Siguiente ejercicio'} onPress={() => (ultimoEjercicio ? terminar() : irA(i + 1))} />
        {!ultimoEjercicio ? (
          <Pressable onPress={terminar} className="mt-2 items-center py-1 active:opacity-70">
            <Text className="font-sans-semibold text-xs text-ink-muted">Terminar la rutina ahora</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function FilaActiva({
  set,
  esTiempo,
  pasoKg,
  onCambio,
  onMarcar,
  onFallo,
  onLimpiarFallo,
}: {
  set: WorkoutSet;
  esTiempo: boolean;
  pasoKg: number;
  onCambio: (p: Partial<WorkoutSet>) => void;
  onMarcar: () => void;
  onFallo: () => void;
  onLimpiarFallo: () => void;
}) {
  return (
    <View className="my-1 rounded-card border border-primary bg-primary-soft p-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-primary-deep">
          Serie {set.serieN}
          {set.completada ? ' · editando' : ''}
        </Text>
        {set.completada ? (
          <Text className="font-sans-semibold text-xs text-primary-deep">{set.fallo ? 'hecha con fallo' : 'hecha'}</Text>
        ) : null}
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-mono text-xs text-ink-muted">{esTiempo ? 'kg (lastre)' : 'kg'}</Text>
        <Stepper grande editable valor={set.pesoKg} onCambio={(v) => onCambio({ pesoKg: v })} paso={pasoKg} min={0} max={999} formato={(v) => fmtNum(v)} />
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-mono text-xs text-ink-muted">{esTiempo ? 'segundos' : 'reps'}</Text>
        <Stepper grande editable valor={set.reps} onCambio={(v) => onCambio({ reps: Math.round(v) })} paso={esTiempo ? 5 : 1} min={0} max={999} />
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <Text className="w-12 font-mono text-xs text-ink-muted">RIR</Text>
        {[0, 1, 2, 3, 4].map((r) => (
          <Pressable
            key={r}
            accessibilityLabel={`RIR ${r}`}
            onPress={() => onCambio({ rir: set.rir === r ? null : r })}
            className={`h-9 w-9 items-center justify-center rounded-full ${set.rir === r ? 'bg-primary' : 'border border-line bg-white'}`}
          >
            <Text className={`font-mono-semibold text-sm ${set.rir === r ? 'text-white' : 'text-ink'}`}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mt-3 flex-row gap-2">
        <Boton titulo={set.completada ? 'Guardar cambios' : 'Serie hecha'} className="flex-1" onPress={onMarcar} />
        {set.completada && set.fallo ? (
          <Boton titulo="Sin fallo" variante="secundario" onPress={onLimpiarFallo} />
        ) : (
          <Boton titulo="Fallé" variante="peligro" onPress={onFallo} />
        )}
      </View>
    </View>
  );
}

function FilaSet({ set, onPress, onQuitar }: { set: WorkoutSet; onPress: () => void; onQuitar?: () => void }) {
  const hecha = set.completada;
  const color = hecha ? 'text-ink' : 'text-ink-faint';
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`editar serie ${set.serieN}`}
      className="flex-row items-center border-t border-line px-1 py-2.5 active:opacity-70"
    >
      <Text className={`w-12 font-mono text-sm ${color}`}>{set.serieN}</Text>
      <Text className={`flex-1 font-mono-medium text-base ${color}`}>{fmtNum(set.pesoKg)}</Text>
      <Text className={`flex-1 font-mono-medium text-base ${color}`}>{set.reps}</Text>
      <Text className={`w-14 font-mono text-sm ${color}`}>{set.rir ?? '–'}</Text>
      <View className="w-10 items-end">
        {hecha ? (
          <View className={`h-7 w-7 items-center justify-center rounded-full ${set.fallo ? 'bg-danger-soft' : 'bg-primary'}`}>
            <Text className={`font-sans-bold text-xs ${set.fallo ? 'text-danger' : 'text-white'}`}>{set.fallo ? '!' : '✓'}</Text>
          </View>
        ) : onQuitar ? (
          <Pressable onPress={onQuitar} hitSlop={8} accessibilityLabel="quitar serie" className="h-7 w-7 items-center justify-center rounded-full bg-field">
            <Text className="font-sans-bold text-xs text-ink-muted">×</Text>
          </Pressable>
        ) : (
          <View className="h-7 w-7 rounded-full border border-line" />
        )}
      </View>
    </Pressable>
  );
}

function PanelDescanso({
  restante,
  total,
  siguiente,
  onMas,
  onSaltar,
}: {
  restante: number;
  total: number;
  siguiente: string;
  onMas: () => void;
  onSaltar: () => void;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((restante / total) * 100)) : 0;
  return (
    <View className="mb-3 rounded-card bg-accent-soft p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text className="font-mono text-[11px] uppercase tracking-widest text-accent-deep">Descanso</Text>
          <Text className="font-mono-semibold text-4xl text-accent-deep">{fmtDuracion(restante)}</Text>
        </View>
        <View className="gap-2">
          <Boton titulo="+30 s" variante="fantasma" chico onPress={onMas} />
          <Boton titulo="Saltar" variante="acento" chico onPress={onSaltar} />
        </View>
      </View>
      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/60">
        <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-2 font-sans text-xs text-accent-deep">{siguiente}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Resumen

function Resumen({ sesion, celebrar }: { sesion: WorkoutSession; celebrar: boolean }) {
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
