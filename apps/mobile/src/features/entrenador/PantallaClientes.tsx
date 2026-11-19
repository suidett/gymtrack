// ─────────────────────────────────────────────────────────────────────────────
// Clientes · Zona: Entrenador (app)
//
// Qué hace: el inicio del entrenador (pantalla 16, docs/pantallas/clientes.html): la fecha y el
// saludo, la adherencia de la semana con su barra, cuántos activos, cuántos entrenan hoy y
// cuántos no tienen rutina, «Por revisar» con las alertas nuevas, y la lista de clientes en
// orden alfabético con filtros (Todos, Hoy, Revisar, Sin rutina) y buscador sin tildes. Sin
// clientes muestra el código de invitación; «Invitar cliente» abre la hoja con el código.
// Estados: normal, cargando, sin clientes, invitar, buscando, sin resultados y sin conexión.
// Tócalo cuando: cambie la maqueta de Clientes.
// No lo toques para: los cálculos (logica.ts) ni el código (CodigoInvitacion.tsx).
// Depende de: @/components/ui, @/lib/sesion, ./instancia, ./logica, ./piezas y ./useCarga.
// ─────────────────────────────────────────────────────────────────────────────
import { fmtFecha } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAccion, Boton, BotonIcono, Ceja, Chip, Etiqueta, Hoja, Icono, Simbolo, Tarjeta, Titulo, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { BloqueCodigo, SIN_RED_CODIGO, useCodigoInvitacion } from './CodigoInvitacion';
import type { Alerta, ClienteLista } from './contrato';
import { apiEntrenador, useInsigniaAlertas } from './instancia';
import {
  contarNuevas,
  cuentasPanel,
  detalleCorto,
  estadoCliente,
  filtrarClientes,
  FILTROS_CLIENTES,
  fmtCuando,
  hora,
  iniciales,
  NOMBRE_TIPO,
  nombreCompleto,
  ordenarPorRevisar,
  partirCoincidencia,
  porRevisar,
  type FiltroClientes,
} from './logica';
import { AvisoSinRed, Avatar, BarraSemana, CabezaSeccion, ErrorCarga, Esq, EsqFilas, LeyendaSemana, MiniSemana, TresCifras } from './piezas';
import { useCarga } from './useCarga';
import { ahoraFecha } from './utilidades';

// ── Datos ────────────────────────────────────────────────────────────────────
async function cargarPanel() {
  const [clientes, alertas] = await Promise.all([
    apiEntrenador.listarClientes(),
    // Si Alertas falla, la lista igual se muestra: «Por revisar» queda oculto.
    apiEntrenador.listarAlertas().catch(() => null),
  ]);
  if (alertas) useInsigniaAlertas.getState().fijar(contarNuevas(alertas));
  return { ...clientes, alertas };
}

