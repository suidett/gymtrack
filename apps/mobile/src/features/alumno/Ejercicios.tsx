// ─────────────────────────────────────────────────────────────────────────────
// Ejercicios · Zona: Alumno (área Ejercicios, PAN-09)
//
// Qué hace: la biblioteca de docs/pantallas/ejercicios.html: buscador (sin tildes, resalta lo que
// coincide), chips de grupo (uno) y de equipo (varios), el conteo con «Quitar filtros», los
// propios arriba y la biblioteca GymTrack abajo, cada fila con su miniatura y el récord del
// alumno. Sin resultados muestra lo más parecido y el botón «Crear «…»» con el nombre ya escrito
// (APP-024). La lista se guarda en el teléfono y se filtra ahí mismo, así funciona sin señal.
// Tócalo cuando: cambie la lista, la búsqueda o los filtros.
// No lo toques para: el detalle ni el formulario de un ejercicio (./DetalleEjercicio.tsx).
// Depende de: ./api, ./logica, ./piezas, ./useCarga, react-native-svg, @/components/ui y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { Boton, Chip, Simbolo, Txt } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { listarEjercicios } from './api';
import type { Ejercicio } from './datos';
import { conMayuscula, EQUIPOS_FILTRO, filtrarEjercicios, GRUPOS_FILTRO, parecidos, sinTildes, textoConteo, type FiltroEjercicios } from './logica';
import { BandaSinConexion, Buscador, ErrorCarga, Esqueleto, MarcoPestana } from './piezas';
import { useCarga } from './useCarga';

