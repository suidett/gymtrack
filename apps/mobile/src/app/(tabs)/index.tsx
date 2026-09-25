// ─────────────────────────────────────────────────────────────────────────────
// Pantalla Hoy · Zona: Rutas
//
// Qué hace: es la portada del alumno. Muestra qué día de la rutina activa le toca, con cuántos
// ejercicios, series y minutos estimados, y el botón para empezar. Si dejó una sesión a medias,
// ofrece retomarla. Abajo van los números del mes, los puntos de la semana y las últimas tres
// sesiones cerradas.
// Tócalo cuando: cambies qué se ve al abrir la app, el orden de los bloques o los textos de la
// portada.
// No lo toques para: cambiar cómo se calcula la racha, la semana o el mes (src/store/selectors.ts),
// qué día toca o en qué semana va la rutina (packages/shared/src/historial.ts), ni la bitácora
// de la sesión (src/app/sesion/[id].tsx y src/features/sesion/).
// Depende de: @gymtrack/shared (fmtDuracion, fmtFecha, fmtHace, fmtVolumen, proximoDia,
// semanaDeRutina, sesionesCerradas), @/components/ui, @/store/selectors y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────

import { fmtDuracion, fmtFecha, fmtHace, fmtVolumen, proximoDia, semanaDeRutina, sesionesCerradas } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Boton, Dato, Etiqueta, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { diasDeLaSemana, estadisticasDelMes, rachaDias } from '@/store/selectors';
import { useStore } from '@/store/useStore';

// ── Constantes ───────────────────────────────────────────────────────────────
// Letras de los puntos de la semana, de lunes a domingo, en el mismo orden en que
// diasDeLaSemana devuelve los días. La X del miércoles es para no repetir la M del martes.
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Pestaña Hoy. No recibe props: lee todo del store y navega con el router.
 * Regla que conviene saber: solo puede haber una rutina activa y una sesión en curso a la vez
 * (el store lo garantiza), así que los `find` de abajo devuelven una o ninguna.
 */
