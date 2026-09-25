import { etiquetaMarca, fmtDuracion, fmtFecha, fmtHace, fmtMarca, fmtVolumen, marcaVigente, sesionesCerradas } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Cabecera, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { volumenPorSemana } from '@/store/selectors';
import { useStore } from '@/store/useStore';

export default function Progreso() {
  const sesiones = useStore((s) => s.sesiones);
  const ejercicios = useStore((s) => s.ejercicios);

  const cerradas = useMemo(() => sesionesCerradas(sesiones), [sesiones]);
  const semanas = useMemo(() => volumenPorSemana(sesiones, 8), [sesiones]);
  const records = useMemo(
    () =>
      ejercicios
        .map((e) => ({ e, m: marcaVigente(e.id, e.tipoCarga, sesiones) }))
        .filter((x): x is { e: (typeof ejercicios)[number]; m: NonNullable<typeof x.m> } => x.m != null)
        .sort((a, b) => b.m.fecha.localeCompare(a.m.fecha)),
    [ejercicios, sesiones],
  );

  const max = Math.max(1, ...semanas.map((s) => s.kg));
  const actual = semanas[semanas.length - 1]?.kg ?? 0;
  const anterior = semanas[semanas.length - 2]?.kg ?? 0;
  const variacion = anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null;

  return (
    <Pantalla>
      <Cabecera titulo="Progreso" />

      <Tarjeta className="gap-3">
        <View className="flex-row items-center justify-between">
          <Txt v="etiqueta">Volumen por semana</Txt>
          {variacion != null ? (
            <Text className={`font-mono-medium text-xs ${variacion >= 0 ? 'text-primary-deep' : 'text-danger'}`}>
              {variacion >= 0 ? '+' : ''}
              {variacion} %
            </Text>
          ) : null}
        </View>
        <View className="h-28 flex-row items-end gap-1.5">
          {semanas.map((s, i) => (
            <View key={s.etiqueta} className="flex-1 items-center justify-end">
              <View
                className={`w-full rounded-md ${i === semanas.length - 1 ? 'bg-primary' : 'bg-primary-soft'}`}
                style={{ height: Math.max(4, Math.round((s.kg / max) * 104)) }}
              />
            </View>
          ))}
        </View>
        <View className="flex-row justify-between">
          <Txt v="monoSecundario">desde el {semanas[0]?.etiqueta}</Txt>
          <Txt v="monoSecundario">esta semana · {fmtVolumen(actual)}</Txt>
        </View>
      </Tarjeta>

      <Separador titulo="Récords personales" />
      {records.length === 0 ? (
        <Vacio titulo="Todavía no hay récords" texto="Cada mejor marca por ejercicio aparece aquí al cerrar una sesión." />
      ) : (
        <Tarjeta className="py-1">
          {records.map(({ e, m }, i) => (
            <Fila
              key={e.id}
              ultimo={i === records.length - 1}
              onPress={() => router.push(`/ejercicio/${e.id}`)}
              izquierda={
                <>
                  <Txt v="cuerpoMedio">{e.nombre}</Txt>
                  <Txt v="secundario">
                    {fmtFecha(m.fecha)} · {etiquetaMarca(m.tipo)}
                  </Txt>
                </>
              }
              derecha={<Text className="font-mono-semibold text-base text-accent-deep">{fmtMarca(m)}</Text>}
            />
          ))}
        </Tarjeta>
      )}

      <Separador titulo="Sesiones" />
      {cerradas.length === 0 ? (
        <Vacio titulo="Todavía no hay sesiones" texto="Empieza una desde Hoy." />
      ) : (
        <Tarjeta className="py-1">
          {cerradas.map((s, i) => (
            <Fila
              key={s.id}
              ultimo={i === cerradas.length - 1}
              onPress={() => router.push(`/sesion/${s.id}`)}
              izquierda={
                <>
                  <Txt v="cuerpoMedio">{s.nombreDia}</Txt>
                  <Txt v="secundario">
                    {fmtFecha(s.cerradaAt ?? s.iniciadaAt)} · {fmtHace(s.cerradaAt ?? s.iniciadaAt)}
                    {s.prs.length ? ` · ${s.prs.length} PR` : ''}
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
