// ─────────────────────────────────────────────────────────────────────────────
// Motivos de la baja · Zona: Alumno (área Alertas del alumno, PAN-20)
//
// Qué hace: la pantalla de docs/pantallas/motivos.html que se abre cuando una alerta de baja de
// rendimiento (o de «sin avance») le pide motivos al alumno. Arriba qué pasó (la sesión frente al
// promedio de 4 semanas, o las sesiones sin superar la mejor serie), después «¿Qué pudo influir?»
// con los 6 motivos, el comentario y Enviar (n). Al enviar (POST /me/drop-reports) muestra hasta 3
// consejos por motivo (APP-044). Sin señal guarda los motivos en el teléfono, muestra los
// consejos sembrados y los manda solos la próxima vez que se abre Motivos o Progreso. Con «Otro»
// el comentario es obligatorio (la misma regla de la API) y el error va bajo el comentario.
// Tócalo cuando: cambie la pregunta, los motivos o cómo se muestran los consejos.
// No lo toques para: los textos de los consejos (./logica.ts, CONSEJOS_BASE) ni cuándo se abre
// Motivos (lo decide Hoy).
// Depende de: ./api, ./logica, ./piezas, ./useCarga, @/components/ui y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAccion, Boton, CampoTexto, Simbolo, Tarjeta, Txt } from '@/components/ui';
import { detalleDeError } from '@gymtrack/shared';
import { esSinConexion, useSesion } from '@/lib/sesion';
import { alertasPropias, enviarMotivos } from './api';
import type { Alerta } from './datos';
import {
  COMENTARIO_MOTIVOS_MAX,
  consejosPara,
  errorComentarioMotivos,
  iniciales,
  listaNatural,
  MOTIVOS,
  nombreMotivo,
  resumenAlerta,
  textoEnviar,
  type Motivo,
} from './logica';
import { Avatar, FilaElegible } from './piezas';
import { guardarCache, leerCache, useCarga } from './useCarga';

type Pendiente = { alert_id: string; motivos: string[]; comentario?: string };
const CLAVE_PENDIENTES = 'motivos-pendientes';

/** Manda los motivos que quedaron guardados sin señal. Lo que vuelve a fallar queda para otra vez. */
export async function enviarMotivosPendientes(usuarioId: string | undefined): Promise<void> {
  if (!usuarioId) return;
  const clave = `${usuarioId}.${CLAVE_PENDIENTES}`;
  const lista = (await leerCache<Pendiente[]>(clave)) ?? [];
  if (!lista.length) return;
  const quedan: Pendiente[] = [];
  for (const p of lista) {
    try {
      await enviarMotivos(p);
    } catch (e) {
      if (esSinConexion(e)) quedan.push(p);
    }
  }
  await guardarCache(clave, quedan);
}

