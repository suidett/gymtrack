// ─────────────────────────────────────────────────────────────────────────────
// Detalle de ejercicio y Nuevo ejercicio · Zona: Alumno (área Ejercicios, PAN-10)
//
// Qué hace: el detalle de docs/pantallas/ejercicio.html: referencia (o «Sin referencia todavía»
// en los propios), origen, cómo se hace, músculos o grupo, el historial del alumno (récord de 1RM
// estimado, mejor serie, gráfico desde la tercera sesión con «1RM estimado» y «Mejor serie», y
// la lista de sesiones) y sus observaciones y dolores, con la hoja para anotar una. Sin señal, la
// referencia avisa y lo demás sale de lo guardado (APP-025). Solo los propios muestran Editar.
// Con id «nuevo» (o al tocar Editar) muestra el formulario de ejercicio propio de la maqueta
// ejercicios.html: nombre, grupo, equipo, cómo se registra, referencia y pasos.
// Tócalo cuando: cambie el detalle de un ejercicio, su hoja de observación o el formulario.
// No lo toques para: la lista y la búsqueda (./Ejercicios.tsx).
// Depende de: ./api, ./datos, ./logica, ./piezas, ./graficos, ./Ejercicios (Miniatura),
// @gymtrack/shared (e1rm), @/components/ui y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { e1rm as calcularE1rm } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAccion, Boton, Cabecera, CampoTexto, Chip, Hoja, Pantalla, Paso, Separador, Tarjeta, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import {
  cambiarEjercicio,
  crearEjercicio,
  crearObservacion,
  historialEjercicio,
  leerEjercicio,
  listarEjercicios,
  mensajeDeError,
  observacionesDe,
} from './api';
import type { Ejercicio, Observacion, PuntoHistorial } from './datos';
import { Miniatura } from './Ejercicios';
import { LineaTiempo } from './graficos';
import {
  cifra1,
  cuerpoEjercicio,
  EQUIPOS_FILTRO,
  erroresEjercicio,
  fechaCorta,
  GRUPOS_FILTRO,
  OPCIONES_REGISTRO,
  puedeEditarEjercicio,
  registroDe,
  type BorradorEjercicio,
} from './logica';
import { BandaSinConexion, CuadroCifra, ErrorCarga, Esqueleto, Marca } from './piezas';
import { useCarga } from './useCarga';

const kg = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const ZONAS = ['Hombro', 'Rodilla', 'Espalda baja', 'Muñeca', 'Cadera', 'Otra'];

/** Ruta /ejercicio/:id. `id` «nuevo» abre el formulario; los params de búsqueda lo llenan. */
export function PantallaEjercicio({ id, prellenado }: { id: string; prellenado?: Partial<BorradorEjercicio> }) {
  if (id === 'nuevo') return <FormularioEjercicio inicial={prellenado} />;
  return <DetalleEjercicio id={id} />;
}

