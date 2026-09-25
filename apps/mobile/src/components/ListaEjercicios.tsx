// ─────────────────────────────────────────────────────────────────────────────
// Lista de ejercicios · Zona: Kit de interfaz
//
// Qué hace: la biblioteca de ejercicios como lista con buscador y chips por grupo muscular. La usan
// la pestaña Ejercicios (para abrir la ficha) y "Agregar ejercicio" de una rutina (para sumarlo a un
// día). Quien la usa decide qué pasa al tocar una fila y qué va a la derecha de cada una. Vive en
// src/components/ (no en ui/) porque conoce el dominio: sabe qué es un Exercise.
// Tócalo cuando: cambie cómo se busca (hoy por nombre y equipo, sin distinguir acentos ni
// mayúsculas), el orden, los filtros o cómo se ve cada fila.
// No lo toques para: qué hace el toque en cada fila, eso lo pasa cada pantalla por `onPress`; ni
// para agregar ejercicios a la biblioteca base, eso es packages/shared/src/exercises.seed.ts.
// Depende de: @gymtrack/shared (GRUPOS y los tipos Exercise, GrupoMuscular), @gymtrack/tokens
// (colors, para el color del placeholder) y @/components/ui.
// ─────────────────────────────────────────────────────────────────────────────
import { GRUPOS, type Exercise, type GrupoMuscular } from '@gymtrack/shared';
import { colors } from '@gymtrack/tokens';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip, Txt, Vacio } from '@/components/ui';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** El chip elegido: "Todos" o uno de los grupos musculares de la biblioteca. */
type Filtro = 'Todos' | GrupoMuscular;

/**
 * Deja el texto listo para comparar: sin acentos y en minúsculas, así "maquina" encuentra "Máquina".
 * NFD separa cada letra acentuada en letra base + marca; la expresión regular borra esas marcas
 * (el rango va de U+0300 a U+036F y está escrito con los caracteres literales, por eso se ve raro).
 */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Lista filtrable de ejercicios.
 * - `ejercicios`: la biblioteca completa; el componente filtra y ordena por su cuenta.
 * - `onPress`: qué hacer al tocar una fila (abrir la ficha, agregarlo a la rutina).
 * - `derecha`: opcional, qué dibujar al final de la fila (un "+", el récord).
 * - `sinResultados`: opcional, qué mostrar cuando la búsqueda no encuentra nada.
 * Lo buscado y el grupo elegido son estado local: se pierden al salir de la pantalla.
 */
export function ListaEjercicios({
  ejercicios,
  onPress,
  derecha,
  sinResultados,
}: {
  ejercicios: readonly Exercise[];
  onPress: (ex: Exercise) => void;
  derecha?: (ex: Exercise) => ReactNode;
  sinResultados?: ReactNode;
}) {
  // ── Estado y filtrado ────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState<Filtro>('Todos');

  // Se recalcula solo cuando cambia la biblioteca, el texto o el chip; con cientos de ejercicios
  // no se nota, pero evita ordenar de nuevo en cada render por otra causa.
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    // Primero el grupo, después el texto (busca en nombre y en equipo: "polea" también encuentra).
    // El orden es alfabético con reglas del español, para que la ñ y los acentos queden bien.
    return ejercicios
      .filter((e) => grupo === 'Todos' || e.grupo === grupo)
      .filter((e) => q === '' || normalizar(e.nombre).includes(q) || normalizar(e.equipo).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [ejercicios, busqueda, grupo]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View className="gap-3">
      {/* El color del placeholder no se puede poner por className: por eso el token en duro.
          autoCorrect apagado para que el teclado no "corrija" nombres como "hip thrust". */}
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar ejercicio"
        placeholderTextColor={colors.ink.faint}
        autoCorrect={false}
        className="rounded-field border border-line bg-surface px-4 py-3.5 font-sans text-base text-ink"
      />
      {/* Chips en una fila que se desliza de lado: "Todos" y después cada grupo muscular. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {(['Todos', ...GRUPOS] as const).map((g) => (
          <Chip key={g} titulo={g} activo={grupo === g} onPress={() => setGrupo(g)} />
        ))}
      </ScrollView>
      {/* Quien usa la lista puede pasar su propio vacío (por ejemplo, con un botón para crear el ejercicio). */}
      {filtrados.length === 0 ? (
        (sinResultados ?? <Vacio titulo="Sin resultados" texto="Prueba con otro nombre o crea el ejercicio." />)
      ) : (
        <View className="rounded-card border border-line bg-surface px-4">
          {filtrados.map((e, i) => (
            <Pressable
              key={e.id}
              onPress={() => onPress(e)}
              className={`flex-row items-center gap-3 py-3 active:opacity-70 ${i === filtrados.length - 1 ? '' : 'border-b border-line'}`}
            >
              {/* El "avatar" son las dos primeras letras del grupo: Pi, Pe, Es, Ho, Br, Co. */}
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                <Text className="font-sans-bold text-sm text-primary-deep">{e.grupo.slice(0, 2)}</Text>
              </View>
              <View className="flex-1">
                <Txt v="cuerpoMedio">{e.nombre}</Txt>
                <Txt v="secundario">
                  {e.grupo} · {e.equipo}
                  {e.propio ? ' · propio' : ''}
                </Txt>
              </View>
              {derecha ? derecha(e) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
