import { fmtDuracion, fmtHace, sesionesCerradas, sugerenciaVigente, ultimaVez, type WorkoutSession, type WorkoutSet } from '@gymtrack/shared';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, BotonRedondo, Cabecera, CampoDiferido, Confirmar, Pantalla, Tarjeta, Txt, Vacio } from '@/components/ui';
import { resumenSets } from '@/lib/formato';
import { useStore } from '@/store/useStore';
import { FilaActiva } from './FilaActiva';
import { FilaSet } from './FilaSet';
import { PanelDescanso } from './PanelDescanso';
import { KEEP_AWAKE_DESCANSO, ahoraMs, avisarFinDescanso } from './utilidades';

export function Bitacora({ sesion, onCerrar }: { sesion: WorkoutSession; onCerrar: () => void }) {
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
