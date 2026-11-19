// ─────────────────────────────────────────────────────────────────────────────
// Notificaciones · Zona: Notificaciones (app)
//
// Qué hace: la pantalla que abre la campana de Hoy y de Clientes: las notificaciones de la cuenta,
// lo último primero, cada una con su título, su texto, hace cuánto llegó y un punto ámbar si no
// está leída. Tocar una la marca leída y abre su pantalla (Hoy, Alertas, la ficha del alumno, una
// rutina); «Marcar todas como leídas» las deja todas leídas. Estados: cargando, vacía, error con
// Reintentar y sin señal con lo último que llegó. Deslizar hacia abajo refresca (en Android con
// la ruedita; en la app web, tirando desde arriba de la lista) y, mientras se mira, se actualiza
// sola cada 15 segundos. Al llegar al final pide las anteriores.
// Tócalo cuando: cambie lo que muestra la pantalla Notificaciones.
// No lo toques para: las reglas de juntar, marcar y abrir (./logica.ts) ni el estado (./almacen.ts).
// Depende de: @/components/ui, @/lib/sesion, @/lib/tema, @/lib/vibrar, expo-router, ./instancia,
// ./logica y ./Campana (el ícono).
// ─────────────────────────────────────────────────────────────────────────────
import type { Notificacion } from '@gymtrack/shared';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, Text, View, type GestureResponderEvent } from 'react-native';
import { Boton, Cabecera, Icono, Pantalla, Tarjeta, Titulo, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { vibrarPresion } from '@/lib/vibrar';
import { IconoCampana } from './Campana';
import { almacenNotificaciones, useNotificaciones, useNotificacionesEnVivo } from './instancia';
import { ahoraMs, comoAbrir, debeRefrescarAlTirar, etiquetaFila, haceCuanto, resumenSinLeer, rutaSegunRol } from './logica';

const ES_WEB = Platform.OS === 'web';
/** Cada cuánto se vuelve a escribir «hace 5 min». */
const RELOJ_MS = 30_000;

export function PantallaNotificaciones() {
  const { usuario, rol } = useSesion();
  useNotificacionesEnVivo(usuario?.id);
  const aviso = useAviso();
  const { c } = useTema();
  const items = useNotificaciones((s) => s.items);
  const sinLeer = useNotificaciones((s) => s.sinLeer);
  const fase = useNotificaciones((s) => s.fase);
  const fallo = useNotificaciones((s) => s.fallo);
  const refrescando = useNotificaciones((s) => s.refrescando);
  const hayMas = useNotificaciones((s) => s.hayMas);
  const cargandoMas = useNotificaciones((s) => s.cargandoMas);
  const actualizadoAt = useNotificaciones((s) => s.actualizadoAt);
  const [marcando, setMarcando] = useState(false);

  // «Hace cuánto» se recalcula cada 30 s y con cada respuesta nueva.
  const [reloj, setReloj] = useState(ahoraMs);
  useEffect(() => {
    const id = setInterval(() => setReloj(ahoraMs()), RELOJ_MS);
    return () => clearInterval(id);
  }, []);
  const momento = new Date(Math.max(reloj, actualizadoAt ?? 0));

  const { refrescar, cargarMas, leer, leerTodas } = almacenNotificaciones.getState();
  const refrescarManual = () => void refrescar({ manual: true });

  function abrir(n: Notificacion) {
    void leer(n.id);
    const ruta = rutaSegunRol(n.ruta, rol);
    const como = comoAbrir(ruta);
    // Una pestaña: se cierra Notificaciones y se ve esa pestaña. Otra pantalla: se abre encima.
    if (como === 'volver') router.dismissTo(ruta as Href);
    else if (como === 'abrir') router.push(ruta as Href);
  }

  async function marcarTodas() {
    setMarcando(true);
    try {
      await leerTodas();
    } catch {
      aviso.mostrar('No pudimos marcarlas como leídas. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setMarcando(false);
    }
  }

  // ── Deslizar para refrescar en la web (React Native Web no trae RefreshControl) ──
  const desplazamiento = useRef(0);
  const tiron = useRef<{ y: number; desde: number } | null>(null);
  const gestosWeb = ES_WEB
    ? {
        onTouchStart: (e: GestureResponderEvent) => {
          tiron.current = { y: e.nativeEvent.pageY, desde: desplazamiento.current };
        },
        onTouchMove: (e: GestureResponderEvent) => {
          const t = tiron.current;
          if (t && debeRefrescarAlTirar({ desplazamientoAlEmpezar: t.desde, yInicio: t.y, yAhora: e.nativeEvent.pageY })) {
            tiron.current = null;
            refrescarManual();
          }
        },
        onTouchEnd: () => {
          tiron.current = null;
        },
      }
    : {};

  const cabecera = <Cabecera atras titulo="Notificaciones" subtitulo={fase === 'listo' ? resumenSinLeer(sinLeer) : undefined} />;

  // ── Sin datos todavía ──────────────────────────────────────────────────────
  if (items.length === 0 && fase !== 'listo') {
    return (
      <Pantalla cabecera={cabecera}>
        {fase === 'error' ? (
          <Tarjeta accessibilityRole="alert">
            <Titulo nivel={3}>{fallo === 'sin_red' ? 'Sin señal' : 'No pudimos cargar tus notificaciones'}</Titulo>
            <Txt v="sec" className="mt-1">
              {fallo === 'sin_red'
                ? 'Para ver tus notificaciones necesitas conexión. Revisa el wifi o los datos.'
                : 'Algo falló de nuestro lado. Prueba de nuevo en un rato.'}
            </Txt>
            <Boton titulo="Reintentar" variante="secundario" ancho className="mt-4" onPress={() => void refrescar()} />
          </Tarjeta>
        ) : (
          <View accessibilityLabel="Cargando tus notificaciones" aria-busy>
            <Txt v="sec">Cargando tus notificaciones…</Txt>
          </View>
        )}
      </Pantalla>
    );
  }

  // ── La lista ───────────────────────────────────────────────────────────────
  return (
    // Sin el margen del marco: la fila sin leer pinta su fondo de borde a borde; el margen va adentro.
    <Pantalla scroll={false} sinPadding cabecera={<View className="px-4">{cabecera}</View>}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescarManual} tintColor={c.texto} colors={[c.texto]} />}
        onScroll={(e) => {
          desplazamiento.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={64}
        onEndReachedThreshold={0.4}
        onEndReached={() => void cargarMas()}
        {...gestosWeb}
        ListHeaderComponent={
          <View className="px-4">
            {ES_WEB && refrescando ? (
              <Txt v="sec" className="mb-2 text-center" accessibilityLiveRegion="polite">
                Actualizando…
              </Txt>
            ) : null}
            {fallo && items.length > 0 ? (
              <View accessibilityRole="alert" className="mb-3 flex-row items-start gap-3 rounded-control border border-borde bg-sup px-3.5 py-3">
                <Icono nombre="sinSenal" tamano={20} color={c.texto} />
                <Txt v="cuerpo" className="flex-1 text-[14px] leading-[20px]">
                  {fallo === 'sin_red' ? 'Sin señal. Te mostramos lo último que llegó.' : 'No pudimos actualizar. Te mostramos lo último que llegó.'}
                </Txt>
              </View>
            ) : null}
            {sinLeer > 0 ? (
              <View className="-mr-3 mb-1 flex-row justify-end">
                <Boton titulo="Marcar todas como leídas" variante="fantasma" icono="visto" cargando={marcando ? 'Marcando…' : false} onPress={() => void marcarTodas()} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<SinNotificaciones rol={rol} />}
        ListFooterComponent={
          hayMas ? (
            <View className="mt-2 px-4">
              <Boton titulo="Ver anteriores" variante="fantasma" ancho cargando={cargandoMas ? 'Cargando…' : false} onPress={() => void cargarMas()} />
            </View>
          ) : null
        }
        renderItem={({ item }) => <FilaNotificacion n={item} momento={momento} onTocar={() => abrir(item)} />}
      />
    </Pantalla>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function FilaNotificacion({ n, momento, onTocar }: { n: Notificacion; momento: Date; onTocar: () => void }) {
  const hace = haceCuanto(n.created_at, momento);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaFila(n, hace)}
      accessibilityHint="Abre la pantalla de esta notificación"
      onPressIn={() => vibrarPresion()}
      onPress={onTocar}
      className={`min-h-[72px] flex-row gap-3 border-b border-sup-alta px-4 py-3 active:bg-fantasma-pres ${n.leida ? '' : 'bg-sup'}`}
    >
      <View className="w-2.5 items-center pt-[7px]">
        {n.leida ? null : <View className="h-2.5 w-2.5 rounded-full border border-hecho-borde bg-hecho-fondo" />}
      </View>
      <View className="flex-1">
        <Text className={`text-[16px] leading-[22px] text-texto ${n.leida ? 'font-sans-medium' : 'font-sans-bold'}`}>{n.titulo}</Text>
        {n.cuerpo ? (
          <Txt v="sec" className="mt-0.5" numberOfLines={3}>
            {n.cuerpo}
          </Txt>
        ) : null}
        {hace ? <Text className="mt-1 font-sans-medium text-[13px] text-texto-2">{hace}</Text> : null}
      </View>
    </Pressable>
  );
}

function SinNotificaciones({ rol }: { rol: 'alumno' | 'entrenador' | null }) {
  const { c } = useTema();
  return (
    <View className="mt-10 items-center gap-3 px-4">
      <IconoCampana tamano={40} color={c['texto-2']} />
      <Titulo nivel={3} className="text-center">
        No tienes notificaciones
      </Titulo>
      <Txt v="sec" className="text-center">
        {rol === 'entrenador'
          ? 'Aquí te avisamos cuando un alumno deje una observación, reporte un dolor o tenga una alerta nueva.'
          : 'Aquí te avisamos cuando tu entrenador te deje un consejo o una rutina, y cuando sea tu hora de entrenar.'}
      </Txt>
    </View>
  );
}
