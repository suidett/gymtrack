// ─────────────────────────────────────────────────────────────────────────────
// Ajustar cargas · Zona: Entrenador (app)
//
// Qué hace: la pantalla 19 (docs/pantallas/ajustar-cargas.html). Los ejercicios de la próxima
// sesión del cliente con lo que sugiere la app; al abrir uno se compara la última vez con la
// sugerencia y su «por qué», y el entrenador fija la carga con el más y menos (de a lo que
// sube ese ejercicio), el rango de repeticiones y una nota para el cliente. Lo cambiado queda
// marcado («Cambiado», la sugerencia tachada) y «Volver a la sugerencia» lo deshace. Guardar
// manda solo lo que cambió (PATCH /suggestions/:id, CU-42) y pasa por Guardando, Guardado o
// «No se guardó» con Reintentar. Salir con cambios sin guardar pregunta antes.
// Tócalo cuando: cambie la maqueta de Ajustar cargas.
// No lo toques para: qué cuenta como cambio (logica.ts) ni las llamadas (api.ts).
// Depende de: @/components/ui, ./instancia, ./logica, ./piezas y ./useCarga.
// ─────────────────────────────────────────────────────────────────────────────
import { fmtNum } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Boton, Cabecera, Ceja, CampoTexto, Chip, Etiqueta, Hoja, Icono, Paso, Pantalla, Tarjeta, Titulo, Txt, useAviso } from '@/components/ui';
import type { Sugerencia } from './contrato';
import { apiEntrenador } from './instancia';
import {
  ajusteInicial,
  cambiado,
  cambioCarga,
  contarSinGuardar,
  fmtDiaCorto,
  fmtDiaLargo,
  hora,
  nombreMetodo,
  rango,
  rangosPara,
  sinGuardar,
  textoCambios,
  textoDeltaCarga,
  textoDeltaReps,
  LIMITE_CARGA_KG,
  NOTA_AJUSTE_MAX,
  type Ajuste,
} from './logica';
import { ErrorCarga, Esq } from './piezas';
import { useCarga } from './useCarga';
import { ahoraMs } from './utilidades';

type Fase = 'editando' | 'guardando' | 'guardado' | 'error';