export function PantallaEjercicios() {
  const { usuario, rol } = useSesion();
  const ent = rol === 'entrenador';
  const carga = useCarga('ejercicios', listarEjercicios);
  const [f, setF] = useState<FiltroEjercicios>({ q: '', grupo: 'Todos', equipos: [] });
  const todos = useMemo(() => carga.datos ?? [], [carga.datos]);
  const res = useMemo(() => filtrarEjercicios(todos, f), [todos, f]);
  const conFiltros = f.grupo !== 'Todos' || f.equipos.length > 0;
  const sinRed = carga.sinConexion;
  const yo = usuario?.id ?? null;

  const crear = () =>
    router.push({
      pathname: '/ejercicio/[id]',
      params: {
        id: 'nuevo',
        ...(f.q.trim() ? { nombre: conMayuscula(f.q) } : {}),
        ...(f.grupo !== 'Todos' ? { grupo: f.grupo } : {}),
        ...(f.equipos[0] ? { equipo: f.equipos[0] } : {}),
      },
    });

  const quitarFiltros = () => setF((x) => ({ ...x, grupo: 'Todos', equipos: [] }));

  const fila = (x: Ejercicio) => (
    <FilaEjercicio
      key={x.id}
      x={x}
      q={f.q}
      conRecord={!ent}
      onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: x.id } })}
    />
  );

  const seccion = (titulo: string, xs: Ejercicio[]) =>
    xs.length ? (
      <View key={titulo}>
        <Txt v="ceja" className="mt-3">
          {titulo}
        </Txt>
        {xs.map(fila)}
      </View>
    ) : null;

  const listas = (xs: Ejercicio[]) => (
    <>
      {seccion('Creados por ti', xs.filter((x) => x.duenoId && x.duenoId === yo))}
      {seccion(ent ? 'De otros' : 'De tu entrenador', xs.filter((x) => x.duenoId && x.duenoId !== yo))}
      {seccion('Biblioteca GymTrack', xs.filter((x) => !x.duenoId))}
    </>
  );

  let cuerpo;
  if (carga.estado === 'cargando') {
    cuerpo = (
      <>
        <Txt v="sec" className="my-3">
          Cargando ejercicios…
        </Txt>
        <Esqueleto filas={4} etiqueta="Cargando ejercicios" />
      </>
    );
  } else if (carga.estado === 'error') {
    cuerpo = <ErrorCarga texto="No pudimos cargar los ejercicios." onReintentar={carga.recargar} />;
  } else if (!res.length) {
    const q = f.q.trim();
    const parec = q ? parecidos(todos, q) : [];
    cuerpo = (
      <>
        <View className="mt-6 items-start gap-2">
          <Txt v="h3">{q ? `No encontramos «${q}»` : 'Nada con estos filtros'}</Txt>
          <Txt v="sec">
            {q
              ? ent
                ? 'Créalo como ejercicio propio. Quedará disponible para las rutinas de tus clientes.'
                : 'Créalo como ejercicio propio. Tú eliges el grupo y el equipo, y puedes subir una foto o un video de referencia.'
              : 'Prueba con otro grupo o quita el equipo.'}
          </Txt>
          {conFiltros ? <Boton titulo="Buscar en todos los grupos" variante="fantasma" className="-ml-3" onPress={quitarFiltros} /> : null}
        </View>
        {parec.length ? (
          <>
            <Txt v="ceja" className="mt-5">
              Lo más parecido
            </Txt>
            {parec.map(fila)}
          </>
        ) : null}
      </>
    );
  } else {
    cuerpo = (
      <>
        <View className="mt-1 min-h-[48px] flex-row items-center justify-between">
          <Txt v="sec">{textoConteo(res.length, f)}</Txt>
          {conFiltros ? <Boton titulo="Quitar filtros" variante="fantasma" className="-mr-3" onPress={quitarFiltros} /> : null}
        </View>
        {listas(res)}
      </>
    );
  }

  const sinResultados = carga.estado === 'listo' && !res.length && !!f.q.trim();
  return (
    <MarcoPestana
      titulo="Ejercicios"
      derecha={
        <Pressable
          onPress={crear}
          disabled={sinRed}
          accessibilityRole="button"
          accessibilityLabel="Crear ejercicio"
          accessibilityState={{ disabled: sinRed }}
          className="-mr-3 min-h-[48px] flex-row items-center gap-2 rounded-control px-3 active:bg-fantasma-pres"
          style={{ opacity: sinRed ? 0.5 : 1 }}
        >
          <Simbolo tamano={18} />
          <Text className="font-sans-semibold text-[16px] text-texto">Crear</Text>
        </Pressable>
      }
      arriba={
        <View className="pb-1">
          <Buscador valor={f.q} onCambiar={(q) => setF((x) => ({ ...x, q }))} />
          <FilaChips rotulo="Grupo">
            {GRUPOS_FILTRO.map((g) => (
              <Chip key={g} titulo={g} activo={f.grupo === g} onPress={() => setF((x) => ({ ...x, grupo: g }))} />
            ))}
          </FilaChips>
          <FilaChips rotulo="Equipo">
            {EQUIPOS_FILTRO.map((e) => (
              <Chip
                key={e}
                titulo={e}
                activo={f.equipos.includes(e)}
                onPress={() => setF((x) => ({ ...x, equipos: x.equipos.includes(e) ? x.equipos.filter((y) => y !== e) : [...x.equipos, e] }))}
              />
            ))}
          </FilaChips>
        </View>
      }
      accion={sinResultados ? <Boton titulo={`Crear «${conMayuscula(f.q)}»`} alto ancho disabled={sinRed} onPress={crear} /> : null}
    >
      {sinRed ? <BandaSinConexion texto="Ves los ejercicios guardados en tu teléfono. Para crear uno nuevo necesitas señal." /> : null}
      {cuerpo}
    </MarcoPestana>
  );
}

function FilaChips({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <View className="-mx-4 mt-1">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-1.5 px-4" accessibilityLabel={rotulo}>
        <Text className="w-14 font-sans-medium text-[13px] text-texto-2">{rotulo}</Text>
        {children}
      </ScrollView>
    </View>
  );
}

