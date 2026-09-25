import { METODOS, type Routine, type RoutineDay } from '@gymtrack/shared';
import { colors } from '@gymtrack/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Boton, BotonRedondo, Cabecera, Campo, Chips, Confirmar, Pantalla, Separador, Stepper, Tarjeta, Txt, Vacio } from '@/components/ui';
import { newId } from '@/lib/ids';
import { useStore } from '@/store/useStore';

export default function EditorRutina() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rutina = useStore((s) => s.rutinas.find((r) => r.id === id));
  const ejercicios = useStore((s) => s.ejercicios);
  const sesiones = useStore((s) => s.sesiones);
  const guardarRutina = useStore((s) => s.guardarRutina);
  const activarRutina = useStore((s) => s.activarRutina);
  const archivarRutina = useStore((s) => s.archivarRutina);
  const duplicarRutina = useStore((s) => s.duplicarRutina);
  const eliminarRutina = useStore((s) => s.eliminarRutina);
  const iniciarSesion = useStore((s) => s.iniciarSesion);
  const [confirmar, setConfirmar] = useState(false);

  if (!rutina) {
    return (
      <Pantalla>
        <Cabecera titulo="Rutina" atras />
        <Vacio titulo="Esta rutina ya no existe" />
      </Pantalla>
    );
  }

  const enCurso = sesiones.some((s) => s.estado === 'en_curso');
  const totalEjercicios = rutina.dias.reduce((a, d) => a + d.ejercicios.length, 0);
  const patch = (fn: (r: Routine) => Routine) => guardarRutina(fn(rutina));
  const patchDia = (diaId: string, fn: (d: RoutineDay) => RoutineDay) =>
    patch((r) => ({ ...r, dias: r.dias.map((d) => (d.id === diaId ? fn(d) : d)) }));
  const nombreDe = (exerciseId: string) => ejercicios.find((e) => e.id === exerciseId)?.nombre ?? 'Ejercicio';

  function agregarDia() {
    patch((r) => ({
      ...r,
      dias: [...r.dias, { id: newId(), nombre: `Día ${r.dias.length + 1}`, orden: r.dias.length, ejercicios: [] }],
    }));
  }
  function quitarDia(diaId: string) {
    patch((r) => ({ ...r, dias: r.dias.filter((d) => d.id !== diaId).map((d, i) => ({ ...d, orden: i })) }));
  }
  function mover(diaId: string, reId: string, delta: -1 | 1) {
    patchDia(diaId, (d) => {
      const lista = d.ejercicios.slice().sort((a, b) => a.orden - b.orden);
      const i = lista.findIndex((x) => x.id === reId);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= lista.length) return d;
      const a = lista[i];
      const b = lista[j];
      if (!a || !b) return d;
      lista[i] = b;
      lista[j] = a;
      return { ...d, ejercicios: lista.map((x, k) => ({ ...x, orden: k })) };
    });
  }
  function entrenar(dia: RoutineDay) {
    const s = iniciarSesion(rutina!.id, dia.id);
    router.push(`/sesion/${s.id}`);
  }

  return (
    <Pantalla>
      <Cabecera
        titulo={rutina.estado === 'activa' ? 'Rutina activa' : rutina.estado === 'archivada' ? 'Rutina archivada' : 'Editar rutina'}
        subtitulo="Los cambios se guardan solos."
        atras
      />

      <Campo etiqueta="Nombre" value={rutina.nombre} onChangeText={(t) => patch((r) => ({ ...r, nombre: t }))} placeholder="Nombre de la rutina" />

      <View className="mt-4 gap-2">
        <Txt v="etiqueta">Método de progresión</Txt>
        <Chips
          opciones={METODOS.map((m) => ({ id: m.id, nombre: m.nombre }))}
          valor={rutina.metodo}
          onCambio={(m) => patch((r) => ({ ...r, metodo: m }))}
        />
        <Txt v="secundario">{METODOS.find((m) => m.id === rutina.metodo)?.descripcion}</Txt>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Txt v="etiqueta">Semanas del programa</Txt>
        <Stepper valor={rutina.semanas} onCambio={(v) => patch((r) => ({ ...r, semanas: v }))} min={1} max={52} />
      </View>

      <Separador titulo="Días" />
      {rutina.dias
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((dia) => {
          const lista = dia.ejercicios.slice().sort((a, b) => a.orden - b.orden);
          return (
            <Tarjeta key={dia.id} className="mb-3 gap-2">
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={dia.nombre}
                  onChangeText={(t) => patchDia(dia.id, (d) => ({ ...d, nombre: t }))}
                  placeholder="Nombre del día"
                  placeholderTextColor={colors.ink.faint}
                  className="flex-1 font-sans-bold text-lg text-ink"
                />
                {rutina.dias.length > 1 ? (
                  <Pressable onPress={() => quitarDia(dia.id)} className="rounded-full bg-danger-soft px-3 py-1.5 active:opacity-70">
                    <Text className="font-sans-semibold text-xs text-danger">Quitar día</Text>
                  </Pressable>
                ) : null}
              </View>

              {lista.length === 0 ? (
                <Txt v="secundario">Sin ejercicios todavía.</Txt>
              ) : (
                lista.map((re, i) => (
                  <Pressable
                    key={re.id}
                    onPress={() => router.push({ pathname: '/rutina/[id]/ejercicio/[reId]', params: { id: rutina.id, reId: re.id } })}
                    className={`flex-row items-center gap-2 py-2.5 active:opacity-70 ${i < lista.length - 1 ? 'border-b border-line' : ''}`}
                  >
                    <View className="flex-1">
                      <Txt v="cuerpoMedio">{nombreDe(re.exerciseId)}</Txt>
                      <Txt v="secundario">
                        {re.series} × {re.repsMin} a {re.repsMax} · RIR {re.rirObjetivo} · {re.descansoS} s
                      </Txt>
                    </View>
                    <BotonRedondo glifo="↑" etiqueta="subir" disabled={i === 0} onPress={() => mover(dia.id, re.id, -1)} />
                    <BotonRedondo glifo="↓" etiqueta="bajar" disabled={i === lista.length - 1} onPress={() => mover(dia.id, re.id, 1)} />
                  </Pressable>
                ))
              )}

              <View className="mt-1 flex-row gap-2">
                <Boton
                  titulo="Agregar ejercicio"
                  variante="secundario"
                  chico
                  className="flex-1"
                  onPress={() => router.push({ pathname: '/rutina/[id]/agregar', params: { id: rutina.id, dia: dia.id } })}
                />
                {lista.length > 0 && !enCurso ? (
                  <Boton titulo="Entrenar este día" variante="fantasma" chico onPress={() => entrenar(dia)} />
                ) : null}
              </View>
            </Tarjeta>
          );
        })}
      <Boton titulo="Agregar día" variante="fantasma" onPress={agregarDia} />

      <Separador titulo="Acciones" />
      {rutina.estado === 'activa' ? (
        <Boton titulo="Archivar rutina" variante="fantasma" onPress={() => archivarRutina(rutina.id)} />
      ) : (
        <Boton titulo="Activar rutina" onPress={() => activarRutina(rutina.id)} disabled={totalEjercicios === 0} />
      )}
      {totalEjercicios === 0 ? (
        <Txt v="pequeno" className="mt-2">Agrega al menos un ejercicio para poder activarla.</Txt>
      ) : null}
      <View className="mt-2 flex-row gap-2">
        <Boton
          titulo="Duplicar"
          variante="fantasma"
          chico
          className="flex-1"
          onPress={() => {
            const copia = duplicarRutina(rutina.id);
            if (copia) router.replace(`/rutina/${copia.id}`);
          }}
        />
        <Boton titulo="Eliminar" variante="peligro" chico className="flex-1" onPress={() => setConfirmar(true)} />
      </View>
      {confirmar ? (
        <View className="mt-3">
          <Confirmar
            pregunta="¿Eliminar esta rutina? Las sesiones ya registradas se conservan."
            si="Sí, eliminar"
            onSi={() => {
              eliminarRutina(rutina.id);
              if (router.canGoBack()) router.back();
              else router.replace('/rutinas');
            }}
            onNo={() => setConfirmar(false)}
          />
        </View>
      ) : null}
    </Pantalla>
  );
}
