// ─────────────────────────────────────────────────────────────────────────────
// Ficha del cliente · Zona: Entrenador (app)
//
// Qué hace: la ficha de un cliente vista por su entrenador (pantalla 17, docs/pantallas/ficha.html):
// quién es y desde cuándo, el dolor sin responder (va primero), adherencia, sesiones y récords
// del mes, la alerta abierta (lleva a Ajustar cargas), la rutina activa con su semana, las
// últimas sesiones, el volumen por semana, observaciones y dolores con sus respuestas, peso y
// medidas, la encuesta (punto de partida) y Desvincular. La acción de abajo cambia según lo que
// más importa: «Asignar rutina», «Responder a…» o «Escribir consejo».
// Un id que no es su cliente (o un ex cliente) da 404: se avisa y se vuelve a Clientes.
// Tócalo cuando: cambie la maqueta de la Ficha.
// No lo toques para: los cálculos (logica.ts) ni las llamadas (api.ts).
// Depende de: @/components/ui, ./instancia, ./logica, ./piezas, ./GraficoVolumen y ./useCarga.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi, fmtNum, fmtVolumen, MESES } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  Boton,
  Cabecera,
  Ceja,
  CampoTexto,
  Chips,
  Hoja,
  Icono,
  Pantalla,
  Tarjeta,
  Titulo,
  Txt,
  useAviso,
} from '@/components/ui';
import { esSinConexion } from '@/lib/sesion';
import type { Alerta, Ficha, Observacion, Volumen } from './contrato';
import { GraficoVolumen } from './GraficoVolumen';
import { apiEntrenador } from './instancia';
import {
  accionFicha,
  dolorSinResponder,
  esAbierta,
  fmtCuando,
  fmtDiaCorto,
  fmtDiaLargo,
  edadDesde,
  iniciales,
  leerEncuesta,
  NOMBRE_TIPO,
  nombreCompleto,
  nombreMetodo,
  queDeAlerta,
  textoHoyToca,
  validarMensaje,
  MENSAJE_MAX,
} from './logica';
import { Avatar, CabezaSeccion, ErrorCarga, Esq, EscalaDolor, TresCifras } from './piezas';
import { useCarga } from './useCarga';
import { ahoraFecha } from './utilidades';

