// ─────────────────────────────────────────────────────────────────────────────
// Detalle de un ejercicio · Zona: Rutas
//
// Qué hace: la ficha de un ejercicio de la biblioteca: el récord vigente, cuántas sesiones lo
// registran, las instrucciones y el historial de las últimas 12 sesiones con sus series. Si es un
// ejercicio propio, además se edita (con FormularioEjercicio) o se elimina; los de la biblioteca
// base no se tocan.
// Tócalo cuando: cambie qué muestra la ficha, cuántas sesiones se listan, o las reglas de esta
// pantalla para editar y eliminar.
// No lo toques para: los campos del formulario, que viven en src/components/FormularioEjercicio.tsx;
// cómo se calcula el récord, en packages/shared/src/cierre.ts (marcaVigente); ni la regla de
// "no se borra si está en una rutina", que también vive en eliminarEjercicio de src/store/useStore.ts.
// Depende de: @gymtrack/shared (etiquetaMarca, fmtFecha, fmtMarca, marcaVigente, sesionesCerradas y
// el tipo Exercise), @/components/FormularioEjercicio, @/components/ui, @/lib/formato (resumenSets)
// y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────
import { etiquetaMarca, fmtFecha, fmtMarca, marcaVigente, sesionesCerradas, type Exercise } from '@gymtrack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { InteractionManager, Text, View } from 'react-native';
import { FormularioEjercicio } from '@/components/FormularioEjercicio';
import { Boton, Cabecera, Confirmar, Dato, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { resumenSets } from '@/lib/formato';
import { useStore } from '@/store/useStore';

// ── Nombres visibles ─────────────────────────────────────────────────────────

/**
 * Cómo se llama cada patrón en pantalla. Va en minúsculas porque se lee dentro del subtítulo.
 * FormularioEjercicio tiene su propia copia con mayúscula inicial para los chips.
 */
const NOMBRE_PATRON: Record<Exercise['patron'], string> = {
  empuje: 'empuje',
  tiron: 'tirón',
  rodilla: 'rodilla',
  cadera: 'cadera',
  core: 'core',
  aislamiento: 'aislamiento',
};

/**
 * Pantalla /ejercicio/[id]. Recibe el id del ejercicio (Exercise.id) por la ruta.
 * Tiene tres vistas según el estado: "ya no existe", el formulario de edición y la ficha completa.
 */
export default function DetalleEjercicio() {
  // ── Estado y datos del store ─────────────────────────────────────────────────
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = useStore((s) => s.ejercicios.find((e) => e.id === id));
  const sesiones = useStore((s) => s.sesiones);
  // Las rutinas se leen solo para comprobar si el ejercicio está en alguna antes de eliminarlo.
  const rutinas = useStore((s) => s.rutinas);
  const editarEjercicio = useStore((s) => s.editarEjercicio);
  const eliminarEjercicio = useStore((s) => s.eliminarEjercicio);
  // editando: muestra el formulario en vez de la ficha. confirmar: la pregunta "¿Eliminar?" en línea.
  // error: por qué no se pudo eliminar (está en una rutina).
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derivados: historial y récord ────────────────────────────────────────────
  // Van antes de la guardia porque son hooks: React exige llamarlos siempre en el mismo orden.
  // Por eso el `if (!ex) return []` adentro en vez de un return temprano del componente.
  const historial = useMemo(() => {
    if (!ex) return [];
    // sesionesCerradas ya viene ordenado de la más reciente a la más antigua; se muestran solo 12.
    // El filtro con `x is {...}` le dice a TypeScript que `ej` existe de ahí en adelante, y deja
    // fuera las sesiones donde el ejercicio quedó sin ninguna serie.
    return sesionesCerradas(sesiones)
      .map((s) => ({ s, ej: s.ejercicios.find((e) => e.exerciseId === ex.id) }))
      .filter((x): x is { s: (typeof sesiones)[number]; ej: NonNullable<typeof x.ej> } => !!x.ej && x.ej.sets.length > 0);
  }, [ex, sesiones]);
  // Se muestran las últimas 12; el contador usa la lista completa.
  const ultimas = useMemo(() => historial.slice(0, 12), [historial]);
  // La mejor marca de todas las sesiones cerradas, medida con el tipo de carga actual del ejercicio.
  const marca = useMemo(() => (ex ? marcaVigente(ex.id, ex.tipoCarga, sesiones) : null), [ex, sesiones]);

  // ── Guardia: el ejercicio ya no existe ───────────────────────────────────────
  if (!ex) {
    return (
      <Pantalla>
        <Cabecera titulo="Ejercicio" atras />
        <Vacio titulo="Este ejercicio ya no existe" />
      </Pantalla>
    );
  }

  // ── Modo edición ─────────────────────────────────────────────────────────────
  // Solo se llega aquí con un ejercicio propio (el botón "Editar" no aparece en los de la base).
  // Ojo: si el ejercicio ya tiene sesiones cerradas, editarEjercicio ignora el cambio de tipo de
  // carga en silencio (ver el store); el formulario igual deja elegirlo.
  if (editando) {
    return (
      <Pantalla>
        <Cabecera titulo="Editar ejercicio" atras />
        <FormularioEjercicio
          inicial={ex}
          textoGuardar="Guardar cambios"
          onGuardar={(d) => {
            editarEjercicio(ex.id, d);
            setEditando(false);
          }}
        />
        <Boton titulo="Cancelar" variante="fantasma" className="mt-3" onPress={() => setEditando(false)} />
      </Pantalla>
    );
  }

  // ── Render: la ficha ─────────────────────────────────────────────────────────
  return (
    <Pantalla>
      <Cabecera titulo={ex.nombre} subtitulo={`${ex.grupo} · ${ex.equipo} · ${NOMBRE_PATRON[ex.patron]}`} atras />
      {/* Dos cifras arriba: el récord con su tipo (1RM estimado, repeticiones o segundos) y cuántas
          sesiones lo registran. Ojo: "sesiones registradas" cuenta las 12 del historial, no todas. */}
      <View className="flex-row gap-2">
        <Dato valor={marca ? fmtMarca(marca) : '–'} etiqueta={marca ? `récord · ${etiquetaMarca(marca.tipo)}` : 'sin récord todavía'} />
        <Dato valor={String(historial.length)} etiqueta="sesiones registradas" />
      </View>

      {ex.instrucciones ? (
        <Tarjeta className="mt-4">
          <Txt v="etiqueta" className="mb-1">Instrucciones</Txt>
          <Txt>{ex.instrucciones}</Txt>
        </Tarjeta>
      ) : null}
      {/* Tarjeta fija hasta que existan fotos y videos (están en el PRD, fase siguiente). */}
      <Tarjeta className="mt-4">
        <Txt v="etiqueta" className="mb-1">Referencia</Txt>
        <Txt v="secundario">Los videos y fotos de referencia llegan en la siguiente fase. Por ahora, las instrucciones escritas.</Txt>
      </Tarjeta>

      <Separador titulo="Historial" />
      {/* Una fila por sesión: fecha y día, el resumen de series ("60×8 · 60×8") y la observación si
          la hubo. Tocarla abre esa sesión. */}
      {ultimas.length === 0 ? (
        <Vacio titulo="Todavía no lo registras" texto="Cuando lo hagas en una sesión, cada serie queda aquí." />
      ) : (
        <Tarjeta className="py-1">
          {ultimas.map(({ s, ej }, i) => (
            <Fila
              key={s.id}
              ultimo={i === ultimas.length - 1}
              onPress={() => router.push(`/sesion/${s.id}`)}
              izquierda={
                <>
                  <Txt v="cuerpoMedio">
                    {fmtFecha(s.cerradaAt ?? s.iniciadaAt)} · {s.nombreDia}
                  </Txt>
                  <Txt v="mono" className="mt-0.5">{resumenSets(ej.sets, ej.tipoCarga)}</Txt>
                  {ej.observacion ? <Txt v="secundario" className="mt-0.5">{ej.observacion}</Txt> : null}
                </>
              }
            />
          ))}
        </Tarjeta>
      )}

      {/* Editar y eliminar solo en ejercicios propios. Los de la base tienen ids base-* fijos y las
          sesiones guardadas apuntan a ellos: no se tocan. */}
      {ex.propio ? (
        <View className="mt-6 gap-2">
          <Boton titulo="Editar ejercicio" variante="secundario" onPress={() => setEditando(true)} />
          <Boton titulo="Eliminar ejercicio" variante="peligro" onPress={() => setConfirmar(true)} />
          {/* Confirmación en línea, no Alert.alert: en web no funciona con botones. */}
          {confirmar ? (
            <Confirmar
              pregunta="¿Eliminar este ejercicio de tu biblioteca?"
              si="Sí, eliminar"
              onSi={() => {
                // Se comprueba antes de borrar: si está en una rutina no se navega, se explica.
                // Repite la regla de eliminarEjercicio en el store: como aquí primero se navega y
                // recién después se borra, el motivo que devuelve el store ya no se podría mostrar.
                const usado = rutinas.some((r) => r.dias.some((d) => d.ejercicios.some((re) => re.exerciseId === ex.id)));
                if (usado) {
                  setError('Está en una rutina (activa o archivada). Quítalo de la rutina primero.');
                  setConfirmar(false);
                  return;
                }
                // Primero la vuelta y recién después el borrado, para no ver "ya no existe" durante la animación.
                const id = ex.id;
                router.back();
                InteractionManager.runAfterInteractions(() => {
                  eliminarEjercicio(id);
                });
              }}
              onNo={() => setConfirmar(false)}
            />
          ) : null}
          {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
        </View>
      ) : (
        <Txt v="pequeno" className="mt-6">
          Ejercicio de la biblioteca base: no se edita. Si necesitas una variante, créala como ejercicio propio.
        </Txt>
      )}
    </Pantalla>
  );
}
