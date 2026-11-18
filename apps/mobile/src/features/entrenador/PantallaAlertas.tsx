// ─────────────────────────────────────────────────────────────────────────────
// Alertas · Zona: Entrenador (app)
//
// Qué hace: la pestaña Alertas del entrenador (pantalla 18, docs/pantallas/alertas.html). «Por
// revisar» lista las abiertas, las nuevas primero, cada una con quién, de qué, el dato que la
// disparó (1RM que no sube, caída frente al promedio, días sin entrenar o dolor de 0 a 10) y,
// en la baja de rendimiento, los motivos del cliente. «Marcar vista» quita la marca de nueva;
// «Resolver» abre la hoja para anotar qué hiciste y la pasa a Resueltas, agrupadas por mes.
// «Cómo funcionan» explica las cuatro reglas. Estados: cargando, error, vacío y resueltas.
// Tócalo cuando: cambie la maqueta de Alertas.
// No lo toques para: los textos de cada alerta (logica.ts) ni las llamadas (api.ts).
// Depende de: @/components/ui, ./instancia, ./logica, ./piezas y ./useCarga.
// ─────────────────────────────────────────────────────────────────────────────
import { fmtNum } from '@gymtrack/shared';
import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Boton, Cabecera, Etiqueta, Hoja, Icono, Pantalla, Tarjeta, Txt, useAviso, type NombreIcono } from '@/components/ui';
import { esSinConexion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import type { Alerta, TipoAlerta } from './contrato';
import { apiEntrenador, useInsigniaAlertas } from './instancia';
import {
  agruparPorMes,
  comoSeResolvio,
  contarNuevas,
  fmtCuando,
  iniciales,
  NOMBRE_TIPO,
  nombreCompleto,
  notaResolver,
  ordenarPorRevisar,
  queDeAlerta,
  SALIDAS_RESOLVER,
  serieEstancamiento,
  textoDatoAlerta,
  type SalidaResolver,
} from './logica';
import { Avatar, Casilla, ErrorCarga, Esq, EscalaDolor } from './piezas';
import { useCarga } from './useCarga';
import { ahoraFecha } from './utilidades';

type Vista = 'revisar' | 'resueltas';

const ICONO: Record<TipoAlerta, NombreIcono> = {
  estancamiento: 'tendencia',
  baja_rendimiento: 'sinDatos',
  sin_sesiones: 'pausa',
  dolor: 'mas',
};

const REGLAS: [TipoAlerta, string][] = [
  ['estancamiento', 'Un ejercicio pasa 3 sesiones seguidas sin superar su mejor 1RM estimado.'],
  [
    'baja_rendimiento',
    'El volumen de una sesión o el 1RM estimado cae 10 % o más frente al promedio de las 4 semanas anteriores. Le pedimos sus motivos al cliente.',
  ],
  ['sin_sesiones', 'Pasan 7 días sin entrenar teniendo una rutina activa.'],
  ['dolor', 'El cliente anota un dolor de 7 o más de 10. Te llega al momento.'],
];

async function cargarAlertas() {
  const [abiertas, resueltas] = await Promise.all([apiEntrenador.listarAlertas(false), apiEntrenador.listarAlertas(true).catch(() => [])]);
  useInsigniaAlertas.getState().fijar(contarNuevas(abiertas));
  return { abiertas, resueltas };
}

const irFicha = (id: string) => (id ? router.push({ pathname: '/cliente/[id]', params: { id } }) : undefined);
const primerNombre = (a: Alerta) => a.cliente.nombre || nombreCompleto(a.cliente);

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function PantallaAlertas() {
  const aviso = useAviso();
  const navigation = useNavigation();
  const carga = useCarga(cargarAlertas);
  const [hoy] = useState(ahoraFecha);
  const [vista, setVista] = useState<Vista>('revisar');
  const [resolviendo, setResolviendo] = useState<Alerta | null>(null);
  const [reglas, setReglas] = useState(false);
  const nuevas = useInsigniaAlertas((s) => s.nuevas);

  // La insignia de esta pestaña sigue a las nuevas. El layout puede leer la misma cuenta.
  useEffect(() => {
    navigation.setOptions({ tabBarBadge: nuevas || undefined });
  }, [navigation, nuevas]);

  const d = carga.datos;
  const abiertas = d ? ordenarPorRevisar(d.abiertas) : [];
  const cuentaNuevas = abiertas.filter((a) => a.estado === 'nueva').length;

  const actualizar = (f: (x: { abiertas: Alerta[]; resueltas: Alerta[] }) => { abiertas: Alerta[]; resueltas: Alerta[] }) => {
    carga.fijar((x) => {
      const nuevo = f(x);
      useInsigniaAlertas.getState().fijar(contarNuevas(nuevo.abiertas));
      return nuevo;
    });
  };

  const fallo = (e: unknown) =>
    aviso.mostrar(esSinConexion(e) ? 'Sin conexión. Intenta de nuevo cuando vuelva la señal.' : 'No se pudo guardar. Intenta de nuevo.');

  const marcarVista = async (a: Alerta) => {
    try {
      await apiEntrenador.cambiarEstadoAlerta(a.id, 'vista');
      actualizar((x) => ({ ...x, abiertas: x.abiertas.map((y) => (y.id === a.id ? { ...y, estado: 'vista' } : y)) }));
      aviso.mostrar(`Marcaste como vista la alerta de ${primerNombre(a)}.`);
    } catch (e) {
      fallo(e);
    }
  };

  const todasVistas = async () => {
    const lista = abiertas.filter((a) => a.estado === 'nueva');
    try {
      await Promise.all(lista.map((a) => apiEntrenador.cambiarEstadoAlerta(a.id, 'vista')));
      actualizar((x) => ({ ...x, abiertas: x.abiertas.map((y) => (y.estado === 'nueva' ? { ...y, estado: 'vista' } : y)) }));
      aviso.mostrar('Marcaste todas como vistas.');
    } catch (e) {
      fallo(e);
      carga.recargar();
    }
  };

  const resolver = async (a: Alerta, elegidas: SalidaResolver[]) => {
    const nota = notaResolver(elegidas);
    try {
      await apiEntrenador.cambiarEstadoAlerta(a.id, 'resuelta', elegidas);
      setResolviendo(null);
      actualizar((x) => ({
        abiertas: x.abiertas.filter((y) => y.id !== a.id),
        resueltas: [{ ...a, estado: 'resuelta', nota: nota ?? null, acciones: [...elegidas], resuelta_at: new Date().toISOString() }, ...x.resueltas],
      }));
      aviso.mostrar(`Resolviste la alerta de ${primerNombre(a)}. Queda en Resueltas.`);
    } catch (e) {
      fallo(e);
    }
  };

  let cuerpo;
  if (carga.fase === 'cargando') {
    cuerpo = (
      <View className="mt-4 gap-3" accessibilityLabel="Cargando alertas">
        {[40, 30, 45].map((w) => (
          <Tarjeta key={w} className="gap-3">
            <Esq ancho={`${w}%`} />
            <Esq ancho="55%" alto={16} />
            <Esq alto={64} />
            <Esq ancho="35%" className="self-end" />
          </Tarjeta>
        ))}
        <Txt v="sec" className="text-center">
          Cargando alertas…
        </Txt>
      </View>
    );
  } else if (!d) {
    cuerpo = (
      <ErrorCarga
        titulo="No pudimos cargar tus alertas"
        texto="Revisa tu conexión e intenta de nuevo. Las alertas nuevas igual te llegan como notificación."
        onReintentar={carga.recargar}
      />
    );
  } else if (vista === 'resueltas') {
    cuerpo = <Resueltas alertas={d.resueltas} />;
  } else if (!abiertas.length) {
    cuerpo = (
      <Tarjeta className="mt-4 items-start gap-2" accessibilityLabel="Sin alertas">
        <View className="h-10 w-10 items-center justify-center rounded-control bg-hecho-fondo">
          <IconoVisto />
        </View>
        <Txt v="h2">Todo al día</Txt>
        <Txt v="sec">
          No tienes alertas por revisar. Te avisamos cuando alguien no avance, baje su rendimiento, pase 7 días sin entrenar o anote un dolor fuerte.
        </Txt>
        {d.resueltas.length ? (
          <Boton titulo={`Ver las ${d.resueltas.length} resueltas`} variante="secundario" ancho className="mt-2" onPress={() => setVista('resueltas')} />
        ) : null}
      </Tarjeta>
    );
  } else {
    cuerpo = (
      <>
        <View className="mt-2 min-h-[48px] flex-row items-center justify-between">
          <Txt v="sec">
            {cuentaNuevas ? (
              <>
                <Text className="font-mono-bold text-texto">{cuentaNuevas}</Text>
                {cuentaNuevas === 1 ? ' nueva, va primero' : ' nuevas, van primero'}
              </>
            ) : (
              'Todas vistas'
            )}
          </Txt>
          {cuentaNuevas ? <Boton titulo="Marcar todas vistas" variante="fantasma" onPress={() => void todasVistas()} /> : null}
        </View>
        <View className="gap-3">
          {abiertas.map((a) => (
            <TarjetaAlerta key={a.id} a={a} hoy={hoy} onVista={() => void marcarVista(a)} onResolver={() => setResolviendo(a)} />
          ))}
        </View>
      </>
    );
  }

  const cuenta = (n: number) => (carga.fase === 'listo' && d ? ` ${n}` : '');
  return (
    <Pantalla
      cabecera={<Cabecera titulo="Alertas" derecha={<Boton titulo="Cómo funcionan" variante="fantasma" onPress={() => setReglas(true)} />} />}
    >
      {carga.sinRed && d ? (
        <Txt v="sec" accessibilityRole="alert" className="mb-2">
          Sin conexión. Lo que ves es lo último que cargó.
        </Txt>
      ) : null}
      <View className="flex-row gap-2" accessibilityLabel="Filtrar alertas">
        <ChipVista titulo={`Por revisar${cuenta(abiertas.length)}`} activo={vista === 'revisar'} onPress={() => setVista('revisar')} />
        <ChipVista titulo={`Resueltas${cuenta(d?.resueltas.length ?? 0)}`} activo={vista === 'resueltas'} onPress={() => setVista('resueltas')} />
      </View>
      {cuerpo}

      <HojaResolver alerta={resolviendo} onCerrar={() => setResolviendo(null)} onResolver={resolver} />
      <Hoja
        visible={reglas}
        onCerrar={() => setReglas(false)}
        titulo="Cómo funcionan"
        acciones={<Boton titulo="Entendido" alto className="flex-1" onPress={() => setReglas(false)} />}
      >
        <View className="mt-3 gap-4">
          {REGLAS.map(([t, s]) => (
            <View key={t} className="flex-row gap-3">
              <Icono nombre={ICONO[t]} />
              <View className="flex-1">
                <Txt v="h3">{NOMBRE_TIPO[t]}</Txt>
                <Txt v="sec">{s}</Txt>
              </View>
            </View>
          ))}
          <Txt v="sec" className="text-[13px]">
            Mientras una alerta siga abierta no se repite para el mismo ejercicio.
          </Txt>
        </View>
      </Hoja>
    </Pantalla>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function IconoVisto() {
  const { c } = useTema();
  return <Icono nombre="visto" color={c.visto} />;
}

function ChipVista({ titulo, activo, onPress }: { titulo: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: activo }} className="h-12 justify-center">
      <View className={`h-10 justify-center rounded-control border-2 px-3.5 ${activo ? 'border-chip-fondo bg-chip-fondo' : 'border-borde'}`}>
        <Text className={`font-sans-semibold text-[15px] ${activo ? 'text-chip-texto' : 'text-texto'}`}>{titulo}</Text>
      </View>
    </Pressable>
  );
}

function TarjetaAlerta({ a, hoy, onVista, onResolver }: { a: Alerta; hoy: Date; onVista: () => void; onResolver: () => void }) {
  const nombre = nombreCompleto(a.cliente);
  const dolor = a.tipo === 'dolor';
  return (
    <Tarjeta tono={dolor && a.estado === 'nueva' ? 'peligro' : 'normal'} accessibilityLabel={`${NOMBRE_TIPO[a.tipo]}, ${nombre}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icono nombre={ICONO[a.tipo]} tamano={18} />
          <Text className={`font-sans-semibold text-[13px] ${dolor ? 'text-peligro' : 'text-texto'}`}>{NOMBRE_TIPO[a.tipo]}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {a.estado === 'nueva' ? <Etiqueta texto="Nueva" acento /> : null}
          <Txt v="sec" className="text-[13px]">
            {fmtCuando(a.created_at, hoy)}
          </Txt>
        </View>
      </View>
      <Pressable
        onPress={() => irFicha(a.cliente.id)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir la ficha de ${nombre}`}
        className="mt-2 min-h-[56px] flex-row items-center gap-3 active:opacity-80"
      >
        <Avatar iniciales={iniciales(a.cliente)} />
        <View className="flex-1">
          <Txt v="cuerpoMedio">{nombre}</Txt>
          {queDeAlerta(a) ? <Txt v="sec">{queDeAlerta(a)}</Txt> : null}
        </View>
        <Txt v="sec">Ficha</Txt>
        <Icono nombre="adelante" tamano={18} />
      </Pressable>
      <View className="mt-2">
        <Txt v="cuerpo">{textoDatoAlerta(a)}</Txt>
        <DatoAlerta a={a} />
      </View>
      {a.tipo === 'estancamiento' && a.cliente.id ? (
        <View className="-ml-3 mt-1 self-start">
          <Boton
            titulo="Ajustar sus cargas"
            variante="fantasma"
            onPress={() => router.push({ pathname: '/cliente/[id]/ajustar-cargas', params: { id: a.cliente.id } })}
          />
        </View>
      ) : null}
      {a.tipo === 'baja_rendimiento' ? <Motivos a={a} hoy={hoy} /> : null}
      <View className="mt-3 flex-row items-center justify-end gap-2">
        {a.estado === 'nueva' ? <Boton titulo="Marcar vista" variante="fantasma" className="mr-auto" onPress={onVista} /> : null}
        <Boton titulo="Resolver" variante="secundario" onPress={onResolver} />
      </View>
    </Tarjeta>
  );
}

/** El gráfico corto de cada tipo. */
function DatoAlerta({ a }: { a: Alerta }) {
  const { c } = useTema();
  const d = a.detalle;
  if (a.tipo === 'dolor') {
    const n = typeof d.intensidad === 'number' ? d.intensidad : 0;
    const nota = typeof d.texto === 'string' ? d.texto : '';
    return (
      <View className="mt-3 gap-1">
        <EscalaDolor n={n} />
        <View className="flex-row justify-between">
          <Txt v="sec">0</Txt>
          <Txt v="sec">10</Txt>
        </View>
        {nota ? <Txt v="cuerpo">«{nota}»</Txt> : null}
      </View>
    );
  }
  if (a.tipo === 'estancamiento') {
    const serie = serieEstancamiento(a);
    if (serie.length < 2) return null;
    const W = 320;
    const H = 100;
    const x0 = 24;
    const x1 = 296;
    const vals = serie.map((p) => p.valor);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.6, (hi - lo) * 0.25);
    const X = (i: number) => x0 + (i * (x1 - x0)) / (serie.length - 1);
    const Y = (v: number) => 70 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * 36;
    const desde = Math.max(0, serie.length - 3);
    const bx = X(desde) - 20;
    const bw = X(serie.length - 1) - X(desde) + 40;
    const corta = (iso: string) => {
      const f = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
      return Number.isNaN(f.getTime()) ? iso : `${f.getDate()}/${f.getMonth() + 1}`;
    };
    return (
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessible accessibilityLabel={`1RM estimado por sesión: ${serie.map((p) => `${fmtNum(p.valor)} kilos`).join(', ')}`}>
        <Rect x={bx} y={2} width={bw} height={H - 22} rx={4} fill={c['sup-alta']} />
        <SvgText x={bx + bw / 2} y={16} fontSize={11} fill={c['texto-2']} textAnchor="middle">
          3 sesiones sin subir
        </SvgText>
        <Polyline points={serie.map((p, i) => `${X(i)},${Y(p.valor)}`).join(' ')} fill="none" stroke={c.accion} strokeWidth={2} />
        {serie.map((p, i) => [
          <Circle key={`p${i}`} cx={X(i)} cy={Y(p.valor)} r={4.5} fill={c.accion} />,
          <SvgText key={`v${i}`} x={X(i)} y={Y(p.valor) - 10} fontSize={11} fill={c.texto} textAnchor="middle">
            {fmtNum(p.valor)}
          </SvgText>,
          <SvgText key={`f${i}`} x={X(i)} y={H - 4} fontSize={11} fill={c['texto-2']} textAnchor="middle">
            {corta(p.fecha)}
          </SvgText>,
        ])}
      </Svg>
    );
  }
  if (a.tipo === 'baja_rendimiento') {
    const valor = typeof d.valor === 'number' ? d.valor : null;
    const prom = typeof d.promedio === 'number' ? d.promedio : null;
    if (valor === null || prom === null || !prom) return null;
    const t = d.medida === 'e1rm' ? 'kg' : 't';
    const f = (v: number) => `${fmtNum(t === 't' ? v / 1000 : v)} ${t}`;
    const top = Math.max(prom, valor);
    return (
      <View className="mt-3 gap-2" accessible accessibilityLabel={`Promedio de 4 semanas ${f(prom)}; ahora ${f(valor)}`}>
        {[
          ['Promedio 4 sem.', prom, 'bg-borde/45'],
          ['Esta vez', valor, 'bg-peligro'],
        ].map(([rot, v, color]) => (
          <View key={rot as string} className="flex-row items-center gap-2">
            <Txt v="sec" className="w-28 text-[13px]">
              {rot as string}
            </Txt>
            <View className={`h-4 rounded-[2px] ${color as string}`} style={{ width: `${Math.max(4, ((v as number) / top) * 45)}%` }} />
            <Text className="font-mono-bold text-[13px] text-texto">{f(v as number)}</Text>
          </View>
        ))}
      </View>
    );
  }
  // Sin sesiones: los últimos 14 días, los entrenados en ámbar.
  const entrenados = Array.isArray(d.dias_entrenados) ? (d.dias_entrenados as unknown[]).filter((x): x is number => typeof x === 'number') : [];
  return (
    <View className="mt-3 flex-row gap-0.5" accessible accessibilityLabel={`Entrenó ${entrenados.length} de los últimos 14 días`}>
      {Array.from({ length: 14 }, (_, i) => (
        <View
          key={i}
          className={`h-4 flex-1 rounded-[1px] ${entrenados.includes(i) ? 'border border-hecho-borde bg-hecho-fondo' : 'bg-borde/45'} ${i === 13 ? 'border border-texto' : ''}`}
        />
      ))}
    </View>
  );
}

