import { METODOS } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Cabecera, Etiqueta, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { useStore } from '@/store/useStore';

const PESO_ESTADO = { activa: 0, borrador: 1, archivada: 2 } as const;
const NOMBRE_ESTADO = { activa: 'Activa', borrador: 'Borrador', archivada: 'Archivada' } as const;

export default function Rutinas() {
  const rutinas = useStore((s) => s.rutinas);
  const crearRutina = useStore((s) => s.crearRutina);

  const ordenadas = useMemo(
    () =>
      rutinas
        .slice()
        .sort((a, b) => PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado] || b.actualizadoAt.localeCompare(a.actualizadoAt)),
    [rutinas],
  );

  function crear() {
    const r = crearRutina('Nueva rutina');
    router.push(`/rutina/${r.id}`);
  }

  return (
    <Pantalla>
      <Cabecera titulo="Rutinas" subtitulo="Arma la tuya o edita la que tienes." />

      <Pressable onPress={crear} className="flex-row items-center gap-3 rounded-card bg-primary p-4 active:opacity-80">
        <View className="flex-1">
          <Text className="font-sans-bold text-base text-white">Crear rutina</Text>
          <Text className="font-sans text-sm text-white/80">Elige ejercicios, series y descansos</Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <Text className="font-sans-bold text-2xl text-white">+</Text>
        </View>
      </Pressable>

      <Separador titulo="Mis rutinas" />
      {ordenadas.length === 0 ? (
        <Vacio titulo="Todavía no tienes rutinas" texto="Crea la primera con el botón de arriba." />
      ) : (
        <Tarjeta className="py-1">
          {ordenadas.map((r, i) => {
            const ejercicios = r.dias.reduce((a, d) => a + d.ejercicios.length, 0);
            const metodo = METODOS.find((m) => m.id === r.metodo)?.nombre ?? r.metodo;
            return (
              <Fila
                key={r.id}
                ultimo={i === ordenadas.length - 1}
                onPress={() => router.push(`/rutina/${r.id}`)}
                izquierda={
                  <>
                    <View className="flex-row items-center gap-2">
                      <Txt v="cuerpoMedio" className="flex-shrink">{r.nombre}</Txt>
                      <Etiqueta texto={NOMBRE_ESTADO[r.estado]} acento={r.estado === 'activa'} />
                    </View>
                    <Txt v="secundario" className="mt-0.5">
                      {r.dias.length} {r.dias.length === 1 ? 'día' : 'días'} · {ejercicios} ejercicios · {metodo}
                    </Txt>
                  </>
                }
                derecha={<Text className="font-sans-bold text-xl text-ink-faint">›</Text>}
              />
            );
          })}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
