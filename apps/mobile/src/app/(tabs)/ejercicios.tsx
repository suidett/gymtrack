import { fmtMarca, marcaVigente, type MarcaHistorica } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { ListaEjercicios } from '@/components/ListaEjercicios';
import { Boton, Cabecera, Pantalla, Txt } from '@/components/ui';
import { useStore } from '@/store/useStore';

export default function Ejercicios() {
  const ejercicios = useStore((s) => s.ejercicios);
  const sesiones = useStore((s) => s.sesiones);

  const marcas = useMemo(() => {
    const m = new Map<string, MarcaHistorica>();
    for (const e of ejercicios) {
      const mv = marcaVigente(e.id, e.tipoCarga, sesiones);
      if (mv) m.set(e.id, mv);
    }
    return m;
  }, [ejercicios, sesiones]);

  return (
    <Pantalla>
      <Cabecera
        titulo="Ejercicios"
        subtitulo={`${ejercicios.length} en tu biblioteca`}
        derecha={<Boton titulo="Crear" variante="secundario" chico onPress={() => router.push('/ejercicio/nuevo')} />}
      />
      <ListaEjercicios
        ejercicios={ejercicios}
        onPress={(e) => router.push(`/ejercicio/${e.id}`)}
        derecha={(e) => {
          const m = marcas.get(e.id);
          return m ? (
            <View className="items-end">
              <Txt v="mono">{fmtMarca(m)}</Txt>
              <Txt v="monoSecundario">récord</Txt>
            </View>
          ) : (
            <Txt v="monoSecundario">sin récord</Txt>
          );
        }}
      />
    </Pantalla>
  );
}