function Motivos({ a, hoy }: { a: Alerta; hoy: Date }) {
  const m = a.motivos;
  if (!m) {
    return (
      <View className="mt-3 border-t border-sup-alta pt-3">
        <Txt v="ceja">Sus motivos</Txt>
        <Txt v="sec">
          Todavía no responde.{a.motivos_pedidos_at ? ` La app se los pidió ${fmtCuando(a.motivos_pedidos_at, hoy, false)}.` : ''}
        </Txt>
      </View>
    );
  }
  return (
    <View className="mt-3 gap-2 border-t border-sup-alta pt-3">
      <Txt v="ceja">Sus motivos{m.respondido_at ? ` · respondió ${fmtCuando(m.respondido_at, hoy)}` : ''}</Txt>
      <View className="flex-row flex-wrap gap-2">
        {m.lista.map((x) => (
          <Etiqueta key={x} texto={x.charAt(0).toUpperCase() + x.slice(1)} />
        ))}
      </View>
      {m.comentario ? <Txt v="cuerpo">«{m.comentario}»</Txt> : null}
      {m.consejos_mostrados ? <Txt v="sec">Vio {m.consejos_mostrados} consejos.</Txt> : null}
    </View>
  );
}

function Resueltas({ alertas }: { alertas: Alerta[] }) {
  if (!alertas.length) {
    return (
      <Tarjeta className="mt-4">
        <Txt v="sec">Todavía no resuelves ninguna alerta.</Txt>
      </Tarjeta>
    );
  }
  return (
    <>
      {agruparPorMes(alertas).map((g, k) => (
        <View key={g.mes} className={k === 0 ? 'mt-4' : 'mt-6'}>
          <View className="mb-2 flex-row items-baseline justify-between">
            <Txt v="h3">{g.mes}</Txt>
            <Txt v="sec">
              <Text className="font-mono-bold text-texto">{g.items.length}</Text> {g.items.length === 1 ? 'resuelta' : 'resueltas'}
            </Txt>
          </View>
          <Tarjeta className="px-4 py-0">
            {g.items.map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => irFicha(a.cliente.id)}
                accessibilityRole="button"
                accessibilityLabel={`${nombreCompleto(a.cliente)}, ${NOMBRE_TIPO[a.tipo]}`}
                className={`min-h-[64px] flex-row items-center gap-3 py-2.5 active:opacity-80 ${i < g.items.length - 1 ? 'border-b border-sup-alta' : ''}`}
              >
                <Icono nombre={ICONO[a.tipo]} tamano={20} />
                <View className="flex-1">
                  <Txt v="cuerpoMedio">{nombreCompleto(a.cliente)}</Txt>
                  <Txt v="sec">
                    {NOMBRE_TIPO[a.tipo]}
                    {queDeAlerta(a) ? ` · ${queDeAlerta(a)}` : ''}
                  </Txt>
                  <Txt v="sec" className="text-[13px]">
                    {comoSeResolvio(a)}
                  </Txt>
                </View>
                <Text className="font-mono-medium text-[13px] text-texto-2">
                  {(() => {
                    const f = new Date(a.resuelta_at ?? a.created_at);
                    return Number.isNaN(f.getTime()) ? '' : `${f.getDate()}/${f.getMonth() + 1}`;
                  })()}
                </Text>
                <Icono nombre="adelante" tamano={18} />
              </Pressable>
            ))}
          </Tarjeta>
        </View>
      ))}
    </>
  );
}