export function PantallaMotivos({ alertaId }: { alertaId: string }) {
  const { usuario } = useSesion();
  const insets = useSafeAreaInsets();
  const carga = useCarga(`alerta.${alertaId}`, async () => {
    await enviarMotivosPendientes(usuario?.id).catch(() => {});
    const todas = await alertasPropias();
    return todas.find((a) => a.id === alertaId) ?? null;
  });
  const [elegidos, setElegidos] = useState<Motivo[]>([]);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorComentario, setErrorComentario] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ consejos: { [m: string]: string[] } | null; enCola: boolean } | null>(null);
  const ent = usuario?.entrenador ?? null;

  const alerta: Alerta = carga.datos ?? { id: alertaId, tipo: 'baja_rendimiento', estado: 'nueva', ejercicioNombre: null, detalle: {}, creadaAt: null };
  const r = resumenAlerta(alerta);
  const salir = () => router.replace('/');

  async function enviar() {
    // Lo mismo que revisa la API: «otro» pide el comentario y el comentario va hasta 500.
    const err = errorComentarioMotivos(elegidos, comentario);
    setErrorComentario(err);
    if (err) return;
    setEnviando(true);
    const cuerpo: Pendiente = { alert_id: alertaId, motivos: elegidos, ...(comentario.trim() ? { comentario: comentario.trim() } : {}) };
    try {
      const consejos = await enviarMotivos(cuerpo);
      setResultado({ consejos, enCola: false });
    } catch (e) {
      if (esSinConexion(e) && usuario) {
        const clave = `${usuario.id}.${CLAVE_PENDIENTES}`;
        const lista = (await leerCache<Pendiente[]>(clave)) ?? [];
        await guardarCache(clave, [...lista.filter((p) => p.alert_id !== alertaId), cuerpo]);
        setResultado({ consejos: null, enCola: true });
      } else if (detalleDeError(e).campo === 'comentario') {
        // Una regla del comentario: se queda en la pantalla con el motivo bajo el campo.
        setErrorComentario(detalleDeError(e).motivo);
      } else {
        // La API respondió con otro error: igual se muestran los consejos sembrados.
        setResultado({ consejos: null, enCola: false });
      }
    } finally {
      setEnviando(false);
    }
  }

  const barra = (
    <View className="min-h-[56px] flex-row items-center justify-between px-4">
      <Simbolo tamano={24} />
      {!resultado ? <Boton titulo="Ahora no" variante="fantasma" disabled={enviando} onPress={salir} /> : null}
    </View>
  );

  if (resultado) {
    const grupos = consejosPara(elegidos, resultado.consejos, ent?.nombre ?? null);
    return (
      <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
        {barra}
        <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8">
          <Txt v="cejaAcento">Gracias, {usuario?.nombre ?? ''}</Txt>
          <Txt v="titulo" className="mt-1" accessibilityRole="header">
            Ideas para esta semana
          </Txt>
          <Txt v="sec" className="mt-2">
            Según lo que marcaste: {listaNatural(elegidos.map((m) => nombreMotivo(m).toLowerCase()))}.
          </Txt>
          {resultado.enCola ? (
            <View accessibilityRole="alert" className="mt-4 rounded-control border border-sup-alta bg-sup px-3.5 py-3">
              <Txt v="cuerpo">Sin señal. Tus motivos quedaron guardados y se envían solos cuando vuelva la conexión.</Txt>
            </View>
          ) : null}
          {grupos.map((g) => (
            <Tarjeta key={g.motivo} className="mt-4">
              <Txt v="h3">{nombreMotivo(g.motivo)}</Txt>
              {g.motivo === 'otro' ? (
                <>
                  <Txt v="cuerpo" className="mt-2 italic">
                    {comentario.trim() ? `«${comentario.trim()}»` : 'Sin comentario.'}
                  </Txt>
                  <Txt v="sec" className="mt-1">
                    {ent ? `${ent.nombre} lo lee en tu ficha.` : 'Queda guardado en tu historial.'}
                  </Txt>
                </>
              ) : (
                g.consejos.map((t, i) => (
                  <View key={i} className="mt-3 flex-row gap-3">
                    <Text className="w-5 font-mono-bold text-[15px] text-acento-texto">{i + 1}</Text>
                    <Txt v="cuerpo" className="flex-1">
                      {t}
                    </Txt>
                  </View>
                ))
              )}
            </Tarjeta>
          ))}
          {ent ? (
            <Tarjeta className="mt-4">
              <View className="flex-row items-start gap-3">
                <Avatar texto={iniciales(ent.nombre, ent.apellido)} />
                <View className="flex-1">
                  <Txt v="h3">{`${ent.nombre} ${ent.apellido}`.trim()}</Txt>
                  <Txt v="sec" className="mt-1">
                    {resultado.enCola ? 'Verá tus motivos apenas se envíen.' : 'Ya ve tus motivos en tu ficha.'} Si hace falta, te ajusta las cargas antes de tu próximo
                    entrenamiento.
                  </Txt>
                </View>
              </View>
            </Tarjeta>
          ) : null}
        </ScrollView>
        <BarraAccion>
          <Boton titulo="Listo" alto ancho onPress={salir} />
        </BarraAccion>
      </View>
    );
  }

  const sesiones = Array.isArray(alerta.detalle.sesiones) ? (alerta.detalle.sesiones as unknown[]) : [];
  const n = elegidos.length;
  return (
    <View className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      {barra}
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8" keyboardShouldPersistTaps="handled">
        {r.ceja ? <Txt v="ceja">{r.ceja}</Txt> : null}
        <Txt v="titulo" className="mt-1" accessibilityRole="header">
          {r.titulo}
        </Txt>
        <Txt v="sec" className="mt-2">
          {r.texto} Es normal: el progreso no va en línea recta.
        </Txt>
        {r.promedioKg !== null && r.ultimaKg !== null && r.promedioKg > 0 ? (
          <View
            className="mt-4 gap-3"
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Promedio de 4 semanas ${(r.promedioKg / 1000).toFixed(1).replace('.', ',')} toneladas; la última ${(r.ultimaKg / 1000).toFixed(1).replace('.', ',')} toneladas`}
          >
            {[
              { rot: 'Promedio de 4 semanas', v: r.promedioKg, ancho: 100, ultima: false },
              { rot: 'Esta sesión', v: r.ultimaKg, ancho: Math.max(4, Math.min(100, (r.ultimaKg / r.promedioKg) * 100)), ultima: true },
            ].map((b) => (
              <View key={b.rot}>
                <View className="flex-row justify-between">
                  <Txt v="sec">{b.rot}</Txt>
                  <Text className="font-mono-bold text-[14px] text-texto">{(b.v / 1000).toFixed(1).replace('.', ',')} t</Text>
                </View>
                <View className="mt-1 h-3 rounded-[2px] bg-sup-alta">
                  <View className={`h-3 rounded-[2px] ${b.ultima ? 'bg-hecho-fondo' : 'bg-borde'}`} style={{ width: `${b.ancho}%` }} />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {sesiones.length ? (
          <View className="mt-4 flex-row gap-2">
            {sesiones.slice(-4).map((s, i) => {
              const o = (s ?? {}) as { fecha?: string; peso_kg?: number; reps?: number; marca?: string };
              return (
                <View key={i} className="flex-1 rounded-control border border-sup-alta bg-sup p-2">
                  <Txt v="ceja">{o.fecha ? o.fecha.slice(5, 10).split('-').reverse().join('/') : ''}</Txt>
                  <Text className="font-mono-bold text-[15px] text-texto">
                    {o.peso_kg ?? ''}
                    {o.reps ? ` × ${o.reps}` : ''}
                  </Text>
                  {o.marca ? <Txt v="sec">{o.marca}</Txt> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <Txt v="h3" className="mt-6" accessibilityRole="header">
          ¿Qué pudo influir?
        </Txt>
        <Txt v="sec">Marca todo lo que corresponda.</Txt>
        <View className="mt-2">
          {MOTIVOS.map((m) => (
            <FilaElegible
              key={m.id}
              titulo={m.nombre}
              detalle={m.ejemplo}
              marcada={elegidos.includes(m.id)}
              disabled={enviando}
              onPress={() => setElegidos((l) => (l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id]))}
            />
          ))}
        </View>
        <View className="mt-4">
          <CampoTexto
            etiqueta={elegidos.includes('otro') ? 'Comentario' : 'Comentario (opcional)'}
            valor={comentario}
            onCambiar={(v) => (setComentario(v), setErrorComentario(null))}
            error={errorComentario}
            maxLength={COMENTARIO_MOTIVOS_MAX}
            multilinea
            editable={!enviando}
            placeholder="Por ejemplo: esta semana dormí 5 horas por los turnos"
          />
        </View>
        <View className="mt-4 flex-row items-center gap-3">
          {ent ? <Avatar texto={iniciales(ent.nombre, ent.apellido)} /> : null}
          <Txt v="sec" className="flex-1">
            {ent ? `${ent.nombre} ya recibió el aviso. Lo que marques le ayuda a ajustar tu semana.` : 'Con lo que marques te mostramos qué hacer esta semana.'}
          </Txt>
        </View>
      </ScrollView>
      <BarraAccion>
        {!n ? (
          <Txt v="sec" className="text-center">
            Marca al menos una opción para enviar.
          </Txt>
        ) : null}
        <Boton titulo={textoEnviar(n, enviando)} alto ancho disabled={!n || enviando} onPress={enviar} />
      </BarraAccion>
    </View>
  );
}