const irFicha = (id: string) => router.push({ pathname: '/cliente/[id]', params: { id } });

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function PantallaClientes() {
  const { usuario } = useSesion();
  const aviso = useAviso();
  const insets = useSafeAreaInsets();
  const carga = useCarga(cargarPanel);
  const [hoy] = useState(ahoraFecha);
  const [filtro, setFiltro] = useState<FiltroClientes>('todos');
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [invitar, setInvitar] = useState(false);

  const d = carga.datos;
  const sinClientes = carga.fase === 'listo' && !!d && d.items.length === 0;
  const codigo = useCodigoInvitacion({ autoGenerar: sinClientes });

  const abrirInvitar = () => {
    if (codigo.estado !== 'vigente' && carga.sinRed) {
      aviso.mostrar(SIN_RED_CODIGO);
      return;
    }
    setInvitar(true);
    if (codigo.estado !== 'vigente' && !codigo.generando) void codigo.generar(true);
  };

  const hoja = (
    <Hoja
      visible={invitar}
      onCerrar={() => setInvitar(false)}
      titulo="Invitar cliente"
      texto="Tu cliente ingresa este código en su perfil y quedan conectados. Verás su encuesta apenas entre."
    >
      <BloqueCodigo codigo={codigo} forma="hoja" />
    </Hoja>
  );

  if (buscando && d) {
    return (
      <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
        <BarraBusqueda
          valor={busqueda}
          onCambiar={setBusqueda}
          onVolver={() => {
            setBuscando(false);
            setBusqueda('');
          }}
        />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-4 pb-6">
          <Resultados lista={d.items} busqueda={busqueda} onInvitar={abrirInvitar} />
        </ScrollView>
        {hoja}
      </View>
    );
  }

  const saludo = (
    <>
      <View className="h-14 flex-row items-center">
        <Simbolo tamano={28} />
      </View>
      <View className="mb-5 mt-1">
        <Ceja>{fmtFecha(hoy, 'larga')}</Ceja>
        <Titulo className="mt-0.5">{usuario ? `Hola, ${usuario.nombre}` : 'Hola'}</Titulo>
      </View>
    </>
  );

  let cuerpo;
  let accion = null;
  if (carga.fase === 'cargando') {
    cuerpo = (
      <View accessibilityLabel="Cargando tus clientes" aria-busy>
        <Tarjeta className="gap-3">
          <Esq ancho="46%" alto={12} />
          <Esq ancho="30%" alto={36} />
          <Esq alto={10} />
          <View className="flex-row gap-2">
            <Esq ancho="31%" alto={40} />
            <Esq ancho="31%" alto={40} />
            <Esq ancho="31%" alto={40} />
          </View>
        </Tarjeta>
        <View className="my-4">
          <Esq ancho={110} alto={18} />
        </View>
        <EsqFilas />
      </View>
    );
  } else if (!d) {
    cuerpo = (
      <ErrorCarga
        titulo={carga.sinRed ? 'Sin conexión' : 'No pudimos cargar tus clientes'}
        texto={carga.sinRed ? 'Revisa tu conexión e intenta de nuevo.' : 'Intenta de nuevo en un momento.'}
        onReintentar={carga.recargar}
      />
    );
  } else if (sinClientes) {
    cuerpo = <SinClientes codigo={codigo} />;
    accion = <Boton titulo="Compartir código" alto ancho onPress={() => void codigo.compartir()} />;
  } else {
    cuerpo = (
      <>
        {carga.sinRed ? (
          <AvisoSinRed desde={carga.cargadoAt ? `hoy a las ${hora(new Date(carga.cargadoAt).toISOString())}` : null} onReintentar={carga.recargar} />
        ) : null}
        <Resumen lista={d.items} semanaPasada={d.adherenciaSemanaPasada} />
        {d.alertas ? <PorRevisar alertas={d.alertas} revisar={d.items.filter(porRevisar).length} hoy={hoy} /> : null}
        <CabezaSeccion titulo="Clientes" derecha={<Txt v="sec">esta semana</Txt>} />
        <Pressable
          onPress={() => setBuscando(true)}
          accessibilityRole="search"
          accessibilityLabel="Buscar por nombre"
          className="h-12 flex-row items-center gap-2 rounded-control border-2 border-campo-borde bg-campo-fondo px-3 active:opacity-80"
        >
          <Icono nombre="buscar" tamano={20} />
          <Txt v="sec" className="text-[16px]">
            Buscar por nombre
          </Txt>
        </Pressable>
        <Filtros lista={d.items} filtro={filtro} onCambio={setFiltro} />
        <ListaClientes lista={filtrarClientes(d.items, filtro)} hoy={hoy} vacio="Nadie en este filtro." />
      </>
    );
    accion = <Boton titulo="Invitar cliente" variante="secundario" alto ancho onPress={abrirInvitar} />;
  }

  return (
    <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="px-4 pb-6" showsVerticalScrollIndicator={false}>
        {saludo}
        {cuerpo}
      </ScrollView>
      {accion ? <BarraAccion enPestanas>{accion}</BarraAccion> : null}
      {hoja}
    </View>
  );
}

// ── Resumen de la semana ─────────────────────────────────────────────────────
function Resumen({ lista, semanaPasada }: { lista: ClienteLista[]; semanaPasada: number | null }) {
  const k = cuentasPanel(lista);
  const semana = { hechas: k.hechas, perdidas: k.perdidas, planificadas: k.planificadas };
  return (
    <Tarjeta accessibilityLabel="Resumen de la semana">
      <View className="flex-row items-baseline justify-between gap-2">
        <Ceja>Adherencia de la semana</Ceja>
        {semanaPasada !== null ? (
          <Ceja>
            la pasada <Text className="font-mono-bold">{semanaPasada}</Text> %
          </Ceja>
        ) : null}
      </View>
      <View className="mt-1.5 flex-row items-baseline gap-3">
        <Text className="font-mono-bold text-[40px] leading-[44px] text-texto">
          {k.adherencia ?? 0}
          <Text className="text-[20px] text-texto-2"> %</Text>
        </Text>
        <Txt v="sec" className="flex-1">
          <Text className="font-mono-bold text-texto">{k.hechas}</Text> de{' '}
          <Text className="font-mono-bold text-texto">{k.hechas + k.perdidas}</Text> sesiones hasta hoy
        </Txt>
      </View>
      <BarraSemana semana={semana} />
      {k.planificadas ? <LeyendaSemana quedan={Math.max(0, k.planificadas - k.hechas - k.perdidas)} /> : null}
      <TresCifras
        datos={[
          { valor: String(k.activos), texto: 'activos' },
          { valor: String(k.hoy), texto: 'entrenan hoy' },
          { valor: String(k.sinrutina), texto: 'sin rutina' },
        ]}
      />
    </Tarjeta>
  );
}

