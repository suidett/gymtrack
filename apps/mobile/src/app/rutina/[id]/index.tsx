// ─────────────────────────────────────────────────────────────────────────────
// Editor de rutina · Zona: Rutas
//
// Qué hace: la pantalla donde se arma una rutina: nombre, método de progresión, semanas, los días
// y el orden de los ejercicios de cada día. También la activa, archiva, duplica o elimina, y deja
// partir una sesión de gimnasio desde cualquiera de sus días.
// Tócalo cuando: cambie qué se puede editar de una rutina, qué acciones tiene (activar, archivar,
// duplicar, eliminar, entrenar) o cómo se ve la lista de días con sus ejercicios.
// No lo toques para: los ajustes de un ejercicio dentro del día (series, reps, RIR, descanso), que
// viven en ./ejercicio/[reId].tsx; el selector para sumar ejercicios, en ./agregar.tsx; y las reglas
// de activar o duplicar (qué se valida, qué se copia), en src/store/useStore.ts.
// Depende de: @gymtrack/shared (METODOS y los tipos Routine, RoutineDay), @/components/ui,
// @/lib/ids (newId) y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────
import { METODOS, type Routine, type RoutineDay } from '@gymtrack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { InteractionManager, Pressable, Text, View } from 'react-native';
import { Boton, BotonRedondo, Cabecera, CampoDiferido, Chips, Confirmar, EntradaDiferida, Pantalla, Separador, Stepper, Tarjeta, Txt, Vacio } from '@/components/ui';
import { newId } from '@/lib/ids';
import { useStore } from '@/store/useStore';

/**
 * Pantalla /rutina/[id]. Recibe el id de la rutina por la ruta y la edita en vivo: cada cambio va
 * directo a guardarRutina, no hay botón de guardar. Si la rutina no existe (la borraron mientras
 * estaba abierta) muestra un aviso y nada más.
 */