// ── Fila de un ejercicio ─────────────────────────────────────────────────────
function FilaEjercicio({ x, q, conRecord, onPress }: { x: Ejercicio; q: string; conRecord: boolean; onPress: () => void }) {
  const t = sinTildes(q.trim());
  const i = t ? sinTildes(x.nombre).indexOf(t) : -1;
  const nombre =
    i >= 0 ? (
      <>
        {x.nombre.slice(0, i)}
        <Text className="font-sans-bold underline">{x.nombre.slice(i, i + t.length)}</Text>
        {x.nombre.slice(i + t.length)}
      </>
    ) : (
      x.nombre
    );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${x.nombre}, ${x.grupo}, ${x.equipo}${conRecord && x.record ? `, récord ${x.record}` : ''}`}
      className="min-h-[72px] flex-row items-center gap-3 border-b border-sup-alta py-2.5 active:bg-fantasma-pres"
    >
      <Miniatura patron={x.patron} propio={!!x.duenoId} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-[16px] leading-[21px] text-texto">{nombre}</Text>
        <Text className="mt-0.5 font-sans-medium text-[13px] text-texto-2">{[x.grupo, x.equipo].filter(Boolean).join(' · ')}</Text>
      </View>
      {conRecord && x.record ? (
        <View className="items-end">
          <Text className="mb-1 font-sans-medium text-[12px] text-texto-2">Récord</Text>
          <Text className="font-mono-bold text-[15px] text-texto">{x.record}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── Miniatura: la pose clave de cada patrón ──────────────────────────────────
type Trazo = { t: 'linea'; p: string; clase?: 'banco' | 'barra' } | { t: 'circulo'; cx: number; cy: number; r: number; clase: 'cab' | 'disco' } | { t: 'camino'; d: string; clase: 'banco' | 'barra' };

const FIGURAS: { [p: string]: { vb: string; trazos: Trazo[] } } = {
  rodilla: {
    vb: '9 10 36 36',
    trazos: [
      { t: 'circulo', cx: 25.5, cy: 22, r: 4.5, clase: 'disco' },
      { t: 'linea', p: '33,43 26,43 32,34 20,33 27,22' },
      { t: 'circulo', cx: 30.5, cy: 16.5, r: 3.6, clase: 'cab' },
    ],
  },
  cadera: {
    vb: '13 13 34 34',
    trazos: [
      { t: 'linea', p: '32,43 25,43 27,33 20,24 34,26' },
      { t: 'linea', p: '34,26 33,35' },
      { t: 'circulo', cx: 33, cy: 37.5, r: 4.5, clase: 'disco' },
      { t: 'circulo', cx: 40, cy: 26.5, r: 3.6, clase: 'cab' },
    ],
  },
  empuje: {
    vb: '2 5 40 40',
    trazos: [
      { t: 'camino', d: 'M7 32.5H31M10 32.5V43M28 32.5V43', clase: 'banco' },
      { t: 'circulo', cx: 14, cy: 11.5, r: 4.5, clase: 'disco' },
      { t: 'linea', p: '14,14 14,28 28,28 35,25 37,43' },
      { t: 'circulo', cx: 8.5, cy: 27, r: 3.6, clase: 'cab' },
    ],
  },
  tiron: {
    vb: '5 4 40 40',
    trazos: [
      { t: 'camino', d: 'M10 7H38', clase: 'barra' },
      { t: 'linea', p: '24,7 24,17 24,31 21,37 25,42' },
      { t: 'circulo', cx: 28.5, cy: 14, r: 3.6, clase: 'cab' },
    ],
  },
  core: {
    vb: '1 15 42 42',
    trazos: [
      { t: 'linea', p: '19,43 12,43 12,33 40,41 41,43' },
      { t: 'circulo', cx: 7, cy: 30.5, r: 3.6, clase: 'cab' },
    ],
  },
};

export function Miniatura({ patron, propio, tamano = 52 }: { patron: string; propio: boolean; tamano?: number }) {
  const { c } = useTema();
  if (propio) return <View style={{ width: tamano, height: tamano }} className="rounded-control border-2 border-dashed border-borde" />;
  const fig = FIGURAS[patron === 'aislamiento' ? 'tiron' : patron] ?? FIGURAS.empuje;
  return (
    <View style={{ width: tamano, height: tamano }} className="overflow-hidden rounded-control border border-sup-alta bg-sup" accessibilityElementsHidden importantForAccessibility="no">
      <Svg width="100%" height="100%" viewBox={fig?.vb}>
        {fig?.trazos.map((t, i) => {
          if (t.t === 'circulo')
            return t.clase === 'cab' ? (
              <Circle key={i} cx={t.cx} cy={t.cy} r={t.r} fill={c.texto} />
            ) : (
              <Circle key={i} cx={t.cx} cy={t.cy} r={t.r} fill={c['hecho-fondo']} stroke={c['hecho-borde']} strokeWidth={1.5} />
            );
          if (t.t === 'camino')
            return (
              <Path
                key={i}
                d={t.d}
                fill="none"
                stroke={t.clase === 'barra' ? c['hecho-borde'] : c['texto-2']}
                strokeWidth={t.clase === 'barra' ? 3 : 2.5}
                strokeLinecap="round"
              />
            );
          return <Polyline key={i} points={t.p} fill="none" stroke={c.texto} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />;
        })}
      </Svg>
    </View>
  );
}
