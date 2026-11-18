// ─────────────────────────────────────────────────────────────────────────────
// Hoy · Zona: Entrenar
//
// Qué hace: la pantalla 5 (hoy.html): fecha, saludo y racha; la tarjeta de la rutina del día con
// sus ejercicios y lo que sube hoy, o la sesión en curso (retomar o descartar), o el día de
// descanso, o sin rutina (con entrenador espera; solo, a Nueva rutina); la semana de lunes a
// domingo, las cifras del mes y la tarjeta del entrenador. El botón de abajo empieza o retoma.
// Lee GET /me/today y lo guarda: sin señal muestra lo último guardado (CU-26 A7). También manda
// la cola sin señal cuando puede.
// Tócalo cuando: cambie lo que muestra Hoy.
// No lo toques para: qué estado toca (vistaHoy.ts) ni las reglas de la sesión (sesionLocal.ts).
// Depende de: @/components/ui, @/lib/sesion, @/lib/tema, ./almacen, ./vistaHoy, ./formato.
// ─────────────────────────────────────────────────────────────────────────────
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAccion, Boton, Ceja, Cifra, Hoja, Icono, Separador, Simbolo, Tarjeta, Titulo, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { cargarHoy, sincronizar, useDatosEntrenar, useEntrenar } from './almacen';
import { contarCola } from './cola';
import { ahora, cifra, fechaLarga, iniciales, nombreMes, toneladas } from './formato';
import type { DiaHoy, Hoy, MarcaDia } from './modelo';
import { seriesMarcadas, totalSeries } from './sesionLocal';
import { useSincronizar } from './useSincronizar';
import { estadoHoy, nombreEnCurso, resumenDia } from './vistaHoy';

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const NOMBRE_MARCA: Record<MarcaDia, string> = { hecho: 'entrenado', toca: 'toca entrenar', plan: 'por entrenar', descanso: 'descanso' };