// ── Por revisar ──────────────────────────────────────────────────────────────
function PorRevisar({ alertas, revisar, hoy }: { alertas: Alerta[]; revisar: number; hoy: Date }) {
  const abiertas = ordenarPorRevisar(alertas);
  const nuevas = abiertas.filter((a) => a.estado === 'nueva').slice(0, 3);
  if (!abiertas.length) return null;
  const irAlertas = () => router.push('/entrenador/alertas');
  return (
    <>
      <CabezaSeccion
        titulo="Por revisar"
        cifra={Math.max(revisar, abiertas.length)}
        derecha={<Boton titulo="Ver todas" variante="fantasma" onPress={irAlertas} />}
      />
      <Txt v="sec" className="-mt-1 mb-2">
        <Text className="font-mono-bold text-texto">{contarNuevas(abiertas)}</Text> nuevas
      </Txt>
      {nuevas.length ? (
        <Tarjeta className="px-4 py-0">
          {nuevas.map((a, i) => {
            const dolor = a.tipo === 'dolor';
            return (
              <Pressable
                key={a.id}
                onPress={irAlertas}
                accessibilityRole="button"
                accessibilityLabel={`${NOMBRE_TIPO[a.tipo]}, ${nombreCompleto(a.cliente)}, ${detalleCorto(a)}`}
                className={`min-h-[64px] flex-row items-center gap-3 py-2 active:opacity-80 ${i < nuevas.length - 1 ? 'border-b border-sup-alta' : ''}`}
              >
                <View className={`w-1 self-stretch rounded-[1px] ${dolor ? 'bg-peligro' : 'bg-borde'}`} />
                <View className="flex-1">
                  <Txt v="cuerpoMedio">{nombreCompleto(a.cliente)}</Txt>
                  <Txt v="sec">
                    <Text className={`font-sans-bold ${dolor ? 'text-peligro' : 'text-texto'}`}>{NOMBRE_TIPO[a.tipo]}</Text> · {detalleCorto(a)}
                  </Txt>
                </View>
                <Txt v="sec">{fmtCuando(a.created_at, hoy, false)}</Txt>
              </Pressable>
            );
          })}
        </Tarjeta>
      ) : null}
    </>
  );
}

// ── Lista ────────────────────────────────────────────────────────────────────
function Filtros({ lista, filtro, onCambio }: { lista: ClienteLista[]; filtro: FiltroClientes; onCambio: (f: FiltroClientes) => void }) {
  const k = cuentasPanel(lista);
  const cuenta: Record<FiltroClientes, number> = { todos: k.todos, hoy: k.hoy, revisar: k.revisar, sinrutina: k.sinrutina };
  return (
    <View className="mt-2 flex-row flex-wrap gap-x-2" accessibilityRole="radiogroup" accessibilityLabel="Filtrar clientes">
      {FILTROS_CLIENTES.map((f) => (
        <Chip
          key={f.id}
          titulo={`${f.nombre} ${cuenta[f.id]}`}
          etiqueta={`${f.nombre}, ${cuenta[f.id]}`}
          activo={filtro === f.id}
          onPress={() => onCambio(f.id)}
        />
      ))}
    </View>
  );
}