type Hojas = 'responder' | 'consejo' | 'desvincular' | null;
type Sobre = 'rutina' | 'sesion';

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function PantallaFicha({ id }: { id: string }) {
  const aviso = useAviso();
  const [hoy] = useState(ahoraFecha);
  const carga = useCarga(async () => {
    const [ficha, volumen] = await Promise.all([apiEntrenador.verFicha(id), apiEntrenador.volumen(id).catch(() => null)]);
    return { ficha, volumen };
  }, id);
  const [hoja, setHoja] = useState<Hojas>(null);

  const noEsTuyo = carga.error instanceof ErrorDeApi && carga.error.estado === 404;
  const cabecera = <Cabecera atras alVolver={() => (router.canGoBack() ? router.back() : router.replace('/entrenador'))} />;

  if (carga.fase === 'cargando') {
    return (
      <Pantalla cabecera={cabecera}>
        <View accessibilityLabel="Cargando la ficha" className="gap-4">
          <View className="flex-row items-center gap-3">
            <Esq ancho={56} alto={56} />
            <View className="flex-1 gap-2">
              <Esq ancho="60%" alto={22} />
              <Esq ancho="45%" alto={12} />
            </View>
          </View>
          <View className="flex-row gap-2">
            <Esq ancho="31%" alto={44} />
            <Esq ancho="31%" alto={44} />
            <Esq ancho="31%" alto={44} />
          </View>
          <Tarjeta className="gap-3">
            <Esq ancho="40%" alto={12} />
            <Esq ancho="62%" alto={26} />
            <Esq alto={40} />
          </Tarjeta>
          <Tarjeta className="gap-3">
            <Esq ancho="55%" />
            <Esq ancho="35%" alto={10} />
          </Tarjeta>
        </View>
      </Pantalla>
    );
  }

  if (!carga.datos) {
    return (
      <Pantalla cabecera={cabecera}>
        {noEsTuyo ? (
          <Tarjeta className="mt-4 gap-2">
            <Txt v="h3" accessibilityRole="alert">
              Esta persona ya no es tu cliente
            </Txt>
            <Txt v="sec">Se desvinculó o el enlace no es de uno de tus clientes. Su historial queda en su cuenta.</Txt>
            <Boton titulo="Volver a Clientes" variante="secundario" ancho className="mt-2" onPress={() => router.replace('/entrenador')} />
          </Tarjeta>
        ) : (
          <ErrorCarga
            titulo="No pudimos cargar la ficha"
            texto={carga.sinRed ? 'Revisa tu conexión e intenta de nuevo.' : 'Intenta de nuevo en un momento.'}
            onReintentar={carga.recargar}
          />
        )}
      </Pantalla>
    );
  }

  const { ficha: f, volumen } = carga.datos;
  const p = f.cliente;
  const corto = p.nombre || 'tu cliente';
  const dolor = dolorSinResponder(f.observaciones);
  const accion = accionFicha(f);

  const botonAccion =
    accion === 'asignar' ? (
      <Boton
        titulo="Asignar rutina"
        alto
        ancho
        onPress={() => router.push({ pathname: '/entrenador/rutinas', params: { cliente: p.id } })}
      />
    ) : accion === 'responder' ? (
      <Boton titulo={`Responder a ${corto}`} alto ancho onPress={() => setHoja('responder')} />
    ) : (
      <Boton titulo="Escribir consejo" alto ancho onPress={() => setHoja('consejo')} />
    );

  const nacimiento = f.encuesta?.respuestas.fecha_nacimiento;
  const edad = p.edad ?? (typeof nacimiento === 'string' ? edadDesde(nacimiento, hoy) : null);
  const desde = [p.vinculado_at ? `Contigo desde el ${fmtDiaLargo(p.vinculado_at)}` : '', edad !== null ? `${edad} años` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <Pantalla cabecera={cabecera} accion={botonAccion}>
      <View className="flex-row items-center gap-3">
        <Avatar iniciales={iniciales(p)} grande />
        <View className="flex-1">
          <Titulo>{nombreCompleto(p)}</Titulo>
          {desde ? <Txt v="sec">{desde}</Txt> : null}
        </View>
      </View>

      {carga.sinRed ? (
        <Txt v="sec" className="mt-3" accessibilityRole="alert">
          Sin conexión. Lo que ves es lo último que cargó.
        </Txt>
      ) : null}

      {dolor ? <TarjetaDolor o={dolor} hoy={hoy} /> : null}

      {f.rutina_activa ? (
        <>
          <View className="mt-5">
            <TresCifras
              borde={false}
              datos={[
                { valor: f.adherencia_4_semanas_pct === null ? '–' : String(f.adherencia_4_semanas_pct), sufijo: f.adherencia_4_semanas_pct === null ? '' : '%', texto: 'adherencia en 4 semanas' },
                { valor: String(f.sesiones_mes), texto: `sesiones en ${MESES[hoy.getMonth()]}` },
                { valor: String(f.records_mes), texto: `récords en ${MESES[hoy.getMonth()]}` },
              ]}
            />
          </View>
          <AlertaAbierta alertas={f.alertas} clienteId={p.id} />
          <RutinaActiva f={f} hoy={hoy} />
        </>
      ) : (
        <SinRutina f={f} />
      )}

      <UltimasSesiones f={f} />
      {volumen && volumen.semanas.length ? <Progreso volumen={volumen} /> : null}
      <Observaciones lista={f.observaciones} hoy={hoy} onConsejo={() => setHoja('consejo')} sinRutina={!f.rutina_activa} />
      <PesoYMedidas f={f} />
      <Encuesta f={f} hoy={hoy} />

      <View className="-ml-3 mt-6 self-start">
        <Boton titulo={`Desvincular a ${corto}`} variante="fantasmaPeligro" onPress={() => setHoja('desvincular')} />
      </View>

      <HojaMensaje
        visible={hoja === 'responder' || hoja === 'consejo'}
        responder={hoja === 'responder' ? dolor : null}
        f={f}
        onCerrar={() => setHoja(null)}
        onEnviado={(texto) => {
          setHoja(null);
          aviso.mostrar(texto);
          carga.recargar();
        }}
      />
      <HojaDesvincular visible={hoja === 'desvincular'} f={f} onCerrar={() => setHoja(null)} />
    </Pantalla>
  );
}

