// ─────────────────────────────────────────────────────────────────────────────
// Pantalla Progreso · Zona: Rutas
//
// Qué hace: muestra el volumen levantado por semana (barras de las últimas ocho), la lista de
// récords vigentes por ejercicio y el historial completo de sesiones cerradas.
// Tócalo cuando: cambies el gráfico, cuántas semanas se ven, qué dice cada fila o su orden.
// No lo toques para: cambiar cómo se suma el volumen por semana (volumenPorSemana en
// src/store/selectors.ts), cómo se decide cuál es el récord de un ejercicio (marcaVigente en
// packages/shared/src/cierre.ts) ni el detalle de una sesión (src/app/sesion/[id].tsx).
// Depende de: @gymtrack/shared (etiquetaMarca, fmtDuracion, fmtFecha, fmtHace, fmtMarca,
// fmtVolumen, marcaVigente, sesionesCerradas), @/components/ui, @/store/selectors y
// @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────

import { etiquetaMarca, fmtDuracion, fmtFecha, fmtHace, fmtMarca, fmtVolumen, marcaVigente, sesionesCerradas } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Cabecera, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { volumenPorSemana } from '@/store/selectors';
import { useStore } from '@/store/useStore';

/** Pestaña Progreso. No recibe props: todo sale de las sesiones y los ejercicios del store. */
export default function Progreso() {
  // ── Estado del store ─────────────────────────────────────────────────────────
  const sesiones = useStore((s) => s.sesiones);
  const ejercicios = useStore((s) => s.ejercicios);

  // ── Datos derivados ──────────────────────────────────────────────────────────
  // sesionesCerradas ya viene de la más reciente a la más antigua.
  const cerradas = useMemo(() => sesionesCerradas(sesiones), [sesiones]);
  // Ocho semanas de la más antigua a la actual: la última del arreglo es esta semana.
  const semanas = useMemo(() => volumenPorSemana(sesiones, 8), [sesiones]);
  // Un récord por ejercicio, medido con el tipo de carga actual del ejercicio (kg, peso
  // corporal o tiempo). El filter con predicado de tipo es solo para que TypeScript sepa que
  // `m` ya no es null; después se ordena con el récord más reciente arriba.
  // Recorre todas las sesiones por cada ejercicio: si la biblioteca crece mucho y esto se
  // siente lento, muévelo a un selector en src/store/selectors.ts.
  const records = useMemo(
    () =>
      ejercicios
        .map((e) => ({ e, m: marcaVigente(e.id, e.tipoCarga, sesiones) }))
        .filter((x): x is { e: (typeof ejercicios)[number]; m: NonNullable<typeof x.m> } => x.m != null)
        .sort((a, b) => b.m.fecha.localeCompare(a.m.fecha)),
    [ejercicios, sesiones],
  );

  // ── Gráfico de volumen ───────────────────────────────────────────────────────
  // El piso de 1 evita dividir por cero cuando todas las semanas están en 0.
  const max = Math.max(1, ...semanas.map((s) => s.kg));
  const actual = semanas[semanas.length - 1]?.kg ?? 0;
  const anterior = semanas[semanas.length - 2]?.kg ?? 0;
  // Variación contra la semana pasada. Si la anterior fue 0 no hay porcentaje que mostrar
  // (sería infinito), por eso queda en null y el render la esconde.
  const variacion = anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Pantalla>
      <Cabecera titulo="Progreso" />

      {/* Barras: la altura es proporcional al máximo, con 104 px de tope (el alto h-28 es 112 px)
          y 4 px de mínimo para que una semana en 0 igual deje una marca. La actual va en color
          fuerte, las demás en menta suave. */}
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

      {/* Récords: tocar uno abre la ficha del ejercicio. etiquetaMarca dice con qué se midió
          (1RM estimado, repeticiones o segundos) y fmtMarca lo formatea. */}
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

      {/* Historial completo, sin límite: tocar una sesión abre su resumen en sesion/[id].
          Si la sesión dejó récords, se cuentan al final de la línea secundaria. */}
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
                    {s.prs.length ? ` · ${s.prs.length} ${s.prs.length === 1 ? 'récord' : 'récords'}` : ''}
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