export default function Hoy() {
  // ── Estado del store ─────────────────────────────────────────────────────────
  // Un selector por campo: la pantalla se vuelve a dibujar solo cuando cambia lo que usa.
  const perfil = useStore((s) => s.perfil);
  const errorCarga = useStore((s) => s.errorCarga);
  const rutinas = useStore((s) => s.rutinas);
  const sesiones = useStore((s) => s.sesiones);
  const iniciarSesion = useStore((s) => s.iniciarSesion);

  // ── Datos derivados ──────────────────────────────────────────────────────────
  // activarRutina archiva la que estaba activa, así que hay a lo más una.
  const activa = rutinas.find((r) => r.estado === 'activa') ?? null;
  // iniciarSesion devuelve la que ya está en curso en vez de abrir otra, así que también es una o ninguna.
  const enCurso = sesiones.find((s) => s.estado === 'en_curso') ?? null;
  // El día que toca: el siguiente al de la última sesión cerrada de esta rutina, en ciclo.
  // Los useMemo evitan recorrer todas las sesiones en cada render; se recalculan cuando cambian.
  const dia = useMemo(() => (activa ? proximoDia(activa, sesiones) : null), [activa, sesiones]);
  const stats = useMemo(() => estadisticasDelMes(sesiones), [sesiones]);
  const semana = useMemo(() => diasDeLaSemana(sesiones), [sesiones]);
  const racha = useMemo(() => rachaDias(sesiones), [sesiones]);
  // sesionesCerradas ya viene de la más reciente a la más antigua; se muestran las tres primeras.
  const ultimas = useMemo(() => sesionesCerradas(sesiones).slice(0, 3), [sesiones]);

  const series = dia?.ejercicios.reduce((a, re) => a + re.series, 0) ?? 0;
  // Minutos estimados: cada serie cuesta su descanso más unos 40 s de esfuerzo. Es una
  // aproximación para la tarjeta, no se guarda en ningún lado; la duración real la mide la sesión.
  const minutos = dia ? Math.round(dia.ejercicios.reduce((a, re) => a + re.series * (re.descansoS + 40), 0) / 60) : 0;
  const hechasSemana = semana.filter(Boolean).length;

  // ── Acciones ─────────────────────────────────────────────────────────────────
  /**
   * Abre la sesión del día que toca y salta a la bitácora.
   * Solo se llega aquí cuando no hay sesión en curso (si la hay, la tarjeta muestra "Retomar");
   * igual, si hubiera una, el store devolvería esa misma en vez de crear otra.
   */
  function empezar() {
    if (!activa || !dia) return;
    const s = iniciarSesion(activa.id, dia.id);
    router.push(`/sesion/${s.id}`);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  // Orden de arriba a abajo: saludo, aviso de error (si hay), tarjeta principal, números
  // del mes, la semana y las últimas sesiones.
  return (
    <Pantalla>
      {/* Saludo con la fecha larga ("Miércoles 23 de septiembre") y la racha en días */}
      <View className="mb-5 flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Txt v="etiquetaPrimaria">{fmtFecha(new Date(), 'larga')}</Txt>
          <Txt v="titulo" className="mt-1">{perfil.nombre ? `Hola, ${perfil.nombre}` : 'Hola'}</Txt>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5">
          <View className="h-2 w-2 rounded-full bg-accent" />
          <Text className="font-mono-medium text-xs text-accent-deep">
            {racha} {racha === 1 ? 'día' : 'días'}
          </Text>
        </View>
      </View>

      {/* Si no se pudo leer lo guardado se avisa antes que nada; la bandera la pone useStore.ts al hidratar */}
      {errorCarga ? (
        <Tarjeta tono="peligro" className="mb-4 gap-1">
          <Txt v="cuerpoMedio">No se pudieron leer tus datos guardados</Txt>
          <Txt v="secundario">Para no pisarlos, la app no guardará nada en esta sesión. Cierra la app y vuelve a abrirla.</Txt>
        </Tarjeta>
      ) : null}

      {/* Tarjeta principal, en este orden de prioridad: sesión a medias, rutina de hoy, o el vacío
          si no hay rutina activa. Empezar se deshabilita si el día no tiene ejercicios. */}
      {enCurso ? (
        <Tarjeta tono="acento" className="gap-3">
          <Text className="font-mono text-[11px] uppercase tracking-widest text-accent-deep">Sesión en curso</Text>
          <Txt v="h2">{enCurso.nombreDia}</Txt>
          <Txt v="secundario">Empezaste {fmtHace(enCurso.iniciadaAt)}. Retómala donde la dejaste.</Txt>
          <Boton titulo="Retomar sesión" variante="acento" onPress={() => router.push(`/sesion/${enCurso.id}`)} />
        </Tarjeta>
      ) : activa && dia ? (
        <Tarjeta className="gap-3">
          <Txt v="etiqueta">Rutina de hoy</Txt>
          <View>
            <Txt v="h2">
              {dia.nombre} · Semana {semanaDeRutina(activa)}
            </Txt>
            <Txt v="secundario">{activa.nombre}</Txt>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Etiqueta texto={`${dia.ejercicios.length} ejercicios`} />
            <Etiqueta texto={`${series} series`} />
            <Etiqueta texto={`~${minutos} min`} />
          </View>
          <Boton titulo="Empezar rutina" onPress={empezar} disabled={dia.ejercicios.length === 0} />
          {dia.ejercicios.length === 0 ? (
            <Txt v="pequeno">Este día no tiene ejercicios. Agrégalos desde Rutinas.</Txt>
          ) : null}
        </Tarjeta>
      ) : (
        <Vacio
          titulo="No tienes una rutina activa"
          texto="Crea una o activa una de tus rutinas para empezar a registrar."
          accion="Ir a Rutinas"
          onAccion={() => router.push('/rutinas')}
        />
      )}

      {/* Números del mes calendario en curso (no de los últimos 30 días) */}
      <View className="mt-4 flex-row gap-2">
        <Dato valor={String(stats.sesiones)} etiqueta="sesiones este mes" />
        <Dato valor={fmtVolumen(stats.volumenKg)} etiqueta="volumen del mes" />
        <Dato valor={String(stats.prs)} etiqueta="récords del mes" />
      </View>

      {/* Un punto por día, lunes a domingo; se pinta si hubo sesión cerrada ese día.
          El "de N" es la cantidad de días de la rutina activa, no los días de la semana. */}
      <Separador titulo="Esta semana" />
      <Tarjeta className="gap-3">
        <View className="flex-row items-center justify-between">
          <Txt v="cuerpoMedio">
            {hechasSemana} {hechasSemana === 1 ? 'sesión' : 'sesiones'}
            {activa ? ` de ${activa.dias.length}` : ''}
          </Txt>
        </View>
        <View className="flex-row justify-between">
          {semana.map((hecha, i) => (
            <View key={LETRAS[i]} className="items-center gap-1.5">
              <View className={`h-8 w-8 rounded-full ${hecha ? 'bg-primary' : 'bg-field'}`} />
              <Text className="font-mono text-[11px] text-ink-muted">{LETRAS[i]}</Text>
            </View>
          ))}
        </View>
      </Tarjeta>

      {/* Las tres últimas cerradas; tocar una abre su resumen en sesion/[id].
          cerradaAt ?? iniciadaAt: una cerrada siempre tiene cerradaAt, el ?? es solo por el tipo. */}
      <Separador titulo="Últimas sesiones" />
      {ultimas.length === 0 ? (
        <Vacio titulo="Todavía no hay sesiones" texto="La primera que cierres queda aquí, con su volumen y su tiempo." />
      ) : (
        <Tarjeta className="py-1">
          {ultimas.map((s, i) => (
            <Fila
              key={s.id}
              ultimo={i === ultimas.length - 1}
              onPress={() => router.push(`/sesion/${s.id}`)}
              izquierda={
                <>
                  <Txt v="cuerpoMedio">{s.nombreDia}</Txt>
                  <Txt v="secundario">
                    {fmtFecha(s.cerradaAt ?? s.iniciadaAt)} · {fmtHace(s.cerradaAt ?? s.iniciadaAt)}
                  </Txt>
                </>
              }
              derecha={
                <View className="items-end">
                  <Txt v="mono">{fmtVolumen(s.volumenKg ?? 0)}</Txt>
                  <Txt v="monoSecundario">{fmtDuracion(s.duracionS ?? 0)}</Txt>
                </View>
              }
            />
          ))}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
