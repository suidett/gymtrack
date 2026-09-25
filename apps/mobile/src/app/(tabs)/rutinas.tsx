// ─────────────────────────────────────────────────────────────────────────────
// Pantalla Rutinas · Zona: Rutas
//
// Qué hace: lista las rutinas del alumno (la activa primero, después los borradores y al final
// las archivadas) con su resumen de días, ejercicios y método, y tiene el botón para crear una.
// Tócalo cuando: cambies el orden de la lista, el texto de cada fila o el botón de crear.
// No lo toques para: editar una rutina, sus días o sus ejercicios (src/app/rutina/[id]/index.tsx),
// elegir ejercicios para un día (src/app/rutina/[id]/agregar.tsx), cambiar con qué nace una
// rutina nueva (crearRutina en src/store/useStore.ts) ni el catálogo de métodos de progresión
// (METODOS en packages/shared/src/types.ts).
// Depende de: @gymtrack/shared (METODOS), @/components/ui y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────

import { METODOS } from '@gymtrack/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Cabecera, Etiqueta, Fila, Pantalla, Separador, Tarjeta, Txt, Vacio } from '@/components/ui';
import { useStore } from '@/store/useStore';

// ── Orden de la lista ────────────────────────────────────────────────────────
// Menor peso va primero: la activa arriba, después lo que se está armando, al final lo archivado.
const PESO_ESTADO = { activa: 0, borrador: 1, archivada: 2 } as const;
// Cómo se le muestra cada estado al alumno en la etiqueta de la fila.
const NOMBRE_ESTADO = { activa: 'Activa', borrador: 'Borrador', archivada: 'Archivada' } as const;

/** Pestaña Rutinas. No recibe props: lee las rutinas del store y navega al editor. */
export default function Rutinas() {
  // ── Estado del store ─────────────────────────────────────────────────────────
  const rutinas = useStore((s) => s.rutinas);
  const crearRutina = useStore((s) => s.crearRutina);

  // Se copia con slice porque sort muta y el arreglo del store no se toca a mano.
  // Empate de estado: la editada más recientemente arriba. Las fechas son texto ISO, así que
  // comparar el texto equivale a comparar la fecha.
  const ordenadas = useMemo(
    () =>
      rutinas
        .slice()
        .sort((a, b) => PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado] || b.actualizadoAt.localeCompare(a.actualizadoAt)),
    [rutinas],
  );

  // ── Acciones ─────────────────────────────────────────────────────────────────
  /**
   * Crea un borrador con un día vacío y abre el editor de inmediato: el nombre y todo lo demás
   * se cambian allá. Por eso nace como "Nueva rutina" y no se pregunta nada aquí.
   */
  function crear() {
    const r = crearRutina('Nueva rutina');
    router.push(`/rutina/${r.id}`);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Pantalla>
      <Cabecera titulo="Rutinas" subtitulo="Arma la tuya o edita la que tienes." />

      {/* Botón grande de crear. Es un Pressable propio y no un Boton del kit porque lleva dos
          líneas de texto y el círculo con el +; el + es texto porque la app no usa iconos. */}
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
            // Si el método guardado ya no está en el catálogo (datos viejos), se muestra el id
            // tal cual antes que dejar el texto vacío.
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
