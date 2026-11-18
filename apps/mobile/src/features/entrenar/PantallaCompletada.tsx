// ─────────────────────────────────────────────────────────────────────────────
// Rutina completada · Zona: Entrenar
//
// Qué hace: la pantalla 13 (completada.html). El símbolo con su trazo ámbar, la felicitación (o
// «Sesión guardada» si quedaron series sin marcar), el avance de series y, sin señal, el aviso de
// que la sesión quedó en el teléfono y se sube sola. Después: volumen, tiempo, energía y récords;
// los récords de hoy; la próxima sesión; las sugerencias para la próxima vez; el recordatorio de
// peso y anotar una observación de la sesión. Abajo: Volver al inicio y Ver mi progreso.
// Muestra al instante lo calculado en el teléfono y, cuando llega la respuesta de cerrar, la del
// servidor (CU-30 paso 5, APP-032).
// Tócalo cuando: cambie lo que muestra el cierre.
// No lo toques para: cómo se calcula (sesionLocal.ts, contrato.ts).
// Depende de: @/components/ui, @/lib/sesion, @/lib/tema, ./almacen, ./formato, ./HojaObservacion.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avance, Boton, Ceja, Icono, Separador, Simbolo, Tarjeta, Titulo, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { useDatosEntrenar, useEntrenar } from './almacen';
import { nombreZona } from './contrato';
import { cifra, fechaCorta, fechaLarga, reloj, toneladas } from './formato';
import { HojaObservacion } from './HojaObservacion';
import type { CierreGuardado, ResumenCierre } from './modelo';
import { useSincronizar } from './useSincronizar';

export function PantallaCompletada({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();
  const uid = usuario?.id ?? null;
  const datos = useDatosEntrenar(uid);
  const hidratado = useEntrenar((s) => s.hidratado);
  const cierre = datos.cierres[id];
  useSincronizar(uid);

  if (!cierre || !uid) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-fondo px-4" style={{ paddingTop: insets.top }}>
        <Txt v="h3">{hidratado ? 'No encontramos esta sesión' : 'Cargando…'}</Txt>
        {hidratado ? <Boton titulo="Volver al inicio" variante="secundario" onPress={() => router.dismissTo('/')} /> : null}
      </View>
    );
  }
  return <Completada uid={uid} cierre={cierre} sinRed={datos.sinRed} />;
}

