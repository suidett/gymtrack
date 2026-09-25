// ─────────────────────────────────────────────────────────────────────────────
// Bitácora · Zona: Sesión
//
// Qué hace: la pantalla donde el alumno registra la sesión en curso, ejercicio por ejercicio: la tabla de
// series (kilos, reps, RIR), el cronómetro, el descanso entre series, la sugerencia del día, cómo le fue la
// última vez y la observación por ejercicio. También decide cuándo la sesión se cierra o se descarta.
// Tócalo cuando: cambies el flujo de registrar una serie, el descanso, la navegación entre ejercicios o qué
// se confirma al salir o al terminar.
// No lo toques para: cómo se guarda una serie o qué heredan las siguientes (store/useStore.ts), qué se
// calcula al cerrar (packages/shared/src/cierre.ts), el texto de la sugerencia (packages/shared/src/progression.ts)
// ni el aspecto de cada fila (FilaActiva.tsx, FilaSet.tsx, PanelDescanso.tsx).
// Depende de: @gymtrack/shared (fmtDuracion, fmtHace, sesionesCerradas, sugerenciaVigente, ultimaVez),
// @/components/ui, @/lib/formato (resumenSets), @/store/useStore, ./FilaActiva, ./FilaSet, ./PanelDescanso,
// ./utilidades (KEEP_AWAKE_DESCANSO, ahoraMs, avisarFinDescanso).
// ─────────────────────────────────────────────────────────────────────────────
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

/**
 * Bitácora de la sesión en curso.
 * Recibe la sesión (estado 'en_curso') y `onCerrar`, que se llama justo antes de cerrarla en el store para
 * que la ruta sepa que fue recién ahora y muestre la celebración. Muestra la pantalla completa: cabecera y
 * pie fijos, y en medio la tabla de series con scroll.
 */