export default function EditorRutina() {
  // ── Estado y datos del store ─────────────────────────────────────────────────
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
  // confirmar: si está abierta la pregunta "¿Eliminar?" en línea. aviso: por qué no se pudo activar.
  const [confirmar, setConfirmar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // ── Guardia: la rutina ya no existe ──────────────────────────────────────────
  // Pasa si se eliminó desde otra pantalla o si la ruta trae un id viejo. Va después de todos los
  // hooks: React exige que se llamen siempre en el mismo orden, así que ningún hook puede ir abajo.
  if (!rutina) {
    return (
      <Pantalla>
        <Cabecera titulo="Rutina" atras />
        <Vacio titulo="Esta rutina ya no existe" />
      </Pantalla>
    );
  }

  // ── Derivados y helpers para editar ──────────────────────────────────────────
  // Con una sesión en curso no se ofrece "Entrenar": iniciarSesion devolvería esa misma sesión.
  const enCurso = sesiones.some((s) => s.estado === 'en_curso');
  const totalEjercicios = rutina.dias.reduce((a, d) => a + d.ejercicios.length, 0);
  // Todo cambio pasa por patch: se arma la rutina nueva completa y se le entrega al store. Nunca se
  // muta la rutina que vino del store (ver "Cómo fluyen los datos" en la guía del equipo).
  const patch = (fn: (r: Routine) => Routine) => guardarRutina(fn(rutina));
  const patchDia = (diaId: string, fn: (d: RoutineDay) => RoutineDay) =>
    patch((r) => ({ ...r, dias: r.dias.map((d) => (d.id === diaId ? fn(d) : d)) }));
  // Si el ejercicio se borró de la biblioteca la fila igual se dibuja; activarRutina lo va a rechazar.
  const nombreDe = (exerciseId: string) => ejercicios.find((e) => e.id === exerciseId)?.nombre ?? 'Ejercicio';

  // ── Acciones sobre días y ejercicios ─────────────────────────────────────────
  // El nombre por defecto es "Día N" y el orden se toma de la posición: el último.
  function agregarDia() {
    patch((r) => ({
      ...r,
      dias: [...r.dias, { id: newId(), nombre: `Día ${r.dias.length + 1}`, orden: r.dias.length, ejercicios: [] }],
    }));
  }
  // Los días que quedan se renumeran para que `orden` siga siendo 0, 1, 2... sin huecos.
  function quitarDia(diaId: string) {
    patch((r) => ({ ...r, dias: r.dias.filter((d) => d.id !== diaId).map((d, i) => ({ ...d, orden: i })) }));
  }
  // Sube (delta -1) o baja (delta 1) un ejercicio un lugar dentro del día: lo intercambia con el
  // vecino y renumera `orden`. Si ya está en el borde, devuelve el día tal cual.
  function mover(diaId: string, reId: string, delta: -1 | 1) {
    patchDia(diaId, (d) => {
      // Se ordena por `orden` antes de buscar: el arreglo guardado no tiene por qué venir ordenado.
      const lista = d.ejercicios.slice().sort((a, b) => a.orden - b.orden);
      const i = lista.findIndex((x) => x.id === reId);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= lista.length) return d;
      // Los índices ya se comprobaron arriba; este if solo conforma al chequeo estricto de TypeScript.
      const a = lista[i];
      const b = lista[j];
      if (!a || !b) return d;
      lista[i] = b;
      lista[j] = a;
      return { ...d, ejercicios: lista.map((x, k) => ({ ...x, orden: k })) };
    });
  }
  // Crea la sesión con las series propuestas y abre la bitácora. El `!` es seguro: la guardia de arriba
  // ya descartó rutina undefined, pero TypeScript no lo arrastra dentro de una función anidada.
  function entrenar(dia: RoutineDay) {
    const s = iniciarSesion(rutina!.id, dia.id);
    router.push(`/sesion/${s.id}`);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Pantalla>
      {/* El título dice en qué estado está la rutina; el subtítulo recuerda que no hay botón de guardar. */}
      <Cabecera
        titulo={rutina.estado === 'activa' ? 'Rutina activa' : rutina.estado === 'archivada' ? 'Rutina archivada' : 'Editar rutina'}
        subtitulo="Los cambios se guardan solos."
        atras
      />

      {/* Nombre, método y semanas. Si el nombre queda vacío se conserva el anterior. */}
      <CampoDiferido
        etiqueta="Nombre"
        valor={rutina.nombre}
        onConfirmar={(t) => patch((r) => ({ ...r, nombre: t.trim() || r.nombre }))}
        placeholder="Nombre de la rutina"
      />

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
      {/* Cada día es una tarjeta: nombre editable, sus ejercicios en orden con flechas para moverlos,
          y abajo los botones de agregar y entrenar. */}
      {rutina.dias
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((dia) => {
          const lista = dia.ejercicios.slice().sort((a, b) => a.orden - b.orden);
          return (
            <Tarjeta key={dia.id} className="mb-3 gap-2">
              <View className="flex-row items-center gap-2">
                <EntradaDiferida
                  valor={dia.nombre}
                  onConfirmar={(t) => patchDia(dia.id, (d) => ({ ...d, nombre: t.trim() || d.nombre }))}
                  placeholder="Nombre del día"
                  className="flex-1 font-sans-bold text-lg text-ink"
                />
                {/* Una rutina siempre conserva al menos un día: en el último no se ofrece quitarlo.
                    Quitar un día no pide confirmación; sus ejercicios se pierden de la rutina. */}
                {rutina.dias.length > 1 ? (
                  <Pressable onPress={() => quitarDia(dia.id)} className="rounded-full bg-danger-soft px-3 py-1.5 active:opacity-70">
                    <Text className="font-sans-semibold text-xs text-danger">Quitar día</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Tocar la fila abre los ajustes del ejercicio; las flechas lo mueven dentro del día. */}
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
                {/* Sin ejercicios no hay qué entrenar; con una sesión en curso tampoco (iría a esa misma). */}
                {lista.length > 0 && !enCurso ? (
                  <Boton titulo="Entrenar este día" variante="fantasma" chico onPress={() => entrenar(dia)} />
                ) : null}
              </View>
            </Tarjeta>
          );
        })}
      <Boton titulo="Agregar día" variante="fantasma" onPress={agregarDia} />

      <Separador titulo="Acciones" />
      {/* Activar deja esta rutina como la única activa (la anterior se archiva sola, ver el store).
          Si el store la rechaza (por ejemplo, tiene ejercicios borrados de la biblioteca), el motivo
          se muestra abajo en rojo. Una rutina sin ejercicios no se puede activar. */}
      {rutina.estado === 'activa' ? (
        <Boton titulo="Archivar rutina" variante="fantasma" onPress={() => archivarRutina(rutina.id)} />
      ) : (
        <Boton
          titulo="Activar rutina"
          onPress={() => {
            const r = activarRutina(rutina.id);
            setAviso(r.ok ? null : (r.motivo ?? 'No se pudo activar.'));
          }}
          disabled={totalEjercicios === 0}
        />
      )}
      {aviso ? <Text className="mt-2 font-sans text-sm text-danger">{aviso}</Text> : null}
      {totalEjercicios === 0 ? (
        <Txt v="pequeno" className="mt-2">Agrega al menos un ejercicio para poder activarla.</Txt>
      ) : null}
      {/* Duplicar crea una copia en borrador con ids nuevos y abre esa copia en lugar de esta pantalla
          (replace, no push: al volver atrás no se pasa por la original). */}
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
      {/* Confirmación en línea, no Alert.alert: en web no funciona con botones. */}
      {confirmar ? (
        <View className="mt-3">
          <Confirmar
            pregunta="¿Eliminar esta rutina? Las sesiones ya registradas se conservan."
            si="Sí, eliminar"
            onSi={() => {
              // Primero la vuelta y recién después el borrado, para no ver "ya no existe" durante la animación.
              const id = rutina.id;
              if (router.canGoBack()) router.back();
              else router.dismissTo('/rutinas');
              InteractionManager.runAfterInteractions(() => {
                eliminarRutina(id);
              });
            }}
            onNo={() => setConfirmar(false)}
          />
        </View>
      ) : null}
    </Pantalla>
  );
}