function Completada({ uid, cierre, sinRed }: { uid: string; cierre: CierreGuardado; sinRed: boolean }) {
  const insets = useSafeAreaInsets();
  const aviso = useAviso();
  const { c } = useTema();
  const [hoja, setHoja] = useState(false);
  const r: ResumenCierre = cierre.servidor ?? cierre.local;
  const quedan = r.series_total - r.series_hechas;
  const incompleta = quedan > 0;
  const quien = cierre.entrenador_nombre;

  const titulo = incompleta
    ? 'Sesión guardada'
    : r.prs.length === 1
      ? 'Un récord hoy'
      : r.prs.length === 2
        ? 'Dos récords hoy'
        : r.prs.length > 2
          ? `${r.prs.length} récords hoy`
          : `${cierre.nombre_dia} lista`;
  const sec = incompleta
    ? `Quedaron ${quedan} ${quedan === 1 ? 'serie' : 'series'} sin marcar${r.ejercicios_incompletos.length ? `, de ${unir(r.ejercicios_incompletos)}` : ''}. Se guardaron como no hechas.`
    : [cierre.nombre_dia, cierre.semana ? `semana ${cierre.semana.actual} de ${cierre.semana.total}` : null, fechaLarga(cierre.cerrada_at).toLowerCase()].filter(Boolean).join(' · ');
  const suben = r.sugerencias.filter((s) => s.sube_kg > 0).length;
  const subeEjemplo = r.sugerencias.find((s) => s.sube_kg > 0)?.sube_kg ?? 2.5;

  return (
    <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-5" showsVerticalScrollIndicator={false}>
        {/* Felicitación */}
        <View accessibilityLabel="Resumen">
          <View className="mb-5">
            <Simbolo tamano={56} />
          </View>
          {incompleta ? <Ceja>{cierre.nombre_dia}</Ceja> : <Ceja acento>Sesión completada</Ceja>}
          <Titulo className="mt-1">{titulo}</Titulo>
          <Txt v="sec" className="mt-1.5">
            {sec}
          </Txt>
          <View className="mt-5">
            <Avance total={r.series_total} hechos={r.series_hechas} etiqueta={`${r.series_hechas} de ${r.series_total} series`} />
          </View>
          <Text className="mt-2 font-sans-medium text-[13px] text-texto-2">
            <Text className="font-mono-bold text-texto">{r.series_hechas}</Text> de <Text className="font-mono-bold text-texto">{r.series_total}</Text> series
          </Text>
          {cierre.envio === 'pendiente' && sinRed ? (
            <View accessibilityRole="alert" className="mt-3 flex-row items-start gap-3 rounded-control border border-borde bg-sup px-3.5 py-3">
              <Icono nombre="sinSenal" tamano={20} color={c.texto} />
              <Txt v="cuerpo" className="flex-1 text-[14px] leading-[20px]">
                Sin señal. La sesión quedó guardada en tu teléfono y se sube sola cuando vuelva la conexión.
              </Txt>
            </View>
          ) : null}
          {cierre.envio === 'rechazada' ? (
            <View accessibilityRole="alert" className="mt-3 rounded-control border border-peligro bg-sup px-3.5 py-3">
              <Txt v="cuerpo" className="text-[14px] leading-[20px]">
                {`No se pudo subir la sesión${cierre.motivo ? `: ${cierre.motivo}` : '.'} Quedó guardada en tu teléfono; la puedes reintentar desde Perfil.`}
              </Txt>
            </View>
          ) : null}
        </View>

        {/* Cifras */}
        <View className="mt-5 flex-row flex-wrap gap-2">
          <Dato rot="Volumen" valor={toneladas(r.volumen_kg)} unidad="t" extra="levantadas" />
          <Dato rot="Tiempo" valor={reloj(r.duracion_s)} extra="min y segundos" />
          {r.kcal !== null ? <Dato rot="Energía" valor={String(r.kcal)} unidad="kcal" extra="estimadas" /> : null}
          <Dato rot="Récords" valor={String(r.prs.length)} acento={r.prs.length > 0} extra={r.prs.length ? 'de peso' : 'esta vez'} />
        </View>

        {/* Récords */}
        {r.prs.length ? (
          <>
            <Separador titulo="Récords de hoy" />
            <Tarjeta className="py-2">
              {r.prs.map((p, i) => (
                <View key={`${p.exercise_id}-${i}`} className={`min-h-[56px] flex-row items-center gap-3 py-2.5 ${i === r.prs.length - 1 ? '' : 'border-b border-sup-alta'}`}>
                  <Simbolo tamano={24} />
                  <View className="flex-1">
                    <Txt v="cuerpo">{p.nombre}</Txt>
                    <Txt v="sec" className="mt-0.5 text-[13px]">
                      {[p.marca, p.antes].filter(Boolean).join(' · ')}
                    </Txt>
                  </View>
                  {p.diferencia ? <Text className="font-mono-bold text-[16px] text-acento-texto">{p.diferencia}</Text> : null}
                </View>
              ))}
            </Tarjeta>
          </>
        ) : (
          <>
            <Separador titulo="Récords" />
            <Tarjeta>
              <Txt v="sec">
                {suben > 0
                  ? `Hoy no hubo récords. Igualaste tus marcas y eso también cuenta: la próxima vez subes en ${suben} ${suben === 1 ? 'ejercicio' : 'ejercicios'}.`
                  : 'Hoy no hubo récords. Igualaste tus marcas y eso también cuenta.'}
              </Txt>
            </Tarjeta>
          </>
        )}

        {/* Próxima sesión */}
        {r.proxima ? (
          <>
            <Separador titulo="Próxima sesión" />
            <Tarjeta
              etiqueta={`Próxima sesión: ${r.proxima.nombre}`}
              onPress={cierre.routine_id ? () => router.push({ pathname: '/rutina/[id]', params: { id: cierre.routine_id ?? '' } }) : undefined}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  {r.proxima.fecha ? <Ceja>{fechaLarga(r.proxima.fecha)}</Ceja> : null}
                  <Txt v="h3" className="mt-0.5">
                    {r.proxima.nombre}
                  </Txt>
                </View>
                {cierre.routine_id ? <Icono nombre="adelante" tamano={24} color={c['texto-2']} /> : null}
              </View>
            </Tarjeta>
          </>
        ) : null}

        {/* Sugerencias */}
        {r.sugerencias.length ? (
          <>
            <Separador titulo={`Para la próxima ${cierre.nombre_dia}`} />
            <Tarjeta className="py-2">
              {r.sugerencias.map((s, i) => (
                <View key={`${s.routine_exercise_id ?? s.nombre}-${i}`} className={`min-h-[56px] flex-row items-center justify-between gap-3 py-2.5 ${i === r.sugerencias.length - 1 ? '' : 'border-b border-sup-alta'}`}>
                  <View className="flex-1">
                    <Txt v="cuerpo">{s.nombre}</Txt>
                    <Txt v="sec" className="mt-0.5 text-[13px] leading-[18px]">
                      {s.por}
                    </Txt>
                  </View>
                  <View className="items-end gap-0.5">
                    <Text className={`font-mono-bold text-[16px] ${s.peso_kg === null ? 'text-texto-2' : 'text-texto'}`}>
                      {s.sube_kg > 0 ? <Text className="text-acento-texto">{`+${cifra(s.sube_kg)}  `}</Text> : null}
                      {s.peso_kg !== null ? `${cifra(s.peso_kg)} kg` : 'sin peso'}
                    </Text>
                    <Text className="font-mono-medium text-[13px] text-texto-2">{`× ${s.reps_min}–${s.reps_max}`}</Text>
                  </View>
                </View>
              ))}
            </Tarjeta>
            <Text className="mt-2 font-sans-medium text-[13px] text-texto-2">
              <Text className="font-mono-bold text-acento-texto">{`+${cifra(subeEjemplo)}  `}</Text>
              {`sube el peso · sin signo, repite.${quien ? ` ${quien} puede cambiarlas antes de la próxima sesión.` : ''}`}
            </Text>
          </>
        ) : null}

        {/* Peso */}
        <Separador titulo="Tu peso" />
        <Tarjeta>
          <Txt v="sec">
            {cierre.peso_corporal
              ? `El último registro es${cierre.peso_corporal.fecha ? ` del ${fechaCorta(cierre.peso_corporal.fecha)}` : ''}: ${cifra(cierre.peso_corporal.kg)} kg. Anótalo hoy para seguir tu tendencia y para que las kcal salgan más justas.`
              : 'Todavía no registras tu peso. Anótalo para seguir tu tendencia y para estimar las kcal.'}
          </Txt>
          <Boton titulo="Registrar peso" variante="secundario" ancho className="mt-3" onPress={() => router.dismissTo('/progreso')} />
        </Tarjeta>

        {/* Observación */}
        <View className="mt-6">
          {cierre.observacion ? (
            <Tarjeta>
              <Ceja>
                {cierre.observacion.tipo === 'dolor' ? `Dolor · ${nombreZona(cierre.observacion.zona)} · ${cierre.observacion.intensidad ?? ''} de 10` : 'Observación'}
              </Ceja>
              <View className="mt-2 border-l-4 border-hecho-fondo py-0.5 pl-3">
                <Txt v="cuerpo" className="text-[15px] leading-[22px]">
                  {cierre.observacion.texto || 'Sin comentario.'}
                </Txt>
              </View>
              {quien ? (
                <Txt v="sec" className="mt-2 text-[13px]">
                  {`${quien} la ve en tu ficha y te puede responder.`}
                </Txt>
              ) : null}
            </Tarjeta>
          ) : (
            <Boton titulo={incompleta ? 'Anotar por qué quedaron series' : 'Anotar observación de la sesión'} variante="secundario" ancho onPress={() => setHoja(true)} />
          )}
        </View>
      </ScrollView>

      <View className="flex-row gap-2 border-t border-sup-alta bg-fondo px-4 pt-3" style={{ paddingBottom: 12 + insets.bottom }}>
        <View className="flex-1">
          <Boton titulo="Volver al inicio" variante="secundario" alto ancho onPress={() => router.dismissTo('/')} />
        </View>
        <View className="flex-1">
          <Boton titulo="Ver mi progreso" alto ancho onPress={() => router.dismissTo('/progreso')} />
        </View>
      </View>

      <HojaObservacion
        visible={hoja}
        titulo="Sobre la sesión"
        nota="La sesión ya no se edita, pero puedes sumarle observaciones."
        entrenador={quien}
        ejemplos={{ observacion: 'Por ejemplo: dormí poco y me costó la sentadilla', dolor: 'Por ejemplo: molestia en la rodilla derecha al bajar en la sentadilla' }}
        onCerrar={() => setHoja(false)}
        onGuardar={(o) => {
          setHoja(false);
          useEntrenar.getState().anotar(uid, { ...o, sessionId: cierre.id, cierreId: cierre.id });
          const fuerte = o.tipo === 'dolor' && (o.intensidad ?? 0) >= 7;
          aviso.mostrar(quien ? (fuerte ? `Guardado. ${quien} recibió un aviso por el dolor.` : `Guardado. ${quien} lo verá en tu ficha.`) : 'Guardado.');
        }}
      />
    </View>
  );
}

function Dato({ rot, valor, unidad, extra, acento = false }: { rot: string; valor: string; unidad?: string; extra: string; acento?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${rot}: ${valor}${unidad ? ` ${unidad}` : ''}, ${extra}`} className="min-w-[45%] flex-1 rounded-control border border-sup-alta bg-sup px-3.5 py-3">
      <Txt v="sec" className="text-[13px]">
        {rot}
      </Txt>
      <Text className={`mt-1.5 font-mono-bold text-[26px] leading-[29px] ${acento ? 'text-acento-texto' : 'text-texto'}`}>
        {valor}
        {unidad ? <Text className="font-sans-medium text-[14px] text-texto-2">{` ${unidad}`}</Text> : null}
      </Text>
      <Txt v="sec" className="mt-1 text-[13px]">
        {extra}
      </Txt>
    </View>
  );
}

function unir(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
