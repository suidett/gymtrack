// ─────────────────────────────────────────────────────────────────────────────
// Registro de sesión y descanso · Zona: Entrenar
//
// Qué hace: las pantallas 11 y 12 (registro.html). Arriba: salir (la sesión queda en curso), el
// nombre del día con el reloj y Terminar. Al medio: «Ejercicio n de m» con flechas, el avance,
// nombre, grupo y objetivo, la última vez y lo de hoy, las series (la activa con más y menos de
// 56 dp para kilos y repeticiones y la fila de RIR), Añadir serie y Dolor u observación. Abajo:
// Fallé y Serie hecha, o Siguiente ejercicio, o Terminar sesión. Al marcar sube la capa de
// descanso con la cuenta regresiva, +30 s, Saltar y Deshacer; al llegar a 0 vibra.
// Todo se escribe primero en el teléfono; las series salen después por la cola (APP-026).
// Tócalo cuando: cambie cómo se ve o se usa el registro.
// No lo toques para: las reglas (sesionLocal.ts) ni el envío (almacen.ts, cola.ts).
// Depende de: @/components/ui, @/lib/sesion, @/lib/tema, ./almacen, ./sesionLocal, ./formato,
// ./HojaObservacion y features/sesion/utilidades (la vibración de fin de descanso).
// ─────────────────────────────────────────────────────────────────────────────
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, BotonIcono, Ceja, Chip, Hoja, Icono, Paso, Titulo, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { avisarFinDescanso } from '@/features/sesion/utilidades';
import { sincronizar, useDatosEntrenar, useEntrenar } from './almacen';
import { textoUltima } from './contrato';
import { ahora, cifra, fechaCorta, reloj, textoRir } from './formato';
import { HojaObservacion } from './HojaObservacion';
import { nuevoId } from './ids';
import type { EjercicioLocal, SerieLocal, SesionLocal } from './modelo';
import * as S from './sesionLocal';
import { useSincronizar } from './useSincronizar';

const LLAVE_DESPIERTO = 'gymtrack-registro';

interface Descanso {
  finMs: number;
  totalS: number;
}

export function PantallaRegistro({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();
  const uid = usuario?.id ?? null;
  const datos = useDatosEntrenar(uid);
  const hidratado = useEntrenar((s) => s.hidratado);
  const sesion = datos.sesion?.id === id ? datos.sesion : null;
  useSincronizar(uid);

  useEffect(() => {
    activateKeepAwakeAsync(LLAVE_DESPIERTO).catch(() => {});
    return () => {
      deactivateKeepAwake(LLAVE_DESPIERTO).catch(() => {});
    };
  }, []);

  // Si esta sesión ya se cerró, lo que corresponde es su resumen.
  const cerrada = !!datos.cierres[id];
  useEffect(() => {
    if (hidratado && !sesion && cerrada) router.replace({ pathname: '/sesion/[id]/completada', params: { id } });
  }, [hidratado, sesion, cerrada, id]);

  if (!sesion || !uid) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-fondo px-4" style={{ paddingTop: insets.top }}>
        <Txt v="h3">{hidratado ? 'Esta sesión ya no está en curso' : 'Cargando la sesión…'}</Txt>
        {hidratado ? <Boton titulo="Volver a Hoy" variante="secundario" onPress={() => router.dismissTo('/')} /> : null}
      </View>
    );
  }
  return <Registro uid={uid} sesion={sesion} />;
}