export function Bitacora({ sesion, onCerrar }: { sesion: WorkoutSession; onCerrar: () => void }) {
  // ── Store y navegación ───────────────────────────────────────────────────────
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  // Cada acción se toma por separado para que la pantalla no se re-renderice por cambios que no le importan.
  const sesiones = useStore((s) => s.sesiones);
  const actualizarSet = useStore((s) => s.actualizarSet);
  const marcarSet = useStore((s) => s.marcarSet);
  const agregarSet = useStore((s) => s.agregarSet);
  const quitarSet = useStore((s) => s.quitarSet);
  const setObservacionEjercicio = useStore((s) => s.setObservacionEjercicio);
  const cerrarSesion = useStore((s) => s.cerrarSesion);
  const descartarSesion = useStore((s) => s.descartarSesion);

  // ── Estado local ─────────────────────────────────────────────────────────────
  // Se retoma en el primer ejercicio con series pendientes, no siempre en el primero.
  const [idx, setIdx] = useState(() => {
    const n = sesion.ejercicios.findIndex((e) => e.sets.some((s) => !s.completada));
    return n < 0 ? Math.max(0, sesion.ejercicios.length - 1) : n;
  });
  // Serie ya hecha que el alumno tocó para corregirla; con null se edita la primera pendiente.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  // Reloj de la pantalla: avanza cada segundo con el intervalo de abajo y mueve el cronómetro y el descanso.
  const [ahora, setAhora] = useState(ahoraMs);
  // El descanso vive dos veces a propósito: el estado provoca el re-render (panel y barra) y el ref lo lee
  // el intervalo sin tener que reinstalarse cada vez que cambia. setDescanso mantiene los dos iguales;
  // usa siempre ese y no setDescansoEstado directo.
  const [descanso, setDescansoEstado] = useState<{ fin: number; total: number } | null>(null);
  const descansoRef = useRef<{ fin: number; total: number } | null>(null);
  // Qué pregunta en línea se está mostrando: salir con la sesión en curso, o descartar porque no se registró nada.
  const [confirmar, setConfirmar] = useState<null | 'salir' | 'vacia'>(null);
  // Bandera para que el listener de beforeRemove deje pasar la salida que ya se confirmó.
  const saliendo = useRef(false);

  const setDescanso = (d: { fin: number; total: number } | null) => {
    descansoRef.current = d;
    setDescansoEstado(d);
  };

  // ── Efectos: reloj, botón atrás y pantalla encendida ─────────────────────────
  // Un solo intervalo de 1 s para todo: actualiza el reloj y, si el descanso venció, lo apaga y avisa con
  // vibración. Se instala una vez (dependencias vacías); por eso lee el ref y no el estado.
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
      // preventDefault frena la navegación; si el alumno confirma, salirAhora levanta la bandera y vuelve a navegar.
      e.preventDefault();
      setConfirmar('salir');
    });
  }, [navigation]);

  // Con la pantalla apagada Android pausa los timers: mientras corre el descanso, se mantiene encendida.
  const hayDescanso = descanso !== null;
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (hayDescanso) {
      activateKeepAwakeAsync(KEEP_AWAKE_DESCANSO).catch(() => {});
      // Se apaga al terminar o saltar el descanso (cleanup), así no gasta batería el resto de la sesión.
      return () => {
        deactivateKeepAwake(KEEP_AWAKE_DESCANSO).catch(() => {});
      };
    }
    return undefined;
  }, [hayDescanso]);

  // ── Datos derivados ──────────────────────────────────────────────────────────
  const ejercicios = sesion.ejercicios;
  // Defensivo: si idx apuntara más allá de la lista, se queda en el último ejercicio.
  const i = Math.min(idx, Math.max(0, ejercicios.length - 1));
  const ej = ejercicios[i];
  // Solo las sesiones cerradas cuentan como historial: de ahí salen "última vez" y la sugerencia del día.
  const cerradas = useMemo(() => sesionesCerradas(sesiones), [sesiones]);
  const ultima = useMemo(() => (ej ? ultimaVez(ej.exerciseId, cerradas) : null), [ej, cerradas]);
  // La sugerencia se busca por routineExerciseId: un ejercicio agregado fuera de la rutina no tiene sugerencia.
  const sugerencia = useMemo(
    () => (ej?.routineExerciseId ? sugerenciaVigente(ej.routineExerciseId, cerradas) : null),
    [ej, cerradas],
  );

  // Segundos desde que empezó la sesión; se recalcula en cada render porque depende de `ahora`.
  const transcurrido = Math.floor((ahora - new Date(sesion.iniciadaAt).getTime()) / 1000);
  const totalHechas = ejercicios.reduce((a, e) => a + e.sets.filter((s) => s.completada).length, 0);
  const totalSeries = ejercicios.reduce((a, e) => a + e.sets.length, 0);

  // ── Salir de la pantalla ─────────────────────────────────────────────────────
  // Sale sin volver a preguntar: la bandera hace que beforeRemove no frene esta navegación.
  // dismissTo('/') cubre el caso de haber abierto la sesión desde un enlace, sin pantalla anterior.
  function salirAhora() {
    saliendo.current = true;
    if (router.canGoBack()) router.back();
    else router.dismissTo('/');
  }

  // ── Día sin ejercicios ───────────────────────────────────────────────────────
  // No hay nada que registrar: solo se ofrece descartar la sesión y volver.
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

  // ── Fila activa y valores de la tabla ────────────────────────────────────────
  // La fila activa es la que se está editando (si sigue existiendo) o, si no, la primera pendiente. Con todas
  // hechas no hay fila activa: la tabla queda de solo lectura hasta que el alumno toque una.
  const activaId =
    editandoId && ej.sets.some((s) => s.id === editandoId) ? editandoId : (ej.sets.find((s) => !s.completada)?.id ?? null);
  const esTiempo = ej.tipoCarga === 'tiempo';
  // Los ejercicios sin incremento (peso corporal, tiempo) igual aceptan lastre: 2,5 kg por toque.
  const pasoKg = ej.objetivo.incrementoKg > 0 ? ej.objetivo.incrementoKg : 2.5;
  const ultimoEjercicio = i === ejercicios.length - 1;
  const pctHechas = totalSeries ? Math.round((totalHechas / totalSeries) * 100) : 0;
  // La serie que viene después del descanso: la primera pendiente, sea o no la fila activa.
  const proxima = ej.sets.find((s) => !s.completada) ?? null;

  // ── Acciones sobre las series y el descanso ──────────────────────────────────
  // Cambiar de ejercicio suelta la serie en edición; el descanso, si está corriendo, sigue.
  function irA(n: number) {
    setIdx(n);
    setEditandoId(null);
  }
  // Marca la serie como hecha (fallo = true si no llegó a las reps). Si la serie ya estaba hecha, es una
  // corrección: se guarda y no arranca descanso ni háptico.
  function marcar(set: WorkoutSet, fallo: boolean) {
    const editando = set.completada;
    // Al editar una serie ya hecha se conserva su fallo, salvo que se marque "Fallé" de nuevo.
    marcarSet(sesion.id, ej!.id, set.id, editando && !fallo ? set.fallo : fallo);
    setEditandoId(null);
    if (editando) return;
    // El descanso solo arranca si queda algo por hacer: otra serie de este ejercicio o un ejercicio después.
    // Se mira `ej` antes de que el store actualice, por eso se excluye la serie recién marcada a mano.
    const quedan = ej!.sets.some((s) => !s.completada && s.id !== set.id);
    if (ej!.descansoS > 0 && (quedan || !ultimoEjercicio)) {
      const t0 = ahoraMs();
      setAhora(t0);
      setDescanso({ fin: t0 + ej!.descansoS * 1000, total: ej!.descansoS });
    }
    // Toque háptico de confirmación; en web no existe.
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
  // Corrige una serie marcada con fallo y la deja como hecha normal.
  function limpiarFallo(set: WorkoutSet) {
    marcarSet(sesion.id, ej!.id, set.id, false);
    setEditandoId(null);
  }
  // Suma 30 s al fin actual (o a "ahora" si por alguna razón ya venció). El total también sube 30 para que
  // la barra del panel no salte de golpe.
  function masDescanso() {
    const d = descansoRef.current;
    if (!d) return;
    const t0 = ahoraMs();
    setAhora(t0);
    setDescanso({ fin: Math.max(d.fin, t0) + 30_000, total: d.total + 30 });
  }
  // Sin series hechas no hay nada que cerrar: se ofrece descartar. Con series, onCerrar va ANTES de
  // cerrarSesion: así la ruta marca "recién cerrada" antes de que el store cambie el estado y aparezca el
  // Resumen con la celebración. Si se invierte el orden, el resumen sale sin celebrar.
  function terminar() {
    if (totalHechas === 0) {
      setConfirmar('vacia');
      return;
    }
    onCerrar();
    cerrarSesion(sesion.id);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {/* Cabecera fija: Salir, cronómetro, contador de ejercicios, flechas para moverse y barra de avance */}
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
        {/* Avance de la sesión completa (series hechas sobre el total de todos los ejercicios) */}
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-field">
          <View className="h-full rounded-full bg-primary" style={{ width: `${pctHechas}%` }} />
        </View>
      </View>

      {/* Cuerpo con scroll. pb-64 deja espacio para el pie fijo: sin eso el último campo quedaría tapado */}
      <ScrollView contentContainerClassName="px-5 pb-64 pt-4" keyboardShouldPersistTaps="handled">
        {/* Confirmaciones en línea (Alert con botones no funciona en web) */}
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

        {/* Lo que el motor de progresión sugirió al cerrar la sesión anterior de esta rutina */}
        {sugerencia ? (
          <Tarjeta tono="primario" className="mb-3">
            <Txt v="etiquetaPrimaria" className="mb-1">Objetivo de hoy</Txt>
            <Txt>{sugerencia.texto}</Txt>
          </Tarjeta>
        ) : null}

        {/* Tabla de series. Los anchos de las columnas tienen que calzar con FilaSet.tsx */}
        <Tarjeta className="py-2">
          <View className="flex-row px-1 pb-1">
            <Text className="w-12 font-mono text-[11px] uppercase tracking-widest text-ink-muted">serie</Text>
            <Text className="flex-1 font-mono text-[11px] uppercase tracking-widest text-ink-muted">kg</Text>
            <Text className="flex-1 font-mono text-[11px] uppercase tracking-widest text-ink-muted">{esTiempo ? 'seg' : 'reps'}</Text>
            <Text className="w-14 font-mono text-[11px] uppercase tracking-widest text-ink-muted">rir</Text>
            <View className="w-10" />
          </View>
          {/* La fila activa se edita en grande; el resto son filas de solo lectura que se pueden tocar.
              Solo se puede quitar la última serie, si está pendiente y no es la única del ejercicio */}
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

        {/* Referencia: las series completadas la última vez que se hizo este ejercicio, en cualquier rutina */}
        <View className="mt-3 flex-row items-start justify-between gap-3">
          <Txt v="etiqueta">Última vez</Txt>
          <Txt v="mono" className="flex-1 text-right">
            {ultima ? `${resumenSets(ultima.sets, ej.tipoCarga)} · ${fmtHace(ultima.fecha)}` : 'primera vez'}
          </Txt>
        </View>
        <Boton titulo="Añadir serie" variante="fantasma" chico className="mt-3 self-start" onPress={() => agregarSet(sesion.id, ej.id)} />

        {/* key={ej.id} reinicia el borrador al cambiar de ejercicio; sin eso el texto de uno se arrastraría al
            siguiente. Se guarda al perder el foco (CampoDiferido) */}
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

      {/* Pie fijo: el panel de descanso cuando corre, y el botón principal */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-line bg-surface px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {/* restante se recorta entre 0 y total: el intervalo puede pasarse unos ms del fin antes de apagarlo */}
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
        {/* En el último ejercicio el botón principal termina; antes, avanza. El enlace chico permite
            terminar antes de llegar al final (por ejemplo, si se acabó el tiempo) */}
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