// ── Detalle ──────────────────────────────────────────────────────────────────
function DetalleEjercicio({ id }: { id: string }) {
  const { usuario, rol } = useSesion();
  const aviso = useAviso();
  const ent = rol === 'entrenador';
  const carga = useCarga(`ejercicio.${id}`, async () => {
    const [ej, historial, obs] = await Promise.all([
      leerEjercicio(id),
      ent ? Promise.resolve([] as PuntoHistorial[]) : historialEjercicio(id).catch(() => [] as PuntoHistorial[]),
      observacionesDe(id).catch(() => [] as Observacion[]),
    ]);
    return { ej, historial, obs };
  });
  const [editando, setEditando] = useState(false);
  const [metrica, setMetrica] = useState<'e1rm' | 'kg'>('e1rm');
  const [sel, setSel] = useState<number | null>(null);
  const [todas, setTodas] = useState(false);
  const [hoja, setHoja] = useState<'observar' | 'referencia' | null>(null);
  const [obsNuevas, setObsNuevas] = useState<Observacion[]>([]);
  const nombreEnt = usuario?.entrenador?.nombre ?? null;

  if (carga.estado !== 'listo' || !carga.datos) {
    return (
      <Pantalla cabecera={<Cabecera atras />}>
        {carga.estado === 'error' ? (
          <ErrorCarga texto="No pudimos abrir este ejercicio." onReintentar={carga.recargar} />
        ) : (
          <Esqueleto filas={3} etiqueta="Cargando el ejercicio" />
        )}
      </Pantalla>
    );
  }

  const { ej, historial } = carga.datos;
  const obs = [...obsNuevas, ...carga.datos.obs.filter((o) => !obsNuevas.some((n) => n.id && n.id === o.id))];
  const propio = puedeEditarEjercicio(ej, usuario?.id ?? null);

  if (editando) {
    return (
      <FormularioEjercicio
        editar={ej}
        onListo={() => {
          setEditando(false);
          carga.recargar();
        }}
      />
    );
  }

  const origen = !ej.duenoId
    ? 'Biblioteca GymTrack'
    : propio
      ? ej.creadoAt
        ? `Creado por ti el ${fechaCorta(ej.creadoAt)}`
        : 'Creado por ti'
      : 'Creado por tu entrenador';

  return (
    <View className="flex-1 bg-fondo">
      <Pantalla
        cabecera={
          <Cabecera atras derecha={propio ? <Boton titulo="Editar" variante="fantasma" disabled={carga.sinConexion} onPress={() => setEditando(true)} /> : undefined} />
        }
      >
        {carga.sinConexion ? <BandaSinConexion texto="Ves lo guardado en tu teléfono." /> : null}
        <Referencia ej={ej} propio={propio} sinRed={carga.sinConexion} onSubir={() => setHoja('referencia')} />

        <View className="mt-4">
          <Txt v="ceja">{origen}</Txt>
          <Txt v="titulo" className="mt-1" accessibilityRole="header">
            {ej.nombre}
          </Txt>
          <Txt v="sec" className="mt-1">
            {[ej.grupo, ej.equipo].filter(Boolean).join(' · ')}
          </Txt>
        </View>

        <Separador titulo={propio ? 'Cómo se hace · lo escribiste tú' : 'Cómo se hace'} />
        <Tarjeta>
          {ej.instrucciones.length ? (
            ej.instrucciones.map((p, i) => (
              <View key={i} className={`flex-row gap-3 ${i ? 'mt-3' : ''}`}>
                <Text className="w-5 font-mono-bold text-[15px] text-acento-texto">{i + 1}</Text>
                <Txt v="cuerpo" className="flex-1">
                  {p}
                </Txt>
              </View>
            ))
          ) : (
            <>
              <Txt v="sec">{propio ? 'No agregaste pasos. Puedes sumarlos cuando quieras.' : 'Este ejercicio todavía no tiene pasos escritos.'}</Txt>
              {propio ? <Boton titulo="Agregar pasos" variante="fantasma" className="-mb-2 -ml-3 mt-2 self-start" onPress={() => setEditando(true)} /> : null}
            </>
          )}
        </Tarjeta>

        {ej.musculos ? (
          <>
            <Separador titulo="Músculos" />
            {ej.musculos.principales.length ? (
              <>
                <Txt v="ceja">Trabajan más</Txt>
                <Pildoras items={ej.musculos.principales} />
              </>
            ) : null}
            {ej.musculos.ayudan.length ? (
              <>
                <Txt v="ceja" className="mt-2">
                  Ayudan
                </Txt>
                <Pildoras items={ej.musculos.ayudan} suave />
              </>
            ) : null}
          </>
        ) : ej.grupo ? (
          <>
            <Separador titulo="Grupo" />
            <Pildoras items={[ej.grupo]} />
          </>
        ) : null}

        {!ent ? (
          <Historial
            ej={ej}
            ses={historial}
            metrica={metrica}
            onMetrica={(m) => {
              setMetrica(m);
              setSel(null);
            }}
            sel={sel}
            onSel={setSel}
            todas={todas}
            onTodas={() => setTodas((t) => !t)}
          />
        ) : null}

        <Separador
          titulo={ent ? 'Notas de tus clientes' : 'Observaciones y dolores'}
          derecha={obs.length ? <Txt v="sec">{`${obs.length} ${obs.length === 1 ? 'nota' : 'notas'}`}</Txt> : undefined}
        />
        <Tarjeta>
          {obs.length ? (
            obs.map((o, i) => <FilaObservacion key={o.id || i} o={o} yoId={usuario?.id ?? null} primera={i === 0} />)
          ) : (
            <Txt v="sec">
              {ent
                ? 'Tus clientes no han dejado notas en este ejercicio.'
                : `Si algo te molesta o quieres recordar un detalle, anótalo aquí.${nombreEnt && !propio ? ` ${nombreEnt} lo verá en tu ficha.` : ''}`}
            </Txt>
          )}
        </Tarjeta>
      </Pantalla>
      <BarraAccion>
        {ent ? (
          <Boton titulo="Usar en una rutina" alto ancho onPress={() => router.push('/rutina/nueva')} />
        ) : (
          <Boton titulo="Registrar observación" alto ancho onPress={() => setHoja('observar')} />
        )}
      </BarraAccion>

      <HojaObservar
        visible={hoja === 'observar'}
        ej={ej}
        propio={propio}
        nombreEnt={nombreEnt}
        onCerrar={() => setHoja(null)}
        onGuardada={(o) => {
          setObsNuevas((l) => [o, ...l]);
          setHoja(null);
          aviso.mostrar(propio || !nombreEnt ? 'Guardado en tu historial.' : `Guardado. ${nombreEnt} lo verá en tu ficha.`);
        }}
      />

      <Hoja
        visible={hoja === 'referencia'}
        onCerrar={() => setHoja(null)}
        titulo="Subir referencia"
        texto={`Un video corto, de hasta 50 MB, o una foto. ${ent ? 'La ven tú y tus clientes.' : 'Solo la ven tú y tu entrenador.'}`}
      >
        <View className="mt-4 gap-2">
          {['Grabar video', 'Tomar foto', 'Elegir de la galería'].map((t) => (
            <Boton key={t} titulo={t} variante="secundario" alto ancho onPress={() => aviso.mostrar('Subir fotos y videos llega en la próxima versión de la app.')} />
          ))}
        </View>
        <View className="mt-3 flex-row">
          <Boton titulo="Cancelar" variante="fantasma" alto className="flex-1" onPress={() => setHoja(null)} />
        </View>
      </Hoja>
    </View>
  );
}