// ── Dolor sin responder ──────────────────────────────────────────────────────
function TarjetaDolor({ o, hoy }: { o: Observacion; hoy: Date }) {
  const n = o.dolor_intensidad ?? 0;
  return (
    <Tarjeta tono="peligro" className="mt-5" accessibilityLabel="Dolor sin responder">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="font-sans-semibold text-[13px] text-peligro">Dolor sin responder</Text>
        <Ceja>{fmtCuando(o.created_at, hoy)}</Ceja>
      </View>
      <View className="mt-3 flex-row gap-4">
        <View className="flex-1">
          <Ceja>Dónde</Ceja>
          <Txt v="h3">{o.dolor_zona ?? 'Sin zona'}</Txt>
        </View>
        <View className="flex-1 gap-1">
          <Ceja>Cuánto molesta</Ceja>
          <EscalaDolor n={n} />
          <Txt v="sec">
            <Text className="font-mono-bold text-texto">{n}</Text> de 10
          </Txt>
        </View>
      </View>
      {o.ejercicio || o.sesion_nombre ? (
        <Txt v="sec" className="mt-2.5">
          {[o.ejercicio ? `En ${o.ejercicio.nombre}` : '', o.sesion_nombre ? `sesión ${o.sesion_nombre}` : ''].filter(Boolean).join(' · ')}
        </Txt>
      ) : null}
      {o.texto ? (
        <Txt v="cuerpo" className="mt-2">
          «{o.texto}»
        </Txt>
      ) : null}
    </Tarjeta>
  );
}

// ── Alerta abierta ───────────────────────────────────────────────────────────
function AlertaAbierta({ alertas, clienteId }: { alertas: Alerta[]; clienteId: string }) {
  const a = alertas.filter(esAbierta).find((x) => x.tipo !== 'dolor') ?? null;
  if (!a) return null;
  const ir = () =>
    a.tipo === 'estancamiento'
      ? router.push({ pathname: '/cliente/[id]/ajustar-cargas', params: { id: clienteId } })
      : router.push('/entrenador/alertas');
  const que = queDeAlerta(a);
  return (
    <Tarjeta onPress={ir} etiqueta={`Alerta abierta: ${NOMBRE_TIPO[a.tipo]}${que ? ` en ${que}` : ''}`} className="mt-4 flex-row items-center gap-3">
      <Icono nombre="tendencia" />
      <View className="flex-1">
        <Ceja>Alerta abierta</Ceja>
        <Txt v="cuerpoMedio">
          {NOMBRE_TIPO[a.tipo]}
          {que ? ` en ${que}` : ''}
        </Txt>
      </View>
      <Icono nombre="adelante" tamano={20} />
    </Tarjeta>
  );
}

// ── Rutina ───────────────────────────────────────────────────────────────────
const MARCA_DIA = {
  hecho: 'border-hecho-borde bg-hecho-fondo',
  toca: 'border-hecho-borde bg-transparent',
  plan: 'border-borde bg-transparent',
  perdido: 'border-peligro bg-peligro',
  descanso: 'border-transparent bg-transparent',
} as const;
const NOMBRE_DIA = { hecho: 'entrenado', toca: 'toca entrenar', plan: 'por entrenar', perdido: 'perdido', descanso: 'descanso' } as const;