function ListaClientes({ lista, hoy, busqueda = '', vacio }: { lista: ClienteLista[]; hoy: Date; busqueda?: string; vacio: string }) {
  if (!lista.length) {
    return (
      <Tarjeta className="mt-2">
        <Txt v="sec">{vacio}</Txt>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta className="mt-2 px-4 py-0">
      {lista.map((c, i) => (
        <FilaCliente key={c.id} c={c} hoy={hoy} busqueda={busqueda} ultimo={i === lista.length - 1} />
      ))}
    </Tarjeta>
  );
}

function FilaCliente({ c, hoy, busqueda, ultimo }: { c: ClienteLista; hoy: Date; busqueda: string; ultimo: boolean }) {
  const nombre = nombreCompleto(c);
  const partes = partirCoincidencia(nombre, busqueda);
  const estado = estadoCliente(c, hoy);
  const revisar = porRevisar(c);
  return (
    <Pressable
      onPress={() => irFicha(c.id)}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}${revisar ? ', revisar' : ''}. ${estado.texto}`}
      className={`min-h-[64px] flex-row items-center gap-3 py-2.5 active:opacity-80 ${ultimo ? '' : 'border-b border-sup-alta'}`}
    >
      <Avatar iniciales={iniciales(c)} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-sans-semibold text-[16px] leading-[22px] text-texto">
            {partes ? (
              <>
                {partes[0]}
                <Text className="font-sans-bold text-acento-texto underline">{partes[1]}</Text>
                {partes[2]}
              </>
            ) : (
              nombre
            )}
          </Text>
          {revisar ? <Etiqueta texto="Revisar" acento /> : null}
        </View>
        <Text className={`font-sans-medium text-[14px] leading-[20px] ${estado.peligro ? 'text-peligro' : 'text-texto-2'}`}>{estado.texto}</Text>
      </View>
      {c.semana && c.semana.planificadas ? <MiniSemana semana={c.semana} /> : null}
    </Pressable>
  );
}

// ── Búsqueda ─────────────────────────────────────────────────────────────────
function BarraBusqueda({ valor, onCambiar, onVolver }: { valor: string; onCambiar: (v: string) => void; onVolver: () => void }) {
  const { c } = useTema();
  const ref = useRef<TextInput>(null);
  return (
    <View className="h-16 flex-row items-center gap-1 px-2">
      <BotonIcono icono="atras" etiqueta="Volver" onPress={onVolver} />
      <View className="h-12 flex-1 flex-row items-center rounded-control border-2 border-campo-edicion bg-campo-fondo pl-3">
        <TextInput
          ref={ref}
          autoFocus
          value={valor}
          onChangeText={onCambiar}
          placeholder="Buscar por nombre"
          placeholderTextColor={c['texto-2']}
          accessibilityLabel="Buscar cliente"
          maxLength={80}
          autoCorrect={false}
          returnKeyType="search"
          className="h-full flex-1 font-sans-medium text-[16px] text-texto"
        />
        {valor ? (
          <BotonIcono
            icono="cerrar"
            etiqueta="Borrar búsqueda"
            onPress={() => {
              onCambiar('');
              ref.current?.focus();
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

function Resultados({ lista, busqueda, onInvitar }: { lista: ClienteLista[]; busqueda: string; onInvitar: () => void }) {
  const [hoy] = useState(ahoraFecha);
  const q = busqueda.trim();
  if (!q) {
    return (
      <>
        <Txt v="sec" className="mb-1 mt-2">
          Tus <Text className="font-mono-bold text-texto">{lista.length}</Text> clientes
        </Txt>
        <ListaClientes lista={filtrarClientes(lista, 'todos')} hoy={hoy} vacio="Todavía no tienes clientes." />
      </>
    );
  }
  const r = filtrarClientes(lista, 'todos', q);
  if (!r.length) {
    return (
      <View className="mt-6 gap-2">
        <Txt v="h3">Nadie con «{q}» entre tus clientes</Txt>
        <Txt v="sec">Revisa cómo lo escribiste. Si es alguien nuevo, invítalo con tu código.</Txt>
        <Boton titulo="Invitar cliente" variante="secundario" ancho className="mt-3" onPress={onInvitar} />
      </View>
    );
  }
  return (
    <>
      <Txt v="sec" className="mb-1 mt-2">
        <Text className="font-mono-bold text-texto">{r.length}</Text> {r.length === 1 ? 'cliente' : 'clientes'}
      </Txt>
      <ListaClientes lista={r} hoy={hoy} busqueda={q} vacio="" />
    </>
  );
}

// ── Sin clientes ─────────────────────────────────────────────────────────────
function SinClientes({ codigo }: { codigo: ReturnType<typeof useCodigoInvitacion> }) {
  const pasos = [
    'Le mandas el código por WhatsApp o se lo dictas.',
    'Lo ingresa en su perfil, en «Mi entrenador».',
    'Aparece aquí con su encuesta y le armas la rutina.',
  ];
  return (
    <>
      <Tarjeta accessibilityLabel="Sin clientes">
        <Titulo nivel={2}>Todavía no tienes clientes</Titulo>
        <Txt v="sec" className="mt-2">
          Comparte este código con tu primer cliente. Lo ingresa en su perfil y quedan conectados.
        </Txt>
        <BloqueCodigo codigo={codigo} forma="vacio" />
      </Tarjeta>
      <CabezaSeccion titulo="Cómo funciona" />
      <View className="gap-3">
        {pasos.map((p, i) => (
          <View key={p} className="flex-row items-start gap-3">
            <View className="h-7 w-7 items-center justify-center rounded-control bg-sup-alta">
              <Text className="font-mono-bold text-[14px] text-texto">{i + 1}</Text>
            </View>
            <Txt v="cuerpo" className="flex-1">
              {p}
            </Txt>
          </View>
        ))}
      </View>
    </>
  );
}