function HojaResolver({
  alerta,
  onCerrar,
  onResolver,
}: {
  alerta: Alerta | null;
  onCerrar: () => void;
  onResolver: (a: Alerta, elegidas: SalidaResolver[]) => Promise<void>;
}) {
  const [elegidas, setElegidas] = useState<SalidaResolver[]>([]);
  const [enviando, setEnviando] = useState(false);
  const cerrar = () => {
    setElegidas([]);
    onCerrar();
  };
  return (
    <Hoja
      visible={!!alerta}
      onCerrar={cerrar}
      titulo="Resolver alerta"
      texto={alerta ? `${NOMBRE_TIPO[alerta.tipo]} · ${nombreCompleto(alerta.cliente)}${queDeAlerta(alerta) ? ` · ${queDeAlerta(alerta)}` : ''}` : undefined}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={cerrar} />
          <Boton
            titulo="Resolver"
            alto
            className="flex-1"
            cargando={enviando}
            onPress={async () => {
              if (!alerta) return;
              setEnviando(true);
              await onResolver(alerta, elegidas);
              setEnviando(false);
              setElegidas([]);
            }}
          />
        </>
      }
    >
      <Txt v="etiquetaCampo" className="mt-4">
        ¿Qué hiciste? Opcional, puedes marcar varias
      </Txt>
      <View className="mt-1">
        {SALIDAS_RESOLVER.map((s) => (
          <Casilla
            key={s.id}
            titulo={s.enHoja}
            marcada={elegidas.includes(s.id)}
            onCambiar={(v) => setElegidas((p) => (v ? [...p, s.id] : p.filter((x) => x !== s.id)))}
          />
        ))}
      </View>
    </Hoja>
  );
}
