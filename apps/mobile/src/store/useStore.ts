import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EJERCICIOS_BASE,
  calcularCierre,
  rutinaEjemplo,
  sugerenciaVigente,
  ultimaVez,
  type Exercise,
  type Routine,
  type SessionExercise,
  type WorkoutSession,
  type WorkoutSet,
} from '@gymtrack/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newId } from '@/lib/ids';
import { ahoraIso } from '@/lib/tiempo';

export interface Perfil {
  nombre: string;
  pesoCorporalKg: number | null;
  descansoDefaultS: number;
}

export type DatosEjercicio = Pick<
  Exercise,
  'nombre' | 'grupo' | 'equipo' | 'patron' | 'tipoCarga' | 'incrementoKg' | 'instrucciones'
>;

export interface Estado {
  perfil: Perfil;
  ejercicios: Exercise[];
  rutinas: Routine[];
  sesiones: WorkoutSession[];
  sembrado: boolean;
  hidratado: boolean;

  sembrar: () => void;
  restablecerDatos: () => void;
  actualizarPerfil: (p: Partial<Perfil>) => void;

  agregarEjercicio: (d: DatosEjercicio) => Exercise;
  editarEjercicio: (id: string, d: Partial<DatosEjercicio>) => void;
  eliminarEjercicio: (id: string) => { ok: boolean; motivo?: string };

  crearRutina: (nombre: string) => Routine;
  guardarRutina: (r: Routine) => void;
  activarRutina: (id: string) => void;
  archivarRutina: (id: string) => void;
  duplicarRutina: (id: string) => Routine | null;
  eliminarRutina: (id: string) => void;

