import { fmtDuracion, fmtFecha, fmtHace, fmtVolumen, proximoDia, semanaDeRutina, sesionesCerradas } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Boton, Dato, Etiqueta, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { diasDeLaSemana, estadisticasDelMes, rachaDias } from '@/store/selectors';
import { useStore } from '@/store/useStore';

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function Hoy() {
  const perfil = useStore((s) => s.perfil);
  const errorCarga = useStore((s) => s.errorCarga);
  const rutinas = useStore((s) => s.rutinas);
  const sesiones = useStore((s) => s.sesiones);
  const iniciarSesion = useStore((s) => s.iniciarSesion);

  const activa = rutinas.find((r) => r.estado === 'activa') ?? null;
  const enCurso = sesiones.find((s) => s.estado === 'en_curso') ?? null;
  const dia = useMemo(() => (activa ? proximoDia(activa, sesiones) : null), [activa, sesiones]);
  const stats = useMemo(() => estadisticasDelMes(sesiones), [sesiones]);
  const semana = useMemo(() => diasDeLaSemana(sesiones), [sesiones]);
  const racha = useMemo(() => rachaDias(sesiones), [sesiones]);
  const ultimas = useMemo(() => sesionesCerradas(sesiones).slice(0, 3), [sesiones]);

  const series = dia?.ejercicios.reduce((a, re) => a + re.series, 0) ?? 0;
  const minutos = dia ? Math.round(dia.ejercicios.reduce((a, re) => a + re.series * (re.descansoS + 40), 0) / 60) : 0;
  const hechasSemana = semana.filter(Boolean).length;

  function empezar() {
    if (!activa || !dia) return;
    const s = iniciarSesion(activa.id, dia.id);
    router.push(`/sesion/${s.id}`);
  }

  return (
    <Pantalla>
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

      {errorCarga ? (
        <Tarjeta tono="peligro" className="mb-4 gap-1">
          <Txt v="cuerpoMedio">No se pudieron leer tus datos guardados</Txt>
          <Txt v="secundario">Para no pisarlos, la app no guardará nada en esta sesión. Cierra la app y vuelve a abrirla.</Txt>
        </Tarjeta>
      ) : null}

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

      <View className="mt-4 flex-row gap-2">
        <Dato valor={String(stats.sesiones)} etiqueta="sesiones este mes" />
        <Dato valor={fmtVolumen(stats.volumenKg)} etiqueta="volumen del mes" />
        <Dato valor={String(stats.prs)} etiqueta="récords del mes" />
      </View>

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