async function cargar(clienteId: string) {
  const [s, ficha] = await Promise.all([apiEntrenador.listarSugerencias(clienteId), apiEntrenador.verFicha(clienteId).catch(() => null)]);
  return { ...s, cliente: ficha?.cliente ?? null, rutina: ficha?.rutina_activa ?? null };
}

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function PantallaAjustarCargas({ clienteId }: { clienteId: string }) {
  const aviso = useAviso();
  const carga = useCarga(() => cargar(clienteId), clienteId);
  const [ajustes, setAjustes] = useState<Record<string, Ajuste>>({});
  const [abierto, setAbierto] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>('editando');
  const [guardadoA, setGuardadoA] = useState<string | null>(null);
  const [guardadosN, setGuardadosN] = useState(0);
  const [salir, setSalir] = useState(false);

  const d = carga.datos;
  const lista = d?.items ?? [];
  const nombre = d?.cliente?.nombre || 'tu cliente';
  // Lo que se edita: lo que el entrenador tocó, o lo que hay hoy en la API.
  const ajusteDe = (s: Sugerencia): Ajuste => ajustes[s.id] ?? ajusteInicial(s);
  const n = contarSinGuardar(lista, ajustes);
  const nCambiados = lista.filter((s) => cambiado(s, ajusteDe(s))).length;

  const cambiar = (s: Sugerencia, parcial: Partial<Ajuste>) => setAjustes((p) => ({ ...p, [s.id]: { ...(p[s.id] ?? ajusteInicial(s)), ...parcial } }));

  const volverSugerencia = (s: Sugerencia) => {
    setAjustes((p) => ({ ...p, [s.id]: { peso_kg: s.sugerencia.peso_kg, reps_min: s.sugerencia.reps_min, reps_max: s.sugerencia.reps_max, nota: '' } }));
    aviso.mostrar(`${s.nombre} vuelve a lo que sugiere la app.`);
  };

  const guardar = async () => {
    const pendientes = lista.filter((s) => ajustes[s.id] && sinGuardar(s, ajustes[s.id] as Ajuste));
    if (!pendientes.length) return;
    setFase('guardando');
    try {
      for (const s of pendientes) await apiEntrenador.sobrescribir(s.id, ajustes[s.id] as Ajuste);
      setGuardadosN(nCambiados);
      setGuardadoA(hora(new Date(ahoraMs()).toISOString()));
      setFase('guardado');
      setAbierto(null);
      // Lo guardado pasa a ser lo que hay en la API; se recarga para leer valor_final.
      carga.fijar((x) => ({
        ...x,
        items: x.items.map((s) => {
          const a = ajustes[s.id];
          if (!a) return s;
          return { ...s, valor_final: { peso_kg: a.peso_kg, reps_min: a.reps_min, reps_max: a.reps_max, rir: null }, nota: a.nota.trim() || null };
        }),
      }));
      setAjustes({});
    } catch {
      setFase('error');
    }
  };

  const volver = () => {
    if (n > 0 && fase !== 'guardando') {
      setSalir(true);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/cliente/[id]', params: { id: clienteId } });
  };

  const cabecera = <Cabecera atras titulo="Ajustar cargas" subtitulo={d?.cliente ? `${d.cliente.nombre} ${d.cliente.apellido}`.trim() : undefined} alVolver={volver} />;

  if (carga.fase === 'cargando') {
    return (
      <Pantalla cabecera={cabecera}>
        <View className="gap-3" accessibilityLabel="Cargando las cargas">
          <Esq ancho="30%" alto={12} />
          <Esq ancho="55%" alto={28} />
          <Esq ancho="70%" />
          {[0, 1, 2].map((i) => (
            <Tarjeta key={i} className="gap-2">
              <Esq ancho="60%" />
              <Esq ancho="40%" alto={12} />
            </Tarjeta>
          ))}
        </View>
      </Pantalla>
    );
  }
  if (!d) {
    return (
      <Pantalla cabecera={cabecera}>
        <ErrorCarga
          titulo="No pudimos cargar las sugerencias"
          texto={carga.sinRed ? 'Revisa tu conexión e intenta de nuevo.' : 'Intenta de nuevo en un momento.'}
          onReintentar={carga.recargar}
        />
      </Pantalla>
    );
  }

  const prox = d.proxima_sesion;
  const guardado = fase === 'guardado';
  const pie = (() => {
    if (fase === 'guardando') {
      return (
        <>
          <Txt v="sec" className="text-center">
            Guardando {textoCambios(n)}…
          </Txt>
          <Boton titulo="Guardando…" alto ancho cargando="Guardando…" disabled />
        </>
      );
    }
    if (guardado) {
      return (
        <>
          <Txt v="sec" className="text-center">
            Guardado hoy a las <Text className="font-mono-bold text-texto">{guardadoA}</Text>
          </Txt>
          <Boton
            titulo="Volver a la ficha"
            alto
            ancho
            onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/cliente/[id]', params: { id: clienteId } }))}
          />
        </>
      );
    }
    if (fase === 'error') {
      return (
        <>
          <Txt v="error" accessibilityRole="alert" className="text-center">
            No se guardó. Revisa tu conexión: tus cambios siguen aquí.
          </Txt>
          <Boton titulo="Reintentar" alto ancho onPress={() => void guardar()} />
        </>
      );
    }
    if (!n) {
      return (
        <>
          <Txt v="sec" className="text-center">
            Sin cambios. {nombre} hará lo que sugiere la app.
          </Txt>
          <Boton titulo="Guardar cambios" alto ancho disabled />
        </>
      );
    }
    return (
      <>
        <Txt v="sec" className="text-center">
          <Text className="font-mono-bold text-texto">{n}</Text> {n === 1 ? 'cambio' : 'cambios'} sin guardar. {nombre} los verá al empezar.
        </Txt>
        <Boton titulo={`Guardar ${textoCambios(n)}`} alto ancho onPress={() => void guardar()} />
      </>
    );
  })();

  return (
    <Pantalla cabecera={cabecera} accion={lista.length ? pie : undefined}>
      <View pointerEvents={fase === 'guardando' ? 'none' : 'auto'}>
        <Ceja>Próxima sesión</Ceja>
        <Titulo className="mt-0.5">{prox?.nombre || 'Su próxima sesión'}</Titulo>
        {prox?.fecha_sugerida || (prox?.semana_actual && prox?.semanas) ? (
          <Txt v="sec">
            {[prox?.fecha_sugerida ? fmtDiaCorto(prox.fecha_sugerida) : '', prox?.semana_actual && prox?.semanas ? `semana ${prox.semana_actual} de ${prox.semanas}` : '']
              .filter(Boolean)
              .join(' · ')}
          </Txt>
        ) : null}
        {prox?.rutina_nombre || d.rutina ? (
          <Txt v="sec">
            {[prox?.rutina_nombre ?? d.rutina?.nombre, nombreMetodo(prox?.metodo_progresion ?? d.rutina?.metodo_progresion)].filter(Boolean).join(' · ')}
          </Txt>
        ) : null}

        {guardado ? (
          <Tarjeta tono="hecha" className="mt-4" accessibilityRole="summary">
            <Ceja acento>Guardado</Ceja>
            <Txt v="h3" className="mt-1">
              {guardadosN ? `${nombre} verá ${textoCambios(guardadosN)} al empezar` : `${nombre} hará lo que sugiere la app`}
            </Txt>
            <Txt v="sec">{guardadosN === lista.length ? 'Fijaste todas las cargas.' : 'Los demás ejercicios siguen la sugerencia de la app.'}</Txt>
          </Tarjeta>
        ) : (
          <Txt v="sec" className="mt-4">
            La app calcula cada carga con lo que {nombre} hizo la última vez{prox?.base_fecha ? ` (${fmtDiaLargo(prox.base_fecha)})` : ''}. Lo que cambies reemplaza la
            sugerencia y lo ve al empezar la sesión.
          </Txt>
        )}

        {lista.length ? (
          <>
            <View className="mb-2 mt-6 flex-row items-baseline justify-between">
              <Txt v="h3" accessibilityRole="header">
                {lista.length} {lista.length === 1 ? 'ejercicio' : 'ejercicios'}
              </Txt>
              <Text className={`font-sans-semibold text-[14px] ${nCambiados ? 'text-acento-texto' : 'text-texto-2'}`}>
                {nCambiados ? `${nCambiados} ${nCambiados === 1 ? 'cambiado' : 'cambiados'}` : 'Todo como sugiere la app'}
              </Text>
            </View>
            <View className="gap-2">
              {lista.map((s, i) => (
                <TarjetaEjercicio
                  key={s.id}
                  s={s}
                  n={i + 1}
                  a={ajusteDe(s)}
                  abierto={!guardado && abierto === s.id}
                  guardado={guardado}
                  nombreCliente={nombre}
                  onAbrir={() => setAbierto((x) => (x === s.id ? null : s.id))}
                  onCambiar={(parcial) => {
                    if (fase === 'error') setFase('editando');
                    cambiar(s, parcial);
                  }}
                  onVolver={() => volverSugerencia(s)}
                />
              ))}
            </View>
            {guardado ? (
              <View className="-ml-3 mt-3 self-start">
                <Boton titulo="Editar de nuevo" variante="fantasma" onPress={() => setFase('editando')} />
              </View>
            ) : null}
          </>
        ) : (
          <Tarjeta className="mt-6">
            <Txt v="h3">No hay cargas por ajustar</Txt>
            <Txt v="sec" className="mt-1">
              Las sugerencias aparecen cuando {nombre} cierra una sesión de su rutina activa. Ya usó las que había o todavía no entrena.
            </Txt>
          </Tarjeta>
        )}
      </View>

      <Hoja
        visible={salir}
        onCerrar={() => setSalir(false)}
        titulo="¿Salir sin guardar?"
        texto={`Pierdes ${textoCambios(n)}. ${nombre} hará lo que sugiere la app.`}
        acciones={
          <>
            <Boton titulo="Seguir editando" variante="secundario" alto className="flex-1" onPress={() => setSalir(false)} />
            <Boton
              titulo="Salir sin guardar"
              variante="peligro"
              alto
              className="flex-1"
              onPress={() => {
                setSalir(false);
                setAjustes({});
                if (router.canGoBack()) router.back();
                else router.replace({ pathname: '/cliente/[id]', params: { id: clienteId } });
              }}
            />
          </>
        }
      />
    </Pantalla>
  );
}

// ── Un ejercicio ─────────────────────────────────────────────────────────────
function TarjetaEjercicio({
  s,
  n,
  a,
  abierto,
  guardado,
  nombreCliente,
  onAbrir,
  onCambiar,
  onVolver,
}: {
  s: Sugerencia;
  n: number;
  a: Ajuste;
  abierto: boolean;
  guardado: boolean;
  nombreCliente: string;
  onAbrir: () => void;
  onCambiar: (p: Partial<Ajuste>) => void;
  onVolver: () => void;
}) {
  const g = s.sugerencia;
  const carga = cambioCarga(s, a);
  const cambio = cambiado(s, a);
  const sube = g.peso_kg - (s.ultima?.peso_kg ?? g.peso_kg);
  const inc = s.incremento_kg > 0 ? s.incremento_kg : 2.5;

  const cabeza = (
    <View className="min-h-[56px] flex-row items-center gap-3">
      <Text className="w-6 font-mono-bold text-[16px] text-texto-2">{n}</Text>
      <View className="flex-1 gap-1">
        <Txt v="cuerpoMedio">{s.nombre}</Txt>
        <Text className="font-mono-medium text-[14px] text-texto-2">
          {!carga && sube > 0 ? <Text className="text-acento-texto">{`+${fmtNum(sube)} `}</Text> : null}
          <Text className="text-texto">{`${fmtNum(a.peso_kg)} kg × ${rango(a.reps_min, a.reps_max)}`}</Text>
          {carga ? <Text className="line-through">{`  ${fmtNum(g.peso_kg)} × ${rango(g.reps_min, g.reps_max)}`}</Text> : null}
          {!carga && a.nota.trim() ? <Text className="font-sans-medium">{' · con nota'}</Text> : null}
        </Text>
        {s.alerta || cambio ? (
          <View className="flex-row flex-wrap gap-2">
            {s.alerta ? <Etiqueta texto="Sin avance" /> : null}
            {cambio ? <Etiqueta texto={guardado ? 'Fijado por ti' : 'Cambiado'} acento /> : null}
          </View>
        ) : null}
      </View>
      {!guardado ? <Icono nombre={abierto ? 'arriba' : 'abajo'} tamano={20} /> : null}
    </View>
  );

  return (
    <View className={`rounded-control border bg-sup px-4 py-1 ${cambio ? 'border-hecho-borde' : 'border-sup-alta'}`}>
      {guardado ? (
        cabeza
      ) : (
        <Pressable
          onPress={onAbrir}
          accessibilityRole="button"
          accessibilityState={{ expanded: abierto }}
          accessibilityLabel={`${s.nombre}, ${fmtNum(a.peso_kg)} kilos por ${rango(a.reps_min, a.reps_max)}${cambio ? ', cambiado' : ''}`}
          className="active:opacity-80"
        >
          {cabeza}
        </Pressable>
      )}
      {guardado && a.nota.trim() ? (
        <Txt v="sec" className="mb-2 ml-9">
          «{a.nota.trim()}»
        </Txt>
      ) : null}
      {abierto ? (
        <View className="pb-3">
          {s.alerta ? (
            <View className="mt-1 flex-row items-center gap-2 rounded-control bg-sup-alta p-3">
              <Icono nombre="tendencia" tamano={18} />
              <Txt v="sec" className="flex-1">
                {s.alerta}
              </Txt>
            </View>
          ) : null}
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Ceja>Última vez{s.ultima?.fecha ? ` · ${fmtDiaCorto(s.ultima.fecha)}` : ''}</Ceja>
              {s.ultima ? (
                <>
                  <Text className="font-mono-bold text-[22px] text-texto">{fmtNum(s.ultima.peso_kg)} kg</Text>
                  <Txt v="sec">
                    {s.ultima.reps.join('·')}
                    {s.ultima.rir !== null ? ` · RIR ${s.ultima.rir}` : ''}
                  </Txt>
                </>
              ) : (
                <Txt v="sec">Sin registro</Txt>
              )}
            </View>
            <View className="flex-1">
              <Ceja>La app sugiere</Ceja>
              <Text className="font-mono-bold text-[22px] text-texto">
                {sube > 0 ? <Text className="text-acento-texto">{`+${fmtNum(sube)} `}</Text> : null}
                {fmtNum(g.peso_kg)} kg
              </Text>
              <Txt v="sec">{rango(g.reps_min, g.reps_max)} reps</Txt>
            </View>
          </View>
          {s.texto || s.motivo ? (
            <Txt v="sec" className="mt-3">
              <Text className="font-sans-bold text-texto">Por qué: </Text>
              {s.motivo || s.texto}
            </Txt>
          ) : null}

          <View className="mt-4">
            <Paso
              etiqueta={`Carga para ${nombreCliente}`}
              valor={a.peso_kg}
              paso={inc}
              min={inc}
              max={LIMITE_CARGA_KG}
              unidad="kg"
              onCambiar={(v) => onCambiar({ peso_kg: v })}
            />
          </View>
          <Txt v="sec" className="mt-1">
            {textoDeltaCarga(s, a)}
          </Txt>

          <Txt v="etiquetaCampo" className="mt-4">
            Repeticiones objetivo{s.series ? ` · ${s.series} series` : ''}
            {s.rir_objetivo !== null ? `, RIR ${s.rir_objetivo}` : ''}
          </Txt>
          <View className="mt-1 flex-row flex-wrap gap-x-2" accessibilityLabel="Repeticiones objetivo">
            {rangosPara(s).map(([min, max]) => (
              <Chip
                key={`${min}-${max}`}
                titulo={rango(min, max)}
                texto={false}
                etiqueta={`${min} a ${max} repeticiones`}
                activo={a.reps_min === min && a.reps_max === max}
                onPress={() => onCambiar({ reps_min: min, reps_max: max })}
              />
            ))}
          </View>
          {textoDeltaReps(s, a) ? (
            <Txt v="sec" className="mt-1">
              {textoDeltaReps(s, a)}
            </Txt>
          ) : null}

          <View className="mt-4">
            <CampoTexto
              etiqueta={`Nota para ${nombreCliente} · opcional`}
              valor={a.nota}
              onCambiar={(v) => onCambiar({ nota: v })}
              multilinea
              maxLength={NOTA_AJUSTE_MAX}
              placeholder="Por ejemplo: baja lento, 3 segundos"
            />
          </View>
          {cambio ? (
            <View className="-ml-3 mt-2 self-start">
              <Boton titulo="Volver a la sugerencia" variante="fantasma" onPress={onVolver} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