export function PantallaHoy() {
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();
  const uid = usuario?.id ?? null;
  const datos = useDatosEntrenar(uid);
  const aviso = useAviso();
  const [carga, setCarga] = useState<'cargando' | 'ok' | 'sin_red' | 'error'>('cargando');
  const [abierta, setAbierta] = useState(false);
  const [hojaDescartar, setHojaDescartar] = useState(false);
  const [hojaObs, setHojaObs] = useState(false);
  const [momento, setMomento] = useState(ahora);

  const refrescar = useCallback(async () => {
    if (!uid) return;
    await sincronizar(uid).catch(() => null);
    const r = await cargarHoy(uid);
    setCarga(r);
    setMomento(ahora());
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void refrescar();
    }, [refrescar]),
  );
  useSincronizar(uid, refrescar);

  const { hoy, sesion, cierres, hoyAt } = datos;
  const estado = estadoHoy(hoy, sesion, cierres, hoyAt, momento);
  const rechazadas = contarCola(datos.cola).rechazadas;

  function empezar(dia: DiaHoy) {
    if (!uid) return;
    const id = useEntrenar.getState().empezar(uid, dia);
    if (id) router.push({ pathname: '/sesion/[id]', params: { id } });
  }
  function retomar() {
    if (sesion) router.push({ pathname: '/sesion/[id]', params: { id: sesion.id } });
  }
  function descartar() {
    const id = sesion?.id ?? hoy?.sesion_en_curso?.id;
    const nombre = nombreEnCurso(hoy, sesion);
    setHojaDescartar(false);
    if (!uid || !id) return;
    useEntrenar.getState().descartar(uid, id);
    aviso.mostrar(`Descartaste la sesión. ${nombre} vuelve a quedar para hoy.`);
    void sincronizar(uid).then(() => refrescar());
  }

  // ── Botón de abajo ─────────────────────────────────────────────────────────
  let accion: ReactNode = null;
  if (estado === 'normal' && hoy?.dia) {
    const dia = hoy.dia;
    accion = <Boton titulo="Empezar rutina" alto ancho onPress={() => empezar(dia)} />;
  } else if (estado === 'curso' && sesion) {
    accion = <Boton titulo="Retomar sesión" alto ancho onPress={retomar} />;
  }

  const hechasCurso = sesion ? seriesMarcadas(sesion) : (hoy?.sesion_en_curso?.series_hechas ?? 0);

  return (
    <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6" showsVerticalScrollIndicator={false}>
        <View className="h-14 flex-row items-center justify-between">
          <Simbolo tamano={24} />
          {hoy && hoy.racha_dias > 0 ? <Racha dias={hoy.racha_dias} /> : null}
        </View>
        <View className="mb-5 mt-1">
          <Ceja>{fechaLarga(new Date(momento))}</Ceja>
          <Titulo className="mt-0.5">{`Hola, ${usuario?.nombre ?? ''}`}</Titulo>
        </View>

        {carga === 'sin_red' && hoy ? <AvisoSinRed texto="Sin señal. Te mostramos lo último guardado." /> : null}
        {rechazadas > 0 ? <AvisoSinRed texto={`${rechazadas === 1 ? 'Un envío no se pudo subir' : `${rechazadas} envíos no se pudieron subir`}. Revísalo en Perfil.`} /> : null}

        {!hoy || !estado ? (
          <EstadoCarga carga={carga} onReintentar={() => void refrescar()} />
        ) : (
          <>
            <TarjetaPrincipal
              hoy={hoy}
              estado={estado}
              abierta={abierta}
              onAlternar={() => setAbierta((a) => !a)}
              nombreCurso={nombreEnCurso(hoy, sesion)}
              hechasCurso={hechasCurso}
              totalCurso={sesion ? totalSeries(sesion) : (hoy.sesion_en_curso?.series_total ?? 0)}
              inicioCurso={sesion?.iniciada_ms ?? (hoy.sesion_en_curso?.iniciada_at ? Date.parse(hoy.sesion_en_curso.iniciada_at) : null)}
              ibaEn={sesion ? (sesion.ejercicios[sesion.ejercicio_actual]?.nombre ?? null) : null}
              momento={momento}
              onDescartar={() => setHojaDescartar(true)}
              onAdelantar={(dia) => empezar(dia)}
            />
            {estado === 'espera' || estado === 'solo' ? null : (
              <>
                <Semana hoy={hoy} />
                <Mes hoy={hoy} momento={momento} />
              </>
            )}
            <Entrenador hoy={hoy} onVer={() => setHojaObs(true)} />
          </>
        )}
      </ScrollView>
      {accion ? <BarraAccion enPestanas>{accion}</BarraAccion> : null}

      <Hoja
        visible={hojaDescartar}
        onCerrar={() => setHojaDescartar(false)}
        titulo="¿Descartar la sesión?"
        texto={`Se borran las ${hechasCurso} series que marcaste hoy. No se puede deshacer.`}
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHojaDescartar(false)} />
            <Boton titulo="Sí, descartar" variante="peligro" alto className="flex-1" onPress={descartar} />
          </>
        }
      />
      <Hoja
        visible={hojaObs}
        onCerrar={() => setHojaObs(false)}
        titulo={hoy?.entrenador ? `Observaciones de ${hoy.entrenador.nombre}` : 'Observaciones'}
        texto={hoy?.ultima_accion?.texto}
        acciones={<Boton titulo="Listo" variante="secundario" alto className="flex-1" onPress={() => setHojaObs(false)} />}
      />
    </View>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function Racha({ dias }: { dias: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${dias} días de racha`}
      className="h-8 flex-row items-center gap-2 rounded-control border border-sup-alta bg-sup pl-2.5 pr-3"
    >
      <View className="h-3.5 w-1 rounded-[1px] bg-hecho-fondo" />
      <Text className="font-sans-medium text-[13px] text-texto-2">
        <Text className="font-mono-bold text-[14px] text-texto">{dias}</Text> días de racha
      </Text>
    </View>
  );
}

function AvisoSinRed({ texto }: { texto: string }) {
  const { c } = useTema();
  return (
    <View accessibilityRole="alert" className="mb-3 flex-row items-start gap-3 rounded-control border border-borde bg-sup px-3.5 py-3">
      <Icono nombre="sinSenal" tamano={20} color={c.texto} />
      <Txt v="cuerpo" className="flex-1 text-[14px] leading-[20px]">
        {texto}
      </Txt>
    </View>
  );
}

function EstadoCarga({ carga, onReintentar }: { carga: 'cargando' | 'ok' | 'sin_red' | 'error'; onReintentar: () => void }) {
  if (carga === 'cargando' || carga === 'ok') {
    return (
      <Tarjeta>
        <Ceja>Rutina de hoy</Ceja>
        <Txt v="sec" className="mt-1">
          Cargando tu día…
        </Txt>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta>
      <Ceja>Rutina de hoy</Ceja>
      <Titulo nivel={2} className="mt-1">
        {carga === 'sin_red' ? 'Sin señal' : 'No pudimos cargar tu día'}
      </Titulo>
      <Txt v="sec" className="mt-1">
        {carga === 'sin_red'
          ? 'Para ver tu rutina la primera vez necesitas conexión. Después funciona sin señal.'
          : 'Algo falló del lado del servidor. Prueba de nuevo en un rato.'}
      </Txt>
      <Boton titulo="Reintentar" variante="secundario" ancho className="mt-4" onPress={onReintentar} />
    </Tarjeta>
  );
}

function FilaEjercicio({ nombre, series, reps, kg, sube, ultimo }: { nombre: string; series: number; reps: number; kg: number | null; sube: number; ultimo: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${nombre}: ${series} series de ${reps}${kg !== null ? `, ${cifra(kg)} kilos` : ''}${sube > 0 ? `, ${cifra(sube)} más que la última vez` : ''}`}
      className={`min-h-[56px] flex-row items-center justify-between gap-3 py-2 ${ultimo ? '' : 'border-b border-sup-alta'}`}
    >
      <Txt v="cuerpo" className="flex-1">
        {nombre}
      </Txt>
      <View className="items-end gap-0.5">
        <Text className="font-mono-bold text-[15px] text-texto">
          {series}
          <Text className="font-mono-medium text-texto-2"> × </Text>
          {reps}
        </Text>
        {kg !== null ? (
          <Text className="font-mono-bold text-[13px] text-texto-2">
            {sube > 0 ? <Text className="text-acento-texto">{`+${cifra(sube)}  `}</Text> : null}
            {`${cifra(kg)} kg`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Segmentos({ total, hechos }: { total: number; hechos: number }) {
  return (
    <View className="mt-4 flex-row gap-[3px]" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} className={`h-2 flex-1 rounded-[1px] ${i < hechos ? 'bg-hecho-fondo' : 'bg-sup-alta'}`} />
      ))}
    </View>
  );
}