  iniciarSesion: (routineId: string, dayId: string) => WorkoutSession;
  actualizarSet: (sessionId: string, exId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  marcarSet: (sessionId: string, exId: string, setId: string, fallo?: boolean) => void;
  desmarcarSet: (sessionId: string, exId: string, setId: string) => void;
  agregarSet: (sessionId: string, exId: string) => void;
  quitarSet: (sessionId: string, exId: string, setId: string) => void;
  setObservacionEjercicio: (sessionId: string, exId: string, texto: string) => void;
  setObservacionSesion: (sessionId: string, texto: string) => void;
  cerrarSesion: (sessionId: string) => WorkoutSession | null;
  descartarSesion: (sessionId: string) => void;
}

const PERFIL_INICIAL: Perfil = { nombre: '', pesoCorporalKg: null, descansoDefaultS: 90 };

export const useStore = create<Estado>()(
  persist(
    (set, get) => {
      const actualizarSesion = (id: string, fn: (s: WorkoutSession) => WorkoutSession) =>
        set({ sesiones: get().sesiones.map((s) => (s.id === id ? fn(s) : s)) });
      const actualizarEjercicio = (sid: string, eid: string, fn: (e: SessionExercise) => SessionExercise) =>
        actualizarSesion(sid, (s) => ({ ...s, ejercicios: s.ejercicios.map((e) => (e.id === eid ? fn(e) : e)) }));
      const actualizarSetEn = (sid: string, eid: string, setId: string, fn: (x: WorkoutSet) => WorkoutSet) =>
        actualizarEjercicio(sid, eid, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? fn(x) : x)) }));

      return {
        perfil: PERFIL_INICIAL,
        ejercicios: [],
        rutinas: [],
        sesiones: [],
        sembrado: false,
        hidratado: false,

        sembrar() {
          set({
            ejercicios: [...EJERCICIOS_BASE],
            rutinas: [rutinaEjemplo(newId, ahoraIso())],
            sesiones: [],
            sembrado: true,
          });
        },
        restablecerDatos() {
          get().sembrar();
        },
        actualizarPerfil(p) {
          set({ perfil: { ...get().perfil, ...p } });
        },

        agregarEjercicio(d) {
          const ex: Exercise = { id: newId(), ...d, propio: true, creadoAt: ahoraIso() };
          set({ ejercicios: [...get().ejercicios, ex] });
          return ex;
        },
        editarEjercicio(id, d) {
          set({ ejercicios: get().ejercicios.map((e) => (e.id === id ? { ...e, ...d } : e)) });
        },
        eliminarEjercicio(id) {
          const usado = get().rutinas.some(
            (r) => r.estado !== 'archivada' && r.dias.some((d) => d.ejercicios.some((re) => re.exerciseId === id)),
          );
          if (usado) return { ok: false, motivo: 'Está en una rutina. Quítalo de la rutina primero.' };
          set({ ejercicios: get().ejercicios.filter((e) => e.id !== id) });
          return { ok: true };
        },

        crearRutina(nombre) {
          const ahora = ahoraIso();
          const r: Routine = {
            id: newId(),
            nombre,
            metodo: 'doble_progresion',
            semanas: 8,
            estado: 'borrador',
            dias: [{ id: newId(), nombre: 'Día 1', orden: 0, ejercicios: [] }],
            creadoAt: ahora,
            actualizadoAt: ahora,
          };
          set({ rutinas: [...get().rutinas, r] });
          return r;
        },
        guardarRutina(r) {
          set({ rutinas: get().rutinas.map((x) => (x.id === r.id ? { ...r, actualizadoAt: ahoraIso() } : x)) });
        },
        activarRutina(id) {
          const ahora = ahoraIso();
          set({
            rutinas: get().rutinas.map((r) => {
              if (r.id === id) return { ...r, estado: 'activa', actualizadoAt: ahora };
              if (r.estado === 'activa') return { ...r, estado: 'archivada', actualizadoAt: ahora };
              return r;
            }),
          });
        },
        archivarRutina(id) {
          set({
            rutinas: get().rutinas.map((r) => (r.id === id ? { ...r, estado: 'archivada', actualizadoAt: ahoraIso() } : r)),
          });
        },
        duplicarRutina(id) {
          const orig = get().rutinas.find((r) => r.id === id);
          if (!orig) return null;
          const ahora = ahoraIso();
          const copia: Routine = {
            ...orig,
            id: newId(),
            nombre: `${orig.nombre} (copia)`,
            estado: 'borrador',
            creadoAt: ahora,
            actualizadoAt: ahora,
            dias: orig.dias.map((d) => ({
              ...d,
              id: newId(),
              ejercicios: d.ejercicios.map((re) => ({ ...re, id: newId() })),
            })),
          };
          set({ rutinas: [...get().rutinas, copia] });
          return copia;
        },
        eliminarRutina(id) {
          set({ rutinas: get().rutinas.filter((r) => r.id !== id) });
        },

        iniciarSesion(routineId, dayId) {
          const { rutinas, sesiones, ejercicios } = get();
          const enCurso = sesiones.find((s) => s.estado === 'en_curso');
          if (enCurso) return enCurso;
          const rutina = rutinas.find((r) => r.id === routineId);
          const dia = rutina?.dias.find((d) => d.id === dayId);
          if (!rutina || !dia) throw new Error('Rutina o día no encontrado');

          const ejerciciosSesion: SessionExercise[] = dia.ejercicios
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((re, i) => {
              const ex = ejercicios.find((x) => x.id === re.exerciseId);
              const sug = sugerenciaVigente(re.id, sesiones);
              const ultima = ultimaVez(re.exerciseId, sesiones);
              const peso = sug?.pesoKg ?? ultima?.pesoMax ?? re.pesoInicialKg ?? 0;
              const reps = sug?.repsMin ?? re.repsMin;
              return {
                id: newId(),
                exerciseId: re.exerciseId,
                routineExerciseId: re.id,
                orden: i,
                nombre: ex?.nombre ?? 'Ejercicio',
                tipoCarga: ex?.tipoCarga ?? 'kg',
                descansoS: re.descansoS,
                objetivo: {
                  series: re.series,
                  repsMin: re.repsMin,
                  repsMax: re.repsMax,
                  rirObjetivo: re.rirObjetivo,
                  incrementoKg: re.incrementoKg,
                },
                sets: Array.from({ length: re.series }, (_, n) => ({
                  id: newId(),
                  serieN: n + 1,
                  pesoKg: peso,
                  reps,
                  rir: null,
                  completada: false,
                  fallo: false,
                })),
                observacion: '',
              };
            });

          const sesion: WorkoutSession = {
            id: newId(),
            routineId: rutina.id,
            routineDayId: dia.id,
            nombreDia: dia.nombre,
            iniciadaAt: ahoraIso(),
            cerradaAt: null,
            estado: 'en_curso',
            ejercicios: ejerciciosSesion,
            duracionS: null,
            volumenKg: null,
            kcalEstimadas: null,
            observacion: '',
            sugerencias: [],
            prs: [],
          };
          set({ sesiones: [...sesiones, sesion] });
          return sesion;
        },
        actualizarSet(sid, eid, setId, patch) {
          actualizarSetEn(sid, eid, setId, (x) => ({ ...x, ...patch }));
        },
        marcarSet(sid, eid, setId, fallo = false) {
          actualizarEjercicio(sid, eid, (e) => {
            const idx = e.sets.findIndex((x) => x.id === setId);
            const hecha = e.sets[idx];
            if (!hecha) return e;
            return {
              ...e,
              sets: e.sets.map((x, i) => {
                if (i === idx) return { ...x, completada: true, fallo };
                // Las series pendientes que vienen después heredan kilos y repeticiones de la recién hecha.
                if (i > idx && !x.completada) return { ...x, pesoKg: hecha.pesoKg, reps: hecha.reps };
                return x;
              }),
            };
          });
        },
        desmarcarSet(sid, eid, setId) {
          actualizarSetEn(sid, eid, setId, (x) => ({ ...x, completada: false, fallo: false }));
        },
        agregarSet(sid, eid) {
          actualizarEjercicio(sid, eid, (e) => {
            const ultimo = e.sets[e.sets.length - 1];
            return {
              ...e,
              sets: [
                ...e.sets,
                {
                  id: newId(),
                  serieN: e.sets.length + 1,
                  pesoKg: ultimo?.pesoKg ?? 0,
                  reps: ultimo?.reps ?? e.objetivo.repsMin,
                  rir: null,
                  completada: false,
                  fallo: false,
                },
              ],
            };
          });
        },
        quitarSet(sid, eid, setId) {
          actualizarEjercicio(sid, eid, (e) => ({
            ...e,
            sets: e.sets.filter((x) => x.id !== setId).map((x, i) => ({ ...x, serieN: i + 1 })),
          }));
        },
        setObservacionEjercicio(sid, eid, texto) {
          actualizarEjercicio(sid, eid, (e) => ({ ...e, observacion: texto }));
        },
        setObservacionSesion(sid, texto) {
          actualizarSesion(sid, (s) => ({ ...s, observacion: texto }));
        },
        cerrarSesion(sid) {
          const { sesiones, rutinas, ejercicios, perfil } = get();
          const sesion = sesiones.find((s) => s.id === sid);
          if (!sesion || sesion.estado !== 'en_curso') return null;
          const rutina = rutinas.find((r) => r.id === sesion.routineId);
          const cerrada = calcularCierre({
            sesion,
            previas: sesiones,
            ejercicios,
            metodo: rutina?.metodo ?? 'doble_progresion',
            ahoraIso: ahoraIso(),
            pesoCorporalKg: perfil.pesoCorporalKg,
          });
          set({ sesiones: sesiones.map((s) => (s.id === sid ? cerrada : s)) });
          return cerrada;
        },
        descartarSesion(sid) {
          set({ sesiones: get().sesiones.filter((s) => s.id !== sid) });
        },
      };
    },
    {
      name: 'gymtrack-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        perfil: s.perfil,
        ejercicios: s.ejercicios,
        rutinas: s.rutinas,
        sesiones: s.sesiones,
        sembrado: s.sembrado,
      }),
      onRehydrateStorage: () => () => {
        // Corre cuando termina de leer el almacenamiento (haya datos o no).
        const st = useStore.getState();
        if (!st.sembrado) st.sembrar();
        useStore.setState({ hidratado: true });
      },
    },
  ),
);