function Registro({ uid, sesion }: { uid: string; sesion: SesionLocal }) {
  const insets = useSafeAreaInsets();
  const aviso = useAviso();
  const [momento, setMomento] = useState(ahora);
  const [descanso, setDescansoEstado] = useState<Descanso | null>(null);
  // El fin del descanso también vive en una ref, para que el reloj lo lea sin depender del estado.
  const finDescanso = useRef<number | null>(null);
  const setDescanso = (d: Descanso | null) => {
    finDescanso.current = d?.finMs ?? null;
    setDescansoEstado(d);
  };
  const [ultima, setUltima] = useState<S.RefSerie | null>(null);
  const [hojaTerminar, setHojaTerminar] = useState(false);
  const [hojaObs, setHojaObs] = useState(false);

  const cambiar = (fn: (s: SesionLocal) => SesionLocal, encolar = false) => useEntrenar.getState().cambiarSesion(uid, fn, encolar);

  // Un solo reloj por segundo: el transcurrido y la cuenta del descanso.
  useEffect(() => {
    const t = setInterval(() => {
      const ms = ahora();
      setMomento(ms);
      if (finDescanso.current !== null && ms >= finDescanso.current) {
        finDescanso.current = null;
        setDescansoEstado(null);
        avisarFinDescanso();
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const e = S.ejercicioActual(sesion);
  const ai = S.indiceActiva(e);
  const sig = S.siguientePendiente(sesion);
  const activa = e && ai !== -1 ? (e.series[ai] as SerieLocal) : null;

  function marcar(fallo: boolean) {
    const r = S.marcar(sesion, fallo, ahora());
    if (!r.marcada) return;
    cambiar(() => r.sesion, true);
    setUltima({ ej: r.marcada.ej, i: r.marcada.i });
    setDescanso(r.descansoS ? { finMs: ahora() + r.descansoS * 1000, totalS: r.descansoS } : null);
    if (fallo) aviso.mostrar(`Serie ${r.marcada.i + 1} guardada como fallida, con ${r.marcada.serie.reps} repeticiones.`);
  }
  function deshacer() {
    if (!ultima) return;
    const n = ultima.i + 1;
    cambiar((s) => S.deshacer(s, ultima), true);
    setUltima(null);
    setDescanso(null);
    aviso.mostrar(`Serie ${n} desmarcada.`);
  }
  function irA(j: number) {
    cambiar((s) => S.irA(s, j));
    setDescanso(null);
  }
  function anadir() {
    const n = (e?.series.length ?? 0) + 1;
    cambiar((s) => S.anadirSerie(s, nuevoId()));
    aviso.mostrar(`Agregaste la serie ${n}.`);
  }
  function terminar() {
    setHojaTerminar(false);
    // Al cerrarla, la sesión deja de estar en curso y PantallaRegistro lleva sola al resumen.
    const id = useEntrenar.getState().terminar(uid);
    if (id) void sincronizar(uid).catch(() => null);
  }

  const transcurrido = Math.max(0, Math.floor((momento - sesion.iniciada_ms) / 1000));
  const resta = descanso ? Math.max(0, Math.ceil((descanso.finMs - momento) / 1000)) : 0;

  return (
    <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      {/* Barra superior */}
      <View className="h-14 flex-row items-center justify-between px-1">
        <BotonIcono icono="cerrar" etiqueta="Salir; la sesión queda en curso" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View className="items-center gap-0.5">
          <Ceja className="text-[12px]">{sesion.nombre_dia}</Ceja>
          <Text className="font-mono-bold text-[17px] text-texto" style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={`Tiempo de sesión ${reloj(transcurrido)}`}>
            {reloj(transcurrido)}
          </Text>
        </View>
        <Boton titulo="Terminar" variante="fantasma" onPress={() => setHojaTerminar(true)} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6" contentContainerStyle={{ paddingBottom: descanso ? 300 : 24 }} showsVerticalScrollIndicator={false}>
        {e ? (
          <CabezaEjercicio sesion={sesion} e={e} onAnterior={() => irA(sesion.ejercicio_actual - 1)} onSiguiente={() => irA(sesion.ejercicio_actual + 1)} />
        ) : null}

        <View className="mt-4 gap-2">
          {e?.series.map((s, i) =>
            i === ai ? (
              <SerieActiva key={s.id} serie={s} n={i + 1} e={e} onCambiar={(c) => cambiar((x) => S.cambiarActiva(x, c))} />
            ) : (
              <FilaSerie key={s.id} serie={s} n={i + 1} e={e} />
            ),
          )}
        </View>

        {e && ai === -1 ? (
          <View className="mt-4 rounded-control bg-fila-hecha p-4">
            <Ceja>Ejercicio terminado</Ceja>
            <Txt v="h3" className="mt-1">
              {sig === -1 ? 'Marcaste todas las series de hoy' : `Sigue ${sesion.ejercicios[sig]?.nombre ?? ''}`}
            </Txt>
          </View>
        ) : null}

        <View className="-mx-3 mt-2 flex-row justify-between">
          <Boton titulo="Añadir serie" variante="fantasma" onPress={anadir} />
          <Boton titulo="Dolor u observación" variante="fantasma" onPress={() => setHojaObs(true)} />
        </View>
      </ScrollView>

      {/* Pie: la acción principal al alcance del pulgar */}
      <View className="border-t border-sup-alta bg-fondo px-4 pt-3" style={{ paddingBottom: 12 + insets.bottom }}>
        {activa ? (
          <View className="flex-row gap-2">
            <View className="w-[112px]">
              <Boton titulo="Fallé" variante="secundario" alto ancho accessibilityLabel="Fallé la serie" onPress={() => marcar(true)} />
            </View>
            <View className="flex-1">
              <Boton titulo="Serie hecha" alto ancho onPress={() => marcar(false)} />
            </View>
          </View>
        ) : sig !== -1 ? (
          <Boton titulo="Siguiente ejercicio" alto ancho onPress={() => irA(sig)} />
        ) : (
          <Boton titulo="Terminar sesión" alto ancho onPress={() => setHojaTerminar(true)} />
        )}
      </View>

      {descanso ? (
        <CapaDescanso
          resta={resta}
          total={descanso.totalS}
          sigue={S.textoSigue(sesion)}
          deshacerN={ultima ? ultima.i + 1 : null}
          abajo={insets.bottom}
          onMas30={() => setDescanso({ finMs: descanso.finMs + 30_000, totalS: descanso.totalS + 30 })}
          onSaltar={() => setDescanso(null)}
          onDeshacer={deshacer}
        />
      ) : null}

      <Hoja
        visible={hojaTerminar}
        onCerrar={() => setHojaTerminar(false)}
        titulo="¿Terminar la sesión?"
        texto={S.textoQuedan(sesion)}
        acciones={
          <>
            <Boton titulo="Seguir entrenando" variante="secundario" alto className="flex-1" onPress={() => setHojaTerminar(false)} />
            <Boton titulo="Terminar" alto className="flex-1" onPress={terminar} />
          </>
        }
      />
      <HojaObservacion
        visible={hojaObs}
        titulo={`Anotar en ${e?.nombre ?? sesion.nombre_dia}`}
        nota={sesion.entrenador_nombre ? `${sesion.entrenador_nombre} la ve en tu ficha y te puede responder.` : null}
        entrenador={sesion.entrenador_nombre}
        ejemplos={{ observacion: 'Por ejemplo: sentí la rodilla derecha en la bajada', dolor: 'Por ejemplo: molestia en la rodilla derecha al bajar' }}
        onCerrar={() => setHojaObs(false)}
        onGuardar={(o) => {
          setHojaObs(false);
          useEntrenar.getState().anotar(uid, { ...o, sessionId: sesion.id, exerciseId: e?.exercise_id ?? null });
          const quien = sesion.entrenador_nombre;
          aviso.mostrar(`Guardado en ${e?.nombre ?? sesion.nombre_dia}.${quien ? ` ${quien} lo verá en tu ficha.` : ''}`);
        }}
      />
    </View>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function CabezaEjercicio({ sesion, e, onAnterior, onSiguiente }: { sesion: SesionLocal; e: EjercicioLocal; onAnterior: () => void; onSiguiente: () => void }) {
  const j = sesion.ejercicio_actual;
  const n = sesion.ejercicios.length;
  const o = e.objetivo;
  return (
    <>
      <View className="mb-2 mt-1 flex-row items-center justify-between">
        <Text className="font-sans-semibold text-[13px] text-texto-2">
          Ejercicio <Text className="font-mono-bold text-texto">{j + 1}</Text> de <Text className="font-mono-bold text-texto">{n}</Text>
        </Text>
        <View className="-mr-3 flex-row">
          <BotonIcono icono="izquierda" etiqueta="Ejercicio anterior" disabled={j === 0} onPress={onAnterior} />
          <BotonIcono icono="adelante" etiqueta="Ejercicio siguiente" disabled={j === n - 1} onPress={onSiguiente} />
        </View>
      </View>
      <View className="mb-4 flex-row gap-[3px]" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {sesion.ejercicios.map((x, k) => (
          <View key={k} className={`h-1.5 flex-1 rounded-[1px] ${k === j ? 'bg-texto' : S.ejercicioListo(x) ? 'bg-hecho-fondo' : 'bg-sup-alta'}`} />
        ))}
      </View>
      <Titulo>{e.nombre}</Titulo>
      <Txt v="sec" className="mt-1">
        {[e.grupo, `${o.series} × ${o.reps_min}–${o.reps_max}`, `RIR ${o.rir_objetivo}`, `descanso ${reloj(o.descanso_s)}`].filter(Boolean).join(' · ')}
      </Txt>
      <View className="mt-4 flex-row justify-between gap-3 rounded-control border border-sup-alta bg-sup px-3.5 py-3">
        <View className="flex-1">
          <Ceja className="text-[12px]">{e.ultima ? `Última vez${e.ultima.fecha ? ` · ${fechaCorta(e.ultima.fecha)}` : ''}` : 'Última vez'}</Ceja>
          <Text className="mt-1 font-mono-bold text-[15px] text-texto">{e.ultima ? textoUltima(e.ultima) : 'Primera vez'}</Text>
        </View>
        <View className="items-end">
          <Ceja className="text-[12px]">Hoy</Ceja>
          <Text className="mt-1 font-mono-bold text-[15px] text-texto">
            {e.sube_kg > 0 ? <Text className="text-acento-texto">{`+${cifra(e.sube_kg)}  `}</Text> : null}
            {`${cifra(e.peso_hoy_kg)} kg`}
          </Text>
        </View>
      </View>
    </>
  );
}

function FilaSerie({ serie, n, e }: { serie: SerieLocal; n: number; e: EjercicioLocal }) {
  const { c } = useTema();
  if (serie.estado === 'pendiente') {
    return (
      <View accessible accessibilityLabel={`Serie ${n}, pendiente: ${cifra(serie.peso_kg)} kilos por ${e.objetivo.reps_min} a ${e.objetivo.reps_max}`} className="min-h-[56px] flex-row items-center gap-3 rounded-control border border-sup-alta bg-sup pl-3.5 pr-2">
        <Text className="w-[18px] font-mono-bold text-[14px] text-texto-2">{n}</Text>
        <Text className="flex-1 font-mono-medium text-[15px] text-texto-2">{`${cifra(serie.peso_kg)} kg × ${e.objetivo.reps_min}–${e.objetivo.reps_max}`}</Text>
        <View className="h-10 w-10 rounded-control border-2 border-marcar-borde" />
      </View>
    );
  }
  const fallo = serie.estado === 'fallada';
  return (
    <View
      accessible
      accessibilityLabel={`Serie ${n}, ${fallo ? 'fallida' : 'hecha'}: ${cifra(serie.peso_kg)} kilos por ${serie.reps}, RIR ${textoRir(serie.rir)}`}
      className="min-h-[56px] flex-row items-center gap-3 rounded-control border border-transparent bg-fila-hecha pl-3.5 pr-2"
    >
      <Text className="w-[18px] font-mono-bold text-[14px] text-texto-2">{n}</Text>
      <View className="flex-1 flex-row items-baseline">
        <Text className="font-mono-bold text-[18px] text-texto">{cifra(serie.peso_kg)}</Text>
        <Text className="ml-1 mr-2 font-sans-medium text-[13px] text-texto-2">kg</Text>
        <Text className="mr-2 text-texto-2">×</Text>
        <Text className="font-mono-bold text-[18px] text-texto">{serie.reps}</Text>
        {fallo ? <Text className="ml-2 font-sans-semibold text-[12px] text-peligro">fallida</Text> : null}
      </View>
      <Text className="font-mono-medium text-[13px] text-texto-2">
        RIR <Text className="font-mono-bold text-texto">{textoRir(serie.rir)}</Text>
      </Text>
      {fallo ? (
        <View className="h-10 w-10 items-center justify-center rounded-control border-2 border-peligro">
          <View className="h-1 w-3.5 rounded-[1px] bg-peligro" />
        </View>
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-control border-2 border-hecho-borde bg-hecho-fondo">
          <Icono nombre="visto" tamano={22} color={c.visto} />
        </View>
      )}
    </View>
  );
}

function SerieActiva({ serie, n, e, onCambiar }: { serie: SerieLocal; n: number; e: EjercicioLocal; onCambiar: (c: { peso_kg?: number; reps?: number; rir?: number }) => void }) {
  return (
    <View accessibilityLabel={`Serie ${n}, registrando`} className="rounded-control border-2 border-accion bg-sup p-3.5">
      <View className="mb-3 flex-row items-baseline justify-between">
        <Txt v="h3">{`Serie ${n}`}</Txt>
        <Txt v="sec" className="text-[13px]">{`objetivo ${e.objetivo.reps_min}–${e.objetivo.reps_max} · RIR ${e.objetivo.rir_objetivo}`}</Txt>
      </View>
      <Txt v="sec" className="mb-1.5 text-[13px]">
        Kilos
      </Txt>
      <Paso valor={serie.peso_kg} onCambiar={(v) => onCambiar({ peso_kg: v })} paso={S.PASO_KG} min={S.LIMITES.kg[0]} max={S.LIMITES.kg[1]} unidad="kg" etiqueta="Kilos" />
      <Txt v="sec" className="mb-1.5 mt-3 text-[13px]">
        Repeticiones
      </Txt>
      <Paso valor={serie.reps} onCambiar={(v) => onCambiar({ reps: v })} paso={S.PASO_REPS} min={S.LIMITES.reps[0]} max={S.LIMITES.reps[1]} unidad="reps" etiqueta="Repeticiones" />
      <Txt v="sec" className="mb-1.5 mt-3 text-[13px]">
        RIR · repeticiones que te quedaban
      </Txt>
      <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel="RIR">
        {S.RIRS.map((r) => (
          <Chip key={r} titulo={textoRir(r)} texto={false} ancho activo={serie.rir === r} etiqueta={`RIR ${textoRir(r)}`} onPress={() => onCambiar({ rir: r })} />
        ))}
      </View>
    </View>
  );
}

function CapaDescanso(p: {
  resta: number;
  total: number;
  sigue: string;
  deshacerN: number | null;
  abajo: number;
  onMas30: () => void;
  onSaltar: () => void;
  onDeshacer: () => void;
}) {
  const ancho = p.total > 0 ? Math.min(100, (p.resta / p.total) * 100) : 0;
  return (
    <View
      accessibilityLabel="Descanso"
      className="absolute bottom-0 left-0 right-0 rounded-t-hoja border-t border-sup-alta bg-sup px-4 pt-4"
      style={{ paddingBottom: 20 + p.abajo }}
    >
      <Ceja acento>Descanso</Ceja>
      <View className="mt-1 flex-row items-end justify-between gap-3">
        <Text className="font-mono-bold text-[56px] leading-[60px] text-texto" style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={`Quedan ${reloj(p.resta)} de descanso`}>
          {reloj(p.resta)}
        </Text>
        <View className="flex-1 items-end pb-1.5">
          <Txt v="sec">Sigue</Txt>
          <Txt v="h3" className="text-right text-[16px]">
            {p.sigue}
          </Txt>
        </View>
      </View>
      <View className="mt-4 h-1.5 overflow-hidden rounded-[1px] bg-sup-alta">
        <View className="h-full bg-hecho-fondo" style={{ width: `${ancho}%` }} />
      </View>
      <View className="mt-4 flex-row gap-2">
        <View className="w-[112px]">
          <Boton titulo="+30 s" variante="secundario" alto ancho accessibilityLabel="Sumar 30 segundos" onPress={p.onMas30} />
        </View>
        <View className="flex-1">
          <Boton titulo="Saltar descanso" alto ancho onPress={p.onSaltar} />
        </View>
      </View>
      {p.deshacerN ? (
        <View className="-mx-3 mt-2 items-start">
          <Boton titulo={`Deshacer serie ${p.deshacerN}`} variante="fantasma" onPress={p.onDeshacer} />
        </View>
      ) : null}
    </View>
  );
}