function TarjetaPrincipal(p: {
  hoy: Hoy;
  estado: NonNullable<ReturnType<typeof estadoHoy>>;
  abierta: boolean;
  onAlternar: () => void;
  nombreCurso: string;
  hechasCurso: number;
  totalCurso: number;
  inicioCurso: number | null;
  ibaEn: string | null;
  momento: number;
  onDescartar: () => void;
  onAdelantar: (dia: DiaHoy) => void;
}) {
  const { hoy, estado } = p;

  if (estado === 'normal' && hoy.dia) {
    const dia = hoy.dia;
    const lista = p.abierta ? dia.ejercicios : dia.ejercicios.slice(0, 3);
    const sube = dia.ejercicios.find((e) => e.sube_kg > 0)?.sube_kg ?? 0;
    return (
      <Tarjeta accessibilityLabel="Rutina de hoy">
        <View className="flex-row items-baseline justify-between gap-2">
          <Ceja>Rutina de hoy</Ceja>
          {hoy.semana ? <Ceja>{`Semana ${hoy.semana.actual} de ${hoy.semana.total}`}</Ceja> : null}
        </View>
        <Titulo nivel={2} className="mt-1">
          {dia.nombre}
        </Titulo>
        <Txt v="sec" className="mt-1">
          {resumenDia(dia)}
        </Txt>
        <View className="mt-3 border-t border-sup-alta">
          {lista.map((e, i) => (
            <FilaEjercicio key={`${e.exercise_id}-${i}`} nombre={e.nombre} series={e.series} reps={e.reps_max} kg={e.peso_kg} sube={e.sube_kg} ultimo={i === lista.length - 1} />
          ))}
        </View>
        {sube > 0 ? (
          <Text className="mt-1 font-sans-medium text-[13px] text-texto-2">
            <Text className="font-mono-bold text-acento-texto">{`+${cifra(sube)}  `}</Text>kilos más que la última vez
          </Text>
        ) : null}
        {dia.ejercicios.length > 3 ? (
          <Boton
            titulo={p.abierta ? 'Ver menos' : `Ver los ${dia.ejercicios.length} ejercicios`}
            variante="fantasma"
            ancho
            className="mt-1"
            onPress={p.onAlternar}
          />
        ) : null}
      </Tarjeta>
    );
  }

  if (estado === 'curso') {
    const minutos = p.inicioCurso ? Math.max(0, Math.round((p.momento - p.inicioCurso) / 60000)) : null;
    const partes = [minutos !== null ? `Empezaste hace ${minutos} min.` : null, p.ibaEn ? `Ibas en ${p.ibaEn}.` : null].filter(Boolean);
    return (
      <View accessibilityLabel="Sesión en curso" className="rounded-control border border-hecho-borde bg-sup p-4">
        <Ceja acento>Sesión en curso</Ceja>
        <Titulo nivel={2} className="mt-1">
          {p.nombreCurso}
        </Titulo>
        {partes.length ? (
          <Txt v="sec" className="mt-1">
            {partes.join(' ')}
          </Txt>
        ) : null}
        {p.totalCurso > 0 ? <Segmentos total={p.totalCurso} hechos={p.hechasCurso} /> : null}
        <Text className="mt-2 font-sans-medium text-[13px] text-texto-2">
          <Text className="font-mono-bold text-texto">{p.hechasCurso}</Text>
          {p.totalCurso > 0 ? (
            <>
              {' de '}
              <Text className="font-mono-bold text-texto">{p.totalCurso}</Text>
            </>
          ) : null}{' '}
          series
        </Text>
        <View className="mt-4">
          <Boton titulo="Descartar sesión" variante="fantasmaPeligro" onPress={p.onDescartar} />
        </View>
      </View>
    );
  }

  if (estado === 'lista' && hoy.dia) {
    return (
      <Tarjeta tono="hecha" accessibilityLabel="Rutina de hoy">
        <Ceja acento>Sesión completada</Ceja>
        <Titulo nivel={2} className="mt-1">{`${hoy.dia.nombre} lista`}</Titulo>
        <Txt v="sec" className="mt-1">
          La sesión quedó guardada en tu teléfono y se sube sola cuando vuelva la conexión.
        </Txt>
      </Tarjeta>
    );
  }

  if (estado === 'descanso') {
    const prox = hoy.proximo;
    return (
      <Tarjeta accessibilityLabel="Hoy">
        <Ceja>Rutina de hoy</Ceja>
        <Titulo nivel={2} className="mt-1">
          Día de descanso
        </Titulo>
        {prox ? (
          <Txt v="sec" className="mt-1">
            {textoManana(prox)}
          </Txt>
        ) : null}
        {prox && prox.ejercicios.length > 0 ? (
          <View className="mt-4">
            <Boton titulo={`Adelantar ${prox.nombre} a hoy`} variante="secundario" ancho onPress={() => p.onAdelantar(prox)} />
          </View>
        ) : null}
      </Tarjeta>
    );
  }

  if (estado === 'espera') {
    return (
      <Tarjeta accessibilityLabel="Rutina de hoy">
        <Ceja>Rutina de hoy</Ceja>
        <Titulo nivel={2} className="mt-1">
          Tu entrenador está armando tu rutina
        </Titulo>
        <Txt v="sec" className="mt-1">
          {`Te avisamos apenas ${hoy.entrenador?.nombre ?? 'tu entrenador'} la active. Mientras, puedes registrar tu peso y tus medidas.`}
        </Txt>
        <View className="mt-4">
          <Boton titulo="Registrar peso" variante="secundario" ancho onPress={() => router.push('/progreso')} />
        </View>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta accessibilityLabel="Rutina de hoy">
      <Ceja>Rutina de hoy</Ceja>
      <Titulo nivel={2} className="mt-1">
        Todavía no tienes rutina
      </Titulo>
      <Txt v="sec" className="mt-1">
        Ármala tú: los días, los ejercicios y cuánto subir cada semana. Toma unos 5 minutos.
      </Txt>
      <View className="mt-4">
        <Boton titulo="Crear rutina" alto ancho onPress={() => router.push('/rutina/nueva')} />
      </View>
    </Tarjeta>
  );
}

function Semana({ hoy }: { hoy: Hoy }) {
  const { c } = useTema();
  return (
    <>
      <Separador
        titulo="Esta semana"
        derecha={
          hoy.semana_cuenta ? (
            <Text className="font-sans-medium text-[14px] text-texto-2">
              <Text className="font-mono-bold text-texto">{hoy.semana_cuenta.hechas}</Text> de{' '}
              <Text className="font-mono-bold text-texto">{hoy.semana_cuenta.plan}</Text>
            </Text>
          ) : null
        }
      />
      <Tarjeta>
        <View className="flex-row justify-between">
          {hoy.semana_dias.map((m, i) => {
            const esHoy = i === hoy.semana_hoy;
            return (
              <View key={i} accessible accessibilityLabel={`${LETRAS[i]}${esHoy ? ', hoy' : ''}: ${NOMBRE_MARCA[m]}`} className="items-center gap-1.5">
                <View
                  className={`h-10 w-10 items-center justify-center rounded-control ${
                    m === 'hecho' ? 'border-2 border-hecho-borde bg-hecho-fondo' : m === 'toca' ? 'border-2 border-accion' : m === 'plan' ? 'border-2 border-marcar-borde' : ''
                  }`}
                >
                  {m === 'hecho' ? <Icono nombre="visto" tamano={22} color={c.visto} /> : null}
                  {m === 'descanso' ? <View className="h-1 w-3.5 rounded-[1px] bg-borde" /> : null}
                </View>
                <Text className={`text-[12px] ${esHoy ? 'font-mono-bold text-texto' : 'font-mono-medium text-texto-2'}`}>{LETRAS[i]}</Text>
                {esHoy ? <View className="-mt-1 h-0.5 w-3 bg-texto" /> : <View className="-mt-1 h-0.5 w-3" />}
              </View>
            );
          })}
        </View>
      </Tarjeta>
    </>
  );
}

function Mes({ hoy, momento }: { hoy: Hoy; momento: number }) {
  const datos = [
    { valor: String(hoy.mes.sesiones), unidad: '', texto: 'sesiones' },
    { valor: toneladas(hoy.mes.volumen_kg), unidad: 't', texto: 'levantadas' },
    { valor: String(hoy.mes.prs), unidad: '', texto: 'récords' },
  ];
  return (
    <>
      <Separador titulo={nombreMes(new Date(momento))} />
      <View className="flex-row gap-2">
        {datos.map((d) => (
          <View key={d.texto} accessible accessibilityLabel={`${d.valor}${d.unidad ? ' toneladas' : ''} ${d.texto}`} className="flex-1 rounded-control border border-sup-alta bg-sup p-3">
            <Text className="font-mono-bold text-[24px] leading-[27px] text-texto">
              {d.valor}
              {d.unidad ? <Text className="text-[14px] text-texto-2">{` ${d.unidad}`}</Text> : null}
            </Text>
            <Txt v="sec" className="mt-1 text-[13px]">
              {d.texto}
            </Txt>
          </View>
        ))}
      </View>
    </>
  );
}

function Entrenador({ hoy, onVer }: { hoy: Hoy; onVer: () => void }) {
  const e = hoy.entrenador;
  if (!e) {
    return (
      <>
        <Separador titulo="¿Entrenas con alguien?" />
        <Tarjeta>
          <Txt v="sec">Si tu entrenador te dio un código de 6 letras, ingrésalo y verá tus rutinas y tu avance.</Txt>
          <Boton titulo="Ingresar código" variante="secundario" ancho className="mt-3" onPress={() => router.push('/perfil')} />
        </Tarjeta>
      </>
    );
  }
  const a = hoy.ultima_accion;
  return (
    <>
      <Separador titulo="Tu entrenador" />
      <Tarjeta>
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-control bg-sup-alta">
            <Cifra className="text-[14px]">{iniciales(e.nombre, e.apellido)}</Cifra>
          </View>
          <View className="flex-1">
            <Txt v="h3" className="text-[16px]">{`${e.nombre} ${e.apellido}`.trim()}</Txt>
            {a ? <Txt v="sec">Te dejó una observación</Txt> : null}
          </View>
        </View>
        {a ? (
          <>
            <View className="mt-3.5 border-l-4 border-hecho-fondo py-0.5 pl-3">
              <Txt v="cuerpo" className="text-[15px] leading-[22px]">
                {a.texto}
              </Txt>
            </View>
            <View className="-mr-3 mt-2 flex-row items-center justify-between">
              <Txt v="sec" className="text-[13px]">
                {a.created_at ? haceTexto(a.created_at) : ''}
              </Txt>
              <Boton titulo={`Ver observaciones (${a.total})`} variante="fantasma" onPress={onVer} />
            </View>
          </>
        ) : null}
      </Tarjeta>
    </>
  );
}

function textoManana(d: DiaHoy): string {
  const partes = [d.ejercicios.length ? `${d.ejercicios.length} ejercicios` : null, d.minutos ? `~${d.minutos} min` : null].filter(Boolean);
  return `Mañana toca ${d.nombre}${partes.length ? `: ${partes.join(', ')}` : ''}.`;
}

function haceTexto(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const min = Math.max(0, Math.round((ahora() - ms) / 60000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

