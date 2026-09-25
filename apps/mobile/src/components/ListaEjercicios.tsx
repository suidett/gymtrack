import { GRUPOS, type Exercise, type GrupoMuscular } from '@gymtrack/shared';
import { colors } from '@gymtrack/tokens';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip, Txt, Vacio } from '@/components/ui';

type Filtro = 'Todos' | GrupoMuscular;

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

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
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState<Filtro>('Todos');

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return ejercicios
      .filter((e) => grupo === 'Todos' || e.grupo === grupo)
      .filter((e) => q === '' || normalizar(e.nombre).includes(q) || normalizar(e.equipo).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [ejercicios, busqueda, grupo]);

  return (
    <View className="gap-3">
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar ejercicio"
        placeholderTextColor={colors.ink.faint}
        autoCorrect={false}
        className="rounded-field border border-line bg-surface px-4 py-3.5 font-sans text-base text-ink"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {(['Todos', ...GRUPOS] as const).map((g) => (
          <Chip key={g} titulo={g} activo={grupo === g} onPress={() => setGrupo(g)} />
        ))}
      </ScrollView>
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