function Pildoras({ items, suave = false }: { items: string[]; suave?: boolean }) {
  return (
    <View className="mt-1 flex-row flex-wrap gap-2">
      {items.map((x) => (
        <View key={x} className={`h-9 justify-center rounded-control border px-3 ${suave ? 'border-sup-alta bg-transparent' : 'border-sup-alta bg-sup-alta'}`}>
          <Text className={`font-sans-semibold text-[14px] ${suave ? 'text-texto-2' : 'text-texto'}`}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Referencia ───────────────────────────────────────────────────────────────
function Referencia({ ej, propio, sinRed, onSubir }: { ej: Ejercicio; propio: boolean; sinRed: boolean; onSubir: () => void }) {
  const foto = ej.media.find((m) => m.tipo === 'foto' && m.url);
  const video = ej.media.find((m) => m.tipo === 'video' && m.url);
  if (foto?.url && !sinRed) {
    return (
      <View className="overflow-hidden rounded-control border border-sup-alta bg-sup">
        <Image source={{ uri: foto.url }} style={{ width: '100%', aspectRatio: 16 / 9 }} resizeMode="cover" accessibilityLabel={`Referencia de ${ej.nombre}`} />
        {video?.url ? <Boton titulo="Ver video" variante="fantasma" className="self-start" onPress={() => video.url && Linking.openURL(video.url)} /> : null}
      </View>
    );
  }
  if (propio && !ej.media.length) {
    return (
      <View className="items-start gap-2 rounded-control border-2 border-dashed border-borde p-4">
        <Txt v="h3">Sin referencia todavía</Txt>
        <Txt v="sec">Sube una foto o un video corto para recordar cómo se hace.</Txt>
        <Boton titulo="Subir foto o video" variante="secundario" onPress={onSubir} />
      </View>
    );
  }
  if (sinRed && ej.media.length) {
    return (
      <View className="items-start gap-2 rounded-control border border-sup-alta bg-sup p-4">
        <Txt v="h3">Sin señal</Txt>
        <Txt v="sec">La referencia se carga cuando vuelvas a tener conexión. La técnica de abajo está guardada en tu teléfono.</Txt>
      </View>
    );
  }
  return (
    <View className="items-center rounded-control border border-sup-alta bg-sup py-4">
      <Miniatura patron={ej.patron} propio={false} tamano={140} />
      <Txt v="sec" className="mt-2">
        {video?.url ? 'Vista lateral' : 'Vista lateral · la pose clave del movimiento'}
      </Txt>
      {video?.url ? <Boton titulo="Ver video" variante="fantasma" onPress={() => video.url && Linking.openURL(video.url)} /> : null}
    </View>
  );
}

// ── Historial ────────────────────────────────────────────────────────────────
function Historial({
  ej,
  ses,
  metrica,
  onMetrica,
  sel,
  onSel,
  todas,
  onTodas,
}: {
  ej: Ejercicio;
  ses: PuntoHistorial[];
  metrica: 'e1rm' | 'kg';
  onMetrica: (m: 'e1rm' | 'kg') => void;
  sel: number | null;
  onSel: (i: number) => void;
  todas: boolean;
  onTodas: () => void;
}) {
  const soloReps = ej.tipoCarga !== 'kg';
  const lo = ej.tipoCarga === 'peso_corporal' ? 'lo' : 'la';
  const cabeza = (
    <Separador titulo="Tu historial" derecha={ses.length ? <Txt v="sec">{`${ses.length} ${ses.length === 1 ? 'sesión' : 'sesiones'}`}</Txt> : undefined} />
  );
  if (!ses.length) {
    return (
      <>
        {cabeza}
        <Tarjeta>
          <Txt v="h3">Todavía no {ej.duenoId ? 'lo' : lo} registras</Txt>
          <Txt v="sec" className="mt-1">
            Cuando {ej.duenoId ? 'lo' : lo} hagas en una sesión, aquí verás cada serie, tu récord y cómo avanzas.
          </Txt>
        </Tarjeta>
      </>
    );
  }
  const e1 = (s: PuntoHistorial) => s.e1rm ?? calcularE1rm(s.pesoKg, s.reps) ?? s.pesoKg;
  if (soloReps) {
    const mejor = Math.max(...ses.map((s) => s.reps));
    return (
      <>
        {cabeza}
        <View className="flex-row gap-2">
          <CuadroCifra valor={String(mejor)} unidad={ej.tipoCarga === 'tiempo' ? 's' : 'reps'} leyenda="récord" />
          <CuadroCifra valor={String(ses.length)} leyenda="sesiones" />
        </View>
        <ListaSesiones ses={ses} ej={ej} record={0} todas={todas} onTodas={onTodas} />
      </>
    );
  }
  const record = Math.max(...ses.map(e1));
  const previo = ses.length > 1 ? Math.max(...ses.slice(1).map(e1)) : null;
  const mejor = ses.find((s) => Math.abs(e1(s) - record) < 0.01) ?? ses[0];
  const cronologico = [...ses].reverse();
  const iSel = sel ?? cronologico.length - 1;
  const s = cronologico[iSel] ?? cronologico[cronologico.length - 1];
  const valor = (x: PuntoHistorial) => (metrica === 'kg' ? x.pesoKg : e1(x));
  return (
    <>
      {cabeza}
      <View className="flex-row gap-2">
        <CuadroCifra
          valor={cifra1(record)}
          unidad="kg"
          leyenda="récord 1RM est."
          extra={previo !== null && record > previo ? <Text className="font-mono-bold text-acento-texto">{` +${cifra1(record - previo)}`}</Text> : null}
        />
        {mejor ? <CuadroCifra valor={`${kg(mejor.pesoKg)}×${mejor.reps}`} leyenda="mejor serie" /> : null}
        <CuadroCifra valor={String(ses.length)} leyenda="sesiones" />
      </View>
      {ses.length >= 3 && s ? (
        <Tarjeta className="mt-2">
          <View className="flex-row gap-2">
            <Chip titulo="1RM estimado" activo={metrica === 'e1rm'} onPress={() => onMetrica('e1rm')} />
            <Chip titulo="Mejor serie" activo={metrica === 'kg'} onPress={() => onMetrica('kg')} />
          </View>
          <View className="mt-2" accessibilityLiveRegion="polite">
            <Txt v="ceja">{[fechaCorta(s.fecha), s.dia].filter(Boolean).join(' · ')}</Txt>
            <Text className="font-mono-bold text-[30px] text-texto">
              {cifra1(valor(s))}
              <Text className="text-[14px] text-texto-2"> kg</Text>
            </Text>
            <Txt v="sec">
              {metrica === 'kg' ? `${kg(s.pesoKg)} kg × ${s.reps} · 1RM estimado ${cifra1(e1(s))} kg` : `Mejor serie ${kg(s.pesoKg)} kg × ${s.reps}`}
              {Math.abs(e1(s) - record) < 0.01 ? <Text className="font-sans-bold text-acento-texto"> · récord</Text> : null}
            </Txt>
          </View>
          <LineaTiempo
            puntos={cronologico.map((x) => ({ fecha: x.fecha, valor: valor(x) }))}
            seleccion={iSel}
            onElegir={onSel}
            etiqueta={`${metrica === 'kg' ? 'Kilos de la mejor serie' : '1RM estimado'} en el tiempo, ${ses.length} sesiones`}
          />
          <Txt v="sec" className="mt-2">
            {metrica === 'kg'
              ? 'Los kilos de tu mejor serie en cada sesión.'
              : '1RM estimado: lo que podrías levantar una vez, calculado con tu mejor serie de cada sesión.'}{' '}
            Toca el gráfico para ver cada sesión.
          </Txt>
        </Tarjeta>
      ) : null}
      <ListaSesiones ses={ses} ej={ej} record={record} todas={todas} onTodas={onTodas} />
    </>
  );
}

function ListaSesiones({ ses, ej, record, todas, onTodas }: { ses: PuntoHistorial[]; ej: Ejercicio; record: number; todas: boolean; onTodas: () => void }) {
  const soloReps = ej.tipoCarga !== 'kg';
  const visibles = todas ? ses : ses.slice(0, 5);
  return (
    <Tarjeta className="mt-2 py-2">
      <View className="flex-row justify-between pb-1">
        <Txt v="ceja">{soloReps ? 'Sesión · repeticiones por serie' : 'Sesión · kg × reps por serie'}</Txt>
        <Txt v="ceja">{soloReps ? 'Mejor' : '1RM est.'}</Txt>
      </View>
      {visibles.map((s, i) => {
        const reps = s.series.length ? s.series.map((x) => x.reps).join(' · ') : String(s.reps);
        const e1 = s.e1rm ?? calcularE1rm(s.pesoKg, s.reps);
        const esRecord = !soloReps && e1 !== null && Math.abs(e1 - record) < 0.01;
        return (
          <View key={`${s.fecha}-${i}`} className="min-h-[56px] flex-row items-center gap-3 border-t border-sup-alta py-2">
            <Text className="w-14 font-mono-bold text-[13px] text-texto-2">{fechaCorta(s.fecha)}</Text>
            <View className="flex-1">
              <Text className="font-mono-bold text-[15px] text-texto">{soloReps ? `${reps} reps` : `${kg(s.pesoKg)} × ${reps}`}</Text>
              {s.dia || s.rutina ? <Txt v="sec">{[s.dia, s.rutina].filter(Boolean).join(' · ')}</Txt> : null}
            </View>
            <View className="items-end gap-1">
              <Text className="font-mono-bold text-[15px] text-texto">{soloReps ? s.reps : e1 !== null ? cifra1(e1) : ''}</Text>
              {esRecord ? <Marca texto="Récord" tono="llena" /> : null}
            </View>
          </View>
        );
      })}
      {ses.length > 5 ? (
        <Boton titulo={todas ? 'Ver menos' : `Ver las ${ses.length} sesiones`} variante="fantasma" className="self-start" onPress={onTodas} />
      ) : null}
    </Tarjeta>
  );
}

// ── Observaciones ────────────────────────────────────────────────────────────
function FilaObservacion({ o, yoId, primera }: { o: Observacion; yoId: string | null; primera: boolean }) {
  const autor = o.autorId && o.autorId === yoId ? 'Tú' : (o.autorNombre ?? 'Tú');
  return (
    <View className={primera ? '' : 'mt-3 border-t border-sup-alta pt-3'}>
      <View className="flex-row flex-wrap items-center gap-2">
        <Marca texto={o.tipo === 'dolor' ? 'Dolor' : o.tipo === 'consejo' ? 'Consejo' : 'Observación'} tono={o.tipo === 'dolor' ? 'peligro' : o.tipo === 'consejo' ? 'llena' : 'normal'} />
        <Txt v="sec">{[autor, o.fecha ? fechaCorta(o.fecha) : 'hoy'].join(' · ')}</Txt>
      </View>
      {o.zona ? (
        <Text className="mt-2 font-sans-semibold text-[14px] text-texto">
          {o.zona} · <Text className="font-mono-bold">{o.intensidad ?? ''}</Text> de 10
        </Text>
      ) : null}
      {o.texto ? (
        <Txt v="cuerpo" className="mt-1">
          {o.texto}
        </Txt>
      ) : null}
    </View>
  );
}

function HojaObservar({
  visible,
  ej,
  propio,
  nombreEnt,
  onCerrar,
  onGuardada,
}: {
  visible: boolean;
  ej: Ejercicio;
  propio: boolean;
  nombreEnt: string | null;
  onCerrar: () => void;
  onGuardada: (o: Observacion) => void;
}) {
  const aviso = useAviso();
  const [tipo, setTipo] = useState<'observacion' | 'dolor'>('observacion');
  const [zona, setZona] = useState('Rodilla');
  const [intensidad, setIntensidad] = useState(3);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function cerrar() {
    setTipo('observacion');
    setTexto('');
    setError(null);
    onCerrar();
  }

  async function guardar() {
    const t = texto.trim();
    if (!t && tipo !== 'dolor') {
      setError('Escribe qué quieres anotar.');
      return;
    }
    setGuardando(true);
    try {
      const zonaApi = zona === 'Otra' ? 'Otra zona' : zona;
      const o = await crearObservacion({
        tipo,
        exercise_id: ej.id,
        texto: t,
        ...(tipo === 'dolor' ? { dolor_zona: zonaApi, dolor_intensidad: intensidad } : {}),
      });
      onGuardada({ ...o, tipo, texto: t, zona: tipo === 'dolor' ? zonaApi : null, intensidad: tipo === 'dolor' ? intensidad : null, autorNombre: 'Tú', fecha: o.fecha });
      setTexto('');
      setTipo('observacion');
      setError(null);
    } catch (e) {
      aviso.mostrar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Hoja
      visible={visible}
      onCerrar={cerrar}
      titulo={`Anotar en ${ej.nombre}`}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={cerrar} />
          <Boton titulo="Guardar" alto className="flex-1" cargando={guardando} onPress={guardar} />
        </>
      }
    >
      <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
        <View className="mt-3 flex-row gap-2">
          <Chip titulo="Observación" activo={tipo === 'observacion'} onPress={() => (setTipo('observacion'), setError(null))} />
          <Chip titulo="Dolor" activo={tipo === 'dolor'} onPress={() => (setTipo('dolor'), setError(null))} />
        </View>
        {tipo === 'dolor' ? (
          <>
            <Txt v="etiquetaCampo" className="mt-4">
              Dónde
            </Txt>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {ZONAS.map((z) => (
                <Chip key={z} titulo={z} activo={zona === z} onPress={() => setZona(z)} />
              ))}
            </View>
            <Txt v="etiquetaCampo" className="mb-2 mt-4">
              Cuánto molesta
            </Txt>
            <Paso valor={intensidad} onCambiar={setIntensidad} min={1} max={10} unidad="de 10" etiqueta="cuánto molesta" />
            <Txt v="sec" className="mt-2">
              {nombreEnt ? `Con 7 o más, ${nombreEnt} recibe un aviso al instante.` : 'Con 7 o más, conviene parar este ejercicio.'}
            </Txt>
          </>
        ) : null}
        <View className="mt-4">
          <CampoTexto
            etiqueta={tipo === 'dolor' ? 'Qué dolor sentiste' : 'Tu observación'}
            valor={texto}
            onCambiar={(v) => (setTexto(v), setError(null))}
            multilinea
            error={error}
            placeholder={tipo === 'dolor' ? 'Por ejemplo: molesta al bajar, en la última serie' : 'Por ejemplo: con zapatillas planas me siento más estable'}
          />
        </View>
        <Txt v="sec" className="mt-2">
          {propio || !nombreEnt ? 'Queda en tu historial de este ejercicio.' : `${nombreEnt} la ve en tu ficha y te puede responder.`}
        </Txt>
      </ScrollView>
    </Hoja>
  );
}

// ── Formulario de ejercicio propio ───────────────────────────────────────────
const EQUIPOS_FORM = [...EQUIPOS_FILTRO, 'Otro'];
/** La biblioteca guarda «Mancuerna»; las maquetas dicen «Mancuernas». */
const equipoApi = (e: string) => (e === 'Mancuernas' ? 'Mancuerna' : e);
const equipoVista = (e: string) => (e === 'Mancuerna' ? 'Mancuernas' : e);

function FormularioEjercicio({ inicial, editar, onListo }: { inicial?: Partial<BorradorEjercicio>; editar?: Ejercicio; onListo?: () => void }) {
  const { rol } = useSesion();
  const aviso = useAviso();
  const insets = useSafeAreaInsets();
  const ent = rol === 'entrenador';
  const catalogo = useCarga('ejercicios', listarEjercicios);
  const existentes = useMemo(() => catalogo.datos ?? [], [catalogo.datos]);
  const [b, setB] = useState<BorradorEjercicio>(() =>
    editar
      ? { nombre: editar.nombre, grupo: editar.grupo, equipo: equipoVista(editar.equipo), registro: registroDe(editar.tipoCarga), nota: editar.instrucciones.join('\n') }
      : { nombre: inicial?.nombre ?? '', grupo: inicial?.grupo ?? '', equipo: inicial?.equipo ?? '', registro: 'kg', nota: '' },
  );
  const [errores, setErrores] = useState<{ nombre?: string; grupo?: string; equipo?: string }>({});
  const [guardando, setGuardando] = useState(false);

  const poner = (cambio: Partial<BorradorEjercicio>) => {
    setB((x) => ({ ...x, ...cambio }));
    setErrores((e) => {
      const n = { ...e };
      for (const k of Object.keys(cambio)) delete n[k as keyof typeof n];
      return n;
    });
  };

  async function guardar() {
    const e = erroresEjercicio(b, existentes, editar?.id);
    setErrores(e);
    if (Object.keys(e).length) {
      aviso.mostrar('Revisa lo marcado en rojo.');
      return;
    }
    setGuardando(true);
    try {
      const cuerpo = { ...cuerpoEjercicio(b), equipo: equipoApi(b.equipo) };
      if (editar) {
        await cambiarEjercicio(editar.id, cuerpo);
        aviso.mostrar('Guardaste los cambios.');
        onListo?.();
      } else {
        const nuevo = await crearEjercicio(cuerpo);
        catalogo.poner((l) => [nuevo, ...(l ?? [])]);
        aviso.mostrar(`Creaste «${b.nombre.trim()}». Ya puedes usarlo en tus rutinas.`);
        if (nuevo.id) router.replace({ pathname: '/ejercicio/[id]', params: { id: nuevo.id } });
        else router.back();
      }
    } catch (err) {
      aviso.mostrar(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  const volver = () => (editar ? onListo?.() : router.canGoBack() ? router.back() : router.replace(ent ? '/entrenador/ejercicios' : '/ejercicios'));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      <View className="px-4">
        <Cabecera atras titulo={editar ? 'Editar ejercicio' : 'Nuevo ejercicio'} alVolver={volver} />
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        {catalogo.sinConexion ? <BandaSinConexion texto="Para guardar un ejercicio nuevo necesitas señal." /> : null}
        <CampoTexto
          etiqueta="Nombre"
          valor={b.nombre}
          onCambiar={(v) => poner({ nombre: v })}
          placeholder="Por ejemplo: Curl nórdico"
          error={errores.nombre}
          autoCapitalize="sentences"
        />
        <Txt v="etiquetaCampo" className="mt-5">
          Grupo muscular
        </Txt>
        <View className={`mt-1 flex-row flex-wrap gap-2 ${errores.grupo ? 'rounded-control border-2 border-peligro px-2' : ''}`}>
          {GRUPOS_FILTRO.filter((g) => g !== 'Todos').map((g) => (
            <Chip key={g} titulo={g} activo={b.grupo === g} onPress={() => poner({ grupo: g })} />
          ))}
        </View>
        {errores.grupo ? <Txt v="error">{errores.grupo}</Txt> : null}
        <Txt v="etiquetaCampo" className="mt-5">
          Equipo
        </Txt>
        <View className={`mt-1 flex-row flex-wrap gap-2 ${errores.equipo ? 'rounded-control border-2 border-peligro px-2' : ''}`}>
          {EQUIPOS_FORM.map((e) => (
            <Chip key={e} titulo={e} activo={b.equipo === e} onPress={() => poner({ equipo: e })} />
          ))}
        </View>
        {errores.equipo ? <Txt v="error">{errores.equipo}</Txt> : null}
        <Txt v="etiquetaCampo" className="mt-5">
          Cómo lo registras
        </Txt>
        <View className="mt-1 flex-row flex-wrap gap-2">
          {OPCIONES_REGISTRO.map((o) => (
            <Chip key={o.id} titulo={o.nombre} activo={b.registro === o.id} onPress={() => poner({ registro: o.id })} />
          ))}
        </View>
        <Text className="mt-5 font-sans-bold text-[16px] text-texto">
          Referencia <Text className="font-sans-medium text-texto-2">· opcional</Text>
        </Text>
        <View className="mt-2 rounded-control border-2 border-dashed border-borde p-4">
          <Txt v="sec">Una foto o un video corto para recordar cómo se hace. Hasta 50 MB.</Txt>
          <View className="mt-3 flex-row gap-2">
            {['Grabar video', 'Elegir archivo'].map((t) => (
              <Boton
                key={t}
                titulo={t}
                variante="secundario"
                className="flex-1"
                onPress={() => aviso.mostrar('Subir fotos y videos llega en la próxima versión de la app.')}
              />
            ))}
          </View>
          <Txt v="sec" className="mt-2 text-[13px]">
            {ent ? 'La ven tú y tus clientes.' : 'Solo la ven tú y tu entrenador.'}
          </Txt>
        </View>
        <View className="mt-5">
          <CampoTexto
            etiqueta="Cómo se hace · opcional"
            valor={b.nota}
            onCambiar={(v) => poner({ nota: v })}
            multilinea
            placeholder="En pasos cortos. Por ejemplo: rodillas en una colchoneta, baja lento con el cuerpo recto."
          />
        </View>
      </ScrollView>
      <BarraAccion>
        <Boton titulo={editar ? 'Guardar cambios' : 'Guardar ejercicio'} alto ancho cargando={guardando} disabled={catalogo.sinConexion} onPress={guardar} />
      </BarraAccion>
    </KeyboardAvoidingView>
  );
}