function RutinaActiva({ f, hoy }: { f: Ficha; hoy: Date }) {
  const r = f.rutina_activa;
  if (!r) return null;
  const hoyIdx = (hoy.getDay() + 6) % 7;
  return (
    <>
      <CabezaSeccion
        titulo="Rutina activa"
        derecha={
          r.id ? <Boton titulo="Ver rutina" variante="fantasma" onPress={() => router.push({ pathname: '/rutina/[id]', params: { id: r.id } })} /> : null
        }
      />
      <Tarjeta>
        <View className="flex-row items-baseline justify-between">
          <Ceja>{nombreMetodo(r.metodo_progresion)}</Ceja>
          {r.semana_actual !== null && r.semanas !== null ? (
            <Ceja>
              Semana <Text className="font-mono-bold">{r.semana_actual}</Text> de <Text className="font-mono-bold">{r.semanas}</Text>
            </Ceja>
          ) : null}
        </View>
        <Titulo nivel={2} className="mt-1">
          {r.nombre}
        </Titulo>
        {r.semana_dias.length === 7 ? (
          <View className="mt-4 flex-row justify-between">
            {r.semana_dias.map((e, i) => (
              <View key={i} className="items-center gap-1" accessible accessibilityLabel={`${LETRAS[i]}${i === hoyIdx ? ', hoy' : ''}: ${NOMBRE_DIA[e]}`}>
                <View className={`h-7 w-7 items-center justify-center rounded-control border-2 ${MARCA_DIA[e]}`}>
                  {e === 'hecho' ? <Icono nombre="visto" tamano={16} /> : e === 'descanso' ? <View className="h-0.5 w-2 bg-borde" /> : null}
                </View>
                <Text className={`text-[13px] ${i === hoyIdx ? 'font-sans-bold text-texto' : 'font-sans-medium text-texto-2'}`}>{LETRAS[i]}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Txt v="sec" className="mt-3">
          {textoHoyToca(r.hoy)}
        </Txt>
        <View className="mt-4 flex-row gap-2">
          <Boton
            titulo="Ajustar cargas"
            variante="secundario"
            className="flex-1"
            onPress={() => router.push({ pathname: '/cliente/[id]/ajustar-cargas', params: { id: f.cliente.id } })}
          />
          <Boton
            titulo="Cambiar rutina"
            variante="secundario"
            className="flex-1"
            onPress={() => router.push({ pathname: '/entrenador/rutinas', params: { cliente: f.cliente.id } })}
          />
        </View>
      </Tarjeta>
    </>
  );
}

function SinRutina({ f }: { f: Ficha }) {
  const corto = f.cliente.nombre || 'Tu cliente';
  return (
    <Tarjeta className="mt-5" accessibilityLabel="Sin rutina">
      <Ceja>Rutina activa</Ceja>
      <Titulo nivel={2} className="mt-1">
        {corto} todavía no tiene rutina
      </Titulo>
      <Txt v="sec" className="mt-1">
        {f.encuesta ? 'Ya respondió la encuesta. ' : ''}Asígnale una de tus rutinas o ármale una desde cero.
      </Txt>
      <Boton
        titulo="Crear rutina nueva"
        variante="secundario"
        ancho
        className="mt-4"
        onPress={() => router.push({ pathname: '/rutina/nueva', params: { cliente: f.cliente.id } })}
      />
    </Tarjeta>
  );
}

// ── Sesiones y progreso ──────────────────────────────────────────────────────
function UltimasSesiones({ f }: { f: Ficha }) {
  const lista = f.ultimas_sesiones.slice(0, 4);
  return (
    <>
      <CabezaSeccion titulo="Últimas sesiones" />
      {lista.length ? (
        <Tarjeta className="px-4 py-0">
          {lista.map((s, i) => (
            <View key={s.id || i} className={`min-h-[56px] flex-row items-center gap-3 py-2.5 ${i < lista.length - 1 ? 'border-b border-sup-alta' : ''}`}>
              <View className="flex-1">
                <Txt v="cuerpoMedio">{s.nombre}</Txt>
                <Txt v="sec">
                  {fmtDiaCorto(s.cerrada_at)} · <Text className="font-mono-medium">{Math.round(s.duracion_s / 60)}</Text> min
                </Txt>
                {s.records.length ? (
                  <Txt v="cejaAcento" className="mt-0.5">
                    {s.records.length === 1 ? 'Récord en' : 'Récords en'} {s.records.join(' y ')}
                  </Txt>
                ) : null}
              </View>
              <View className="items-end">
                <Text className="font-mono-bold text-[16px] text-texto">{fmtVolumen(s.volumen_kg)}</Text>
                {s.dolores ? (
                  <Text className="font-sans-semibold text-[13px] text-peligro">
                    {s.dolores} {s.dolores === 1 ? 'dolor' : 'dolores'}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </Tarjeta>
      ) : (
        <Tarjeta>
          <Txt v="sec">Todavía no registra sesiones. Aparecen aquí apenas entrene.</Txt>
        </Tarjeta>
      )}
    </>
  );
}

function Progreso({ volumen }: { volumen: Volumen }) {
  const completas = volumen.semanas.filter((s) => !s.en_curso);
  const ultima = completas[completas.length - 1];
  const enCurso = volumen.semanas.find((s) => s.en_curso);
  return (
    <>
      <CabezaSeccion titulo="Progreso" />
      <Tarjeta>
        <Ceja>Volumen por semana</Ceja>
        <View className="mt-2">
          <GraficoVolumen semanas={volumen.semanas} />
        </View>
        {ultima ? (
          <View className="mt-2 flex-row items-baseline justify-between">
            <Txt v="sec">Última semana completa</Txt>
            <Text className="font-mono-bold text-[16px] text-texto">
              {fmtVolumen(ultima.volumen_kg)}
              {volumen.variacion_pct !== null ? (
                <Text className="text-acento-texto">{`  ${volumen.variacion_pct > 0 ? '+' : ''}${fmtNum(volumen.variacion_pct, 0)} %`}</Text>
              ) : null}
            </Text>
          </View>
        ) : null}
        {enCurso ? (
          <Txt v="sec" className="mt-1">
            La barra punteada es esta semana: va en {fmtVolumen(enCurso.volumen_kg)}.
          </Txt>
        ) : null}
      </Tarjeta>
    </>
  );
}

// ── Observaciones ────────────────────────────────────────────────────────────
const SOBRE_TEXTO = (o: Observacion) => (o.routine_id ? 'la rutina' : o.session_id ? 'la sesión' : o.ejercicio ? 'un ejercicio' : 'su cuenta');

function Observaciones({ lista, hoy, onConsejo, sinRutina }: { lista: Observacion[]; hoy: Date; onConsejo: () => void; sinRutina: boolean }) {
  const ordenadas = [...lista].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <CabezaSeccion
        titulo="Observaciones y dolores"
        cifra={ordenadas.length || undefined}
        derecha={sinRutina ? <Boton titulo="Escribir consejo" variante="fantasma" onPress={onConsejo} /> : null}
      />
      {ordenadas.length ? (
        <View className="gap-2">
          {ordenadas.map((o, i) => (
            <Tarjeta key={o.id || i}>
              {o.tipo === 'consejo' ? (
                <NotaAmbar ceja={`Tu consejo · sobre ${SOBRE_TEXTO(o)} · ${fmtCuando(o.created_at, hoy, false)}`} texto={o.texto} />
              ) : (
                <>
                  <Txt v="ceja">
                    <Text className={`font-sans-bold ${o.tipo === 'dolor' ? 'text-peligro' : 'text-texto'}`}>{o.tipo === 'dolor' ? 'Dolor' : 'Observación'}</Text>
                    {o.ejercicio ? ` · ${o.ejercicio.nombre}` : ''} · {fmtCuando(o.created_at, hoy, false)}
                  </Txt>
                  {o.tipo === 'dolor' && (o.dolor_zona || o.dolor_intensidad !== null) ? (
                    <Txt v="cuerpoMedio" className="mt-1">
                      {o.dolor_zona ?? 'Dolor'}
                      {o.dolor_intensidad !== null ? ` · ${o.dolor_intensidad} de 10` : ''}
                    </Txt>
                  ) : null}
                  <Txt v="cuerpo" className="mt-1">
                    «{o.texto}»
                  </Txt>
                  {o.respuesta ? (
                    <View className="mt-3">
                      <NotaAmbar ceja={`Tu respuesta · ${fmtCuando(o.respuesta.created_at, hoy, false)}`} texto={o.respuesta.texto} />
                    </View>
                  ) : o.respondida ? (
                    <Txt v="sec" className="mt-2">
                      Ya le respondiste.
                    </Txt>
                  ) : null}
                </>
              )}
            </Tarjeta>
          ))}
        </View>
      ) : (
        <Tarjeta>
          <Txt v="sec">Todavía no hay observaciones. Si le escribes un consejo, lo verá en Hoy.</Txt>
        </Tarjeta>
      )}
    </>
  );
}

/** Texto con la barra ámbar a la izquierda, como ve el cliente los consejos. */
function NotaAmbar({ ceja, texto }: { ceja: string; texto: string }) {
  return (
    <View className="flex-row gap-3">
      <View className="w-1 rounded-[1px] bg-hecho-fondo" />
      <View className="flex-1">
        <Ceja>{ceja}</Ceja>
        <Txt v="cuerpo" className="mt-0.5">
          {texto}
        </Txt>
      </View>
    </View>
  );
}

// ── Peso, medidas y encuesta ─────────────────────────────────────────────────
function PesoYMedidas({ f }: { f: Ficha }) {
  const peso = f.peso;
  const m = f.medidas;
  if (!peso && !m) return null;
  const medidas: [number | null, string][] = m
    ? [
        [m.cintura_cm, 'cintura'],
        [m.cadera_cm, 'cadera'],
        [m.pecho_cm, 'pecho'],
        [m.brazo_cm, 'brazo'],
        [m.muslo_cm, 'muslo'],
      ]
    : [];
  const conValor = medidas.filter((x): x is [number, string] => x[0] !== null);
  const signo = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNum(Math.abs(n))} kg`;
  return (
    <>
      <CabezaSeccion titulo={m ? 'Peso y medidas' : 'Peso'} />
      <Tarjeta>
        {peso ? (
          <>
            <Ceja>
              Peso corporal · {fmtDiaCorto(peso.fecha)}
              {peso.de_la_encuesta ? ', de la encuesta' : ''}
            </Ceja>
            <Text className="mt-1 font-mono-bold text-[30px] text-texto">
              {fmtNum(peso.actual_kg)}
              <Text className="font-sans-medium text-[16px] text-texto-2"> kg</Text>
            </Text>
            {peso.serie.length >= 3 ? (
              <Txt v="sec">
                {[
                  peso.desde_inicio_kg !== null ? `${signo(peso.desde_inicio_kg)} desde que empezó` : '',
                  peso.ultimos_30_dias_kg !== null ? `${signo(peso.ultimos_30_dias_kg)} en 30 días` : '',
                ]
                  .filter(Boolean)
                  .join('\n')}
              </Txt>
            ) : (
              <Txt v="sec">La tendencia aparece desde el tercer registro.</Txt>
            )}
          </>
        ) : null}
        {conValor.length ? (
          <>
            <View className={`flex-row flex-wrap gap-y-3 ${peso ? 'mt-4 border-t border-sup-alta pt-3.5' : ''}`}>
              {conValor.map(([v, t]) => (
                <View key={t} className="w-1/3">
                  <Text className="font-mono-bold text-[18px] text-texto">{fmtNum(v)}</Text>
                  <Txt v="sec" className="text-[13px]">
                    {t}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt v="sec" className="mt-3">
              Medidas en cm, del {fmtDiaCorto(m?.fecha ?? '')}
              {f.fotos ? ` · ${f.fotos} ${f.fotos === 1 ? 'foto' : 'fotos'}` : ''}
            </Txt>
          </>
        ) : null}
      </Tarjeta>
    </>
  );
}

function Encuesta({ f, hoy }: { f: Ficha; hoy: Date }) {
  if (!f.encuesta) return null;
  const { filas, escribio } = leerEncuesta(f.encuesta.respuestas, f.cliente.edad, hoy);
  return (
    <>
      <CabezaSeccion titulo="Punto de partida" derecha={<Txt v="sec">encuesta del {fmtDiaLargo(f.encuesta.completada_at)}</Txt>} />
      <Tarjeta>
        <View className="flex-row flex-wrap gap-y-3">
          {filas.map(([t, v]) => (
            <View key={t} className="w-1/2 pr-2">
              <Ceja>{t}</Ceja>
              <Txt v="cuerpo">{v}</Txt>
            </View>
          ))}
          {escribio ? (
            <View className="w-full">
              <Ceja>Lo que escribió</Ceja>
              <Txt v="cuerpo">«{escribio}»</Txt>
            </View>
          ) : null}
        </View>
      </Tarjeta>
    </>
  );
}

// ── Hojas ────────────────────────────────────────────────────────────────────
function HojaMensaje({
  visible,
  responder,
  f,
  onCerrar,
  onEnviado,
}: {
  visible: boolean;
  /** El dolor que se responde; null es un consejo libre. */
  responder: Observacion | null;
  f: Ficha;
  onCerrar: () => void;
  onEnviado: (aviso: string) => void;
}) {
  const aviso = useAviso();
  const [texto, setTexto] = useState('');
  const [sobre, setSobre] = useState<Sobre>(f.rutina_activa ? 'rutina' : 'sesion');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const corto = f.cliente.nombre || 'tu cliente';
  const ultimaSesion = f.ultimas_sesiones[0]?.id ?? null;
  const opciones = [
    ...(f.rutina_activa ? [{ id: 'rutina' as const, nombre: 'Rutina' }] : []),
    ...(ultimaSesion ? [{ id: 'sesion' as const, nombre: 'Sesión' }] : []),
  ];

  const cerrar = () => {
    setError(null);
    onCerrar();
  };

  const enviar = async () => {
    const e = validarMensaje(texto, !!responder);
    if (e) {
      setError(e);
      aviso.mostrar(e);
      return;
    }
    setEnviando(true);
    try {
      if (responder) {
        await apiEntrenador.enviarConsejo({
          clienteId: f.cliente.id,
          texto,
          sessionId: responder.session_id,
          exerciseId: responder.ejercicio?.id ?? null,
        });
      } else {
        await apiEntrenador.enviarConsejo({
          clienteId: f.cliente.id,
          texto,
          routineId: sobre === 'rutina' ? (f.rutina_activa?.id ?? null) : null,
          sessionId: sobre === 'sesion' ? ultimaSesion : null,
        });
      }
      setTexto('');
      setError(null);
      onEnviado(
        responder?.ejercicio ? `Enviado. ${corto} lo ve en Hoy y en el ${responder.ejercicio.nombre}.` : `Enviado. ${corto} lo ve en Hoy.`,
      );
    } catch (err) {
      aviso.mostrar(esSinConexion(err) ? 'Sin conexión. Tu mensaje sigue aquí; envíalo cuando vuelva la señal.' : 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Hoja
      visible={visible}
      onCerrar={cerrar}
      titulo={responder ? `Responder a ${corto}` : `Consejo para ${corto}`}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={cerrar} />
          <Boton titulo="Enviar" alto className="flex-1" cargando={enviando} onPress={() => void enviar()} />
        </>
      }
    >
      {responder ? (
        <View className="mt-3 rounded-control bg-sup-alta p-3">
          <Txt v="ceja">
            <Text className="font-sans-bold text-peligro">Dolor</Text>
            {responder.dolor_zona ? ` · ${responder.dolor_zona}` : ''}
            {responder.dolor_intensidad !== null ? ` · ${responder.dolor_intensidad} de 10` : ''}
            {responder.ejercicio ? ` · ${responder.ejercicio.nombre}` : ''}
          </Txt>
          <Txt v="cuerpo" className="mt-1">
            «{responder.texto}»
          </Txt>
        </View>
      ) : opciones.length > 1 ? (
        <View className="mt-3">
          <Txt v="etiquetaCampo" className="mb-1">
            Sobre
          </Txt>
          <Chips opciones={opciones} valor={sobre} onCambio={setSobre} />
        </View>
      ) : null}
      <View className="mt-3">
        <CampoTexto
          etiqueta={responder ? 'Tu respuesta' : 'Tu consejo'}
          valor={texto}
          onCambiar={(v) => {
            setTexto(v);
            if (error) setError(null);
          }}
          multilinea
          error={error}
          maxLength={MENSAJE_MAX}
          placeholder={responder ? undefined : 'Por ejemplo: esta semana duerme 8 horas antes de los días de pierna.'}
          ayuda={
            responder
              ? `Le llega como consejo. Lo ve en Hoy${responder.ejercicio ? ` y en el ${responder.ejercicio.nombre}` : ''}.`
              : 'Lo ve en Hoy, en la tarjeta de su entrenador.'
          }
        />
      </View>
    </Hoja>
  );
}

function HojaDesvincular({ visible, f, onCerrar }: { visible: boolean; f: Ficha; onCerrar: () => void }) {
  const aviso = useAviso();
  const [enviando, setEnviando] = useState(false);
  const corto = f.cliente.nombre || 'tu cliente';
  const desvincular = async () => {
    setEnviando(true);
    try {
      await apiEntrenador.desvincular(f.cliente.id);
      onCerrar();
      aviso.mostrar(`Desvinculaste a ${nombreCompleto(f.cliente)}. Su historial queda en su cuenta.`);
      router.replace('/entrenador');
    } catch (e) {
      aviso.mostrar(esSinConexion(e) ? 'Necesitas conexión para desvincular.' : 'No se pudo desvincular. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Hoja
      visible={visible}
      onCerrar={onCerrar}
      titulo={`¿Desvincular a ${corto}?`}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={onCerrar} />
          <Boton titulo="Desvincular" variante="peligro" alto className="flex-1" cargando={enviando} onPress={() => void desvincular()} />
        </>
      }
    >
      <Txt v="sec" className="mt-2">
        Dejas de ver sus sesiones, medidas y fotos desde ya. {corto} conserva todo su historial; tú, solo las rutinas que escribiste.
      </Txt>
      <Txt v="sec" className="mt-2">
        Para volver a trabajar con {corto} va a necesitar un código nuevo.
      </Txt>
    </Hoja>
  );
}
