// ─────────────────────────────────────────────────────────────────────────────
// Store principal · Zona: Store
//
// Qué hace: guarda en memoria todo lo que el alumno tiene en el celular (perfil, biblioteca de
// ejercicios, rutinas y sesiones) y expone las acciones para cambiarlo: crear una rutina, iniciar
// una sesión, marcar una serie, cerrar la sesión. Cada cambio se guarda solo en AsyncStorage.
// Tócalo cuando: agregues una acción nueva (crear, editar, borrar), cambies qué se persiste o cómo se
// arma una sesión a partir de un día de rutina.
// No lo toques para: cambiar cómo se calculan récords, volumen o la sugerencia al cerrar (eso vive en
// packages/shared/src/cierre.ts y progression.ts), ni para cálculos derivados como racha o semana
// (src/store/selectors.ts), ni para agregar campos a un dato guardado (packages/shared/src/types.ts).
// Depende de: @gymtrack/shared (types, exercises.seed, rutina-ejemplo, historial, cierre),
// src/lib/ids (newId), src/lib/tiempo (ahoraIso).
// ─────────────────────────────────────────────────────────────────────────────
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

// ── Tipos ────────────────────────────────────────────────────────────────────
/**
 * Datos del alumno que se editan en la pestaña Perfil. El peso corporal solo sirve para estimar
 * calorías al cerrar una sesión; el descanso por defecto es el que se propone al agregar un
 * ejercicio a una rutina.
 */
export interface Perfil {
  nombre: string;
  /** null hasta que el alumno lo escriba; sin él, kcalEstimadas de la sesión queda en null. */
  pesoCorporalKg: number | null;
  /** Segundos de descanso que se copian a cada ejercicio nuevo de una rutina (rutina/[id]/agregar.tsx). */
  descansoDefaultS: number;
}

/**
 * Lo que se llena en el formulario de un ejercicio (components/FormularioEjercicio.tsx): todo lo de
 * Exercise menos id, propio y creadoAt, que los pone el store al crearlo.
 */
export type DatosEjercicio = Pick<
  Exercise,
  'nombre' | 'grupo' | 'equipo' | 'patron' | 'tipoCarga' | 'incrementoKg' | 'instrucciones'
>;

/**
 * Todo lo que vive en el store: los datos guardados, las banderas de arranque y las acciones.
 * Las pantallas leen con `useStore((s) => s.algo)` y cambian datos solo a través de las acciones;
 * nunca se muta un objeto a mano.
 */
export interface Estado {
  perfil: Perfil;
  /** Biblioteca completa: los de base (propio: false) más los que creó el alumno (propio: true). */
  ejercicios: Exercise[];
  /** Todas las rutinas en cualquier estado (borrador, activa, archivada). Solo una puede estar activa. */
  rutinas: Routine[];
  /** Todas las sesiones, en curso y cerradas. Como mucho hay una en curso a la vez. */
  sesiones: WorkoutSession[];
  /** true después de cargar la biblioteca base y la rutina de ejemplo por primera vez. Se persiste. */
  sembrado: boolean;
  /** true cuando ya se terminó de leer AsyncStorage. El layout raíz no muestra la app hasta entonces. */
  hidratado: boolean;
  /** true si no se pudieron leer los datos guardados: no se escribe nada hasta reiniciar. */
  errorCarga: boolean;

  /** Carga la biblioteca base y la rutina de ejemplo. Pisa ejercicios, rutinas y sesiones; el perfil queda. */
  sembrar: () => void;
  /** Botón "Restablecer datos de ejemplo" de Perfil: vuelve al estado recién instalado (llama a sembrar). */
  restablecerDatos: () => void;
  /** Cambia solo los campos que vengan en `p`; el resto del perfil se conserva. */
  actualizarPerfil: (p: Partial<Perfil>) => void;

  /** Crea un ejercicio propio con id nuevo y devuelve el ejercicio ya guardado. */
  agregarEjercicio: (d: DatosEjercicio) => Exercise;
  /** Edita campos sueltos. Si el ejercicio ya tiene sesiones cerradas, el tipo de carga se ignora. */
  editarEjercicio: (id: string, d: Partial<DatosEjercicio>) => void;
  /** Borra el ejercicio si ninguna rutina lo usa. Si no se puede, `motivo` trae el texto para el alumno. */
  eliminarEjercicio: (id: string) => { ok: boolean; motivo?: string };

  /** Crea una rutina en borrador con un "Día 1" vacío y la devuelve para abrir el editor. */
  crearRutina: (nombre: string) => Routine;
  /** Reemplaza la rutina completa por `r` (mismo id) y actualiza la fecha. Si el id no existe, no hace nada. */
  guardarRutina: (r: Routine) => void;
  /** Deja esta rutina como la activa y archiva la que estaba. Falla si le faltan ejercicios en la biblioteca. */
  activarRutina: (id: string) => { ok: boolean; motivo?: string };
  /** Pasa la rutina a archivada. No borra nada: las sesiones hechas con ella siguen en el historial. */
  archivarRutina: (id: string) => void;
  /** Copia la rutina como borrador "(copia)" con ids nuevos. Devuelve null si el id no existe. */
  duplicarRutina: (id: string) => Routine | null;
  /** Borra la rutina. Las sesiones que la usaron quedan, con routineId apuntando a algo que ya no existe. */
  eliminarRutina: (id: string) => void;

  /**
   * Arma una sesión a partir de un día de rutina y la deja en curso. Si ya hay una en curso devuelve
   * esa, aunque sea de otro día. Lanza error si la rutina o el día no existen (es un bug de la pantalla).
   */
  iniciarSesion: (routineId: string, dayId: string) => WorkoutSession;
  /** Cambia campos sueltos de una serie (kilos, reps, RIR) mientras la sesión está en curso. */
  actualizarSet: (sessionId: string, exId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  /** Marca la serie como hecha (con o sin fallo) y copia sus kilos y reps a las series pendientes de abajo. */
  marcarSet: (sessionId: string, exId: string, setId: string, fallo?: boolean) => void;
  /** Vuelve la serie a pendiente y le quita el fallo. Lo que heredaron las series de abajo no se deshace. */
  desmarcarSet: (sessionId: string, exId: string, setId: string) => void;
  /** Agrega una serie al final del ejercicio, copiando kilos y reps de la última. */
  agregarSet: (sessionId: string, exId: string) => void;
  /** Quita una serie y renumera las que quedan para que serieN siga siendo 1, 2, 3... */
  quitarSet: (sessionId: string, exId: string, setId: string) => void;
  /** Nota libre del alumno sobre un ejercicio de la sesión ("me molestó el hombro"). */
  setObservacionEjercicio: (sessionId: string, exId: string, texto: string) => void;
  /** Nota libre de toda la sesión; se escribe en el resumen al cerrar. */
  setObservacionSesion: (sessionId: string, texto: string) => void;
  /** Cierra la sesión en curso: calcula duración, volumen, récords y sugerencias. null si no estaba en curso. */
  cerrarSesion: (sessionId: string) => WorkoutSession | null;
  /** Borra la sesión del todo (no queda con estado "descartada"). Para una sesión iniciada por error. */
  descartarSesion: (sessionId: string) => void;
}

// ── Valores iniciales ────────────────────────────────────────────────────────
/** Perfil de un alumno recién instalado: sin nombre, sin peso y 90 s de descanso entre series. */
const PERFIL_INICIAL: Perfil = { nombre: '', pesoCorporalKg: null, descansoDefaultS: 90 };

/** Se prende si falló la lectura del almacenamiento: desde ahí ninguna escritura llega al disco. */
let escrituraBloqueada = false;

// ── El store ─────────────────────────────────────────────────────────────────
/**
 * Hook del store, envuelto en `persist` para que cada cambio se guarde solo en AsyncStorage.
 * En una pantalla úsalo con un selector, así se redibuja solo cuando cambia ese dato:
 * `const rutinas = useStore((s) => s.rutinas)`. Fuera de React: `useStore.getState()`.
 */
export const useStore = create<Estado>()(
  persist(
    (set, get) => {
      // ── Helpers para editar dentro de una sesión ─────────────────────────────────
      // Una sesión es un árbol: sesión > ejercicios > sets. Estos tres reemplazan un nodo por su copia
      // modificada sin mutar nada; Zustand compara por referencia, así que mutar a mano no redibujaría.
      const actualizarSesion = (id: string, fn: (s: WorkoutSession) => WorkoutSession) =>
        set({ sesiones: get().sesiones.map((s) => (s.id === id ? fn(s) : s)) });
      const actualizarEjercicio = (sid: string, eid: string, fn: (e: SessionExercise) => SessionExercise) =>
        actualizarSesion(sid, (s) => ({ ...s, ejercicios: s.ejercicios.map((e) => (e.id === eid ? fn(e) : e)) }));
      const actualizarSetEn = (sid: string, eid: string, setId: string, fn: (x: WorkoutSet) => WorkoutSet) =>
        actualizarEjercicio(sid, eid, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? fn(x) : x)) }));

      return {
        // ── Estado inicial ───────────────────────────────────────────────────────────
        // Lo que hay antes de leer AsyncStorage. Las listas se llenan al hidratar o, la primera vez, al sembrar.
        perfil: PERFIL_INICIAL,
        ejercicios: [],
        rutinas: [],
        sesiones: [],
        sembrado: false,
        hidratado: false,
        errorCarga: false,

        // ── Semilla y perfil ─────────────────────────────────────────────────────────
        sembrar() {
          // Corre una sola vez por instalación (desde onRehydrateStorage) o cuando el alumno restablece.
          set({
            // Copia porque EJERCICIOS_BASE es readonly y el estado espera una lista normal.
            ejercicios: [...EJERCICIOS_BASE],
            // La rutina de ejemplo nace activa: así la pestaña Hoy tiene algo que mostrar desde el primer minuto.
            rutinas: [rutinaEjemplo(newId, ahoraIso())],
            sesiones: [],
            sembrado: true,
          });
        },
        restablecerDatos() {
          // Pisa rutinas y sesiones, pero el perfil se conserva: el alumno no vuelve a escribir su peso.
          get().sembrar();
        },
        actualizarPerfil(p) {
          set({ perfil: { ...get().perfil, ...p } });
        },

        // ── Biblioteca de ejercicios ─────────────────────────────────────────────────
        agregarEjercicio(d) {
          // propio: true lo distingue de los de base; la pantalla del ejercicio solo deja editar los propios.
          const ex: Exercise = { id: newId(), ...d, propio: true, creadoAt: ahoraIso() };
          set({ ejercicios: [...get().ejercicios, ex] });
          return ex;
        },
        editarEjercicio(id, d) {
          // El tipo de carga define cómo se miden las sesiones ya registradas: con historial no se cambia.
          // Solo cuentan las cerradas: una sesión en curso lleva su propia copia de tipoCarga y no se rompe.
          const conHistorial = get().sesiones.some(
            (s) => s.estado === 'cerrada' && s.ejercicios.some((e) => e.exerciseId === id),
          );
          const cambios = conHistorial ? { ...d, tipoCarga: undefined } : d;
          set({
            ejercicios: get().ejercicios.map((e) => {
              if (e.id !== id) return e;
              // tipoCarga se separa del resto para no pisar el valor guardado con undefined.
              const { tipoCarga, ...resto } = cambios;
              return { ...e, ...resto, ...(tipoCarga ? { tipoCarga } : {}) };
            }),
          });
        },
        eliminarEjercicio(id) {
          // Se revisan todas las rutinas, no solo la activa: una archivada se puede reactivar y quedaría coja.
          // Las sesiones cerradas no bloquean: cada una guarda su copia del nombre y del tipo de carga.
          const usado = get().rutinas.some((r) => r.dias.some((d) => d.ejercicios.some((re) => re.exerciseId === id)));
          if (usado) return { ok: false, motivo: 'Está en una rutina (activa o archivada). Quítalo de la rutina primero.' };
          set({ ejercicios: get().ejercicios.filter((e) => e.id !== id) });
          return { ok: true };
        },

        // ── Rutinas ──────────────────────────────────────────────────────────────────
        crearRutina(nombre) {
          // Nace en borrador, con doble progresión, 8 semanas y un "Día 1" vacío para que el editor no parta
          // en blanco. Todo eso se cambia después desde rutina/[id].
          const ahora = ahoraIso();
          const r: Routine = {
            id: newId(),
            nombre,
            metodo: 'doble_progresion',
            semanas: 8,
            estado: 'borrador',
            dias: [{ id: newId(), nombre: 'Día 1', orden: 0, ejercicios: [] }],
            creadoAt: ahora,
            activadaAt: null,
            actualizadoAt: ahora,
          };
          set({ rutinas: [...get().rutinas, r] });
          return r;
        },
        guardarRutina(r) {
          // El editor arma la rutina completa y la manda entera; por eso se reemplaza, no se mezcla campo a campo.
          // Si el id no está en la lista no pasa nada: esta acción no crea rutinas.
          set({ rutinas: get().rutinas.map((x) => (x.id === r.id ? { ...r, actualizadoAt: ahoraIso() } : x)) });
        },
        activarRutina(id) {
          const { rutinas, ejercicios } = get();
          const rutina = rutinas.find((r) => r.id === id);
          if (!rutina) return { ok: false, motivo: 'La rutina ya no existe.' };
          // Defensa por si un ejercicio se fue de la biblioteca (datos viejos): sin él, la sesión no tendría
          // ni nombre ni tipo de carga. eliminarEjercicio ya lo impide, pero acá se vuelve a revisar.
          const ids = new Set(ejercicios.map((e) => e.id));
          const faltan = rutina.dias.flatMap((d) => d.ejercicios).filter((re) => !ids.has(re.exerciseId));
          if (faltan.length > 0) {
            return { ok: false, motivo: 'La rutina tiene ejercicios que ya no existen en tu biblioteca. Quítalos antes de activarla.' };
          }
          const ahora = ahoraIso();
          // Solo una activa a la vez: la que estaba pasa a archivada en el mismo set, así nunca conviven dos.
          // activadaAt se conserva si ya se había activado antes: desde ahí se cuenta la semana de la rutina.
          set({
            rutinas: rutinas.map((r) => {
              if (r.id === id) return { ...r, estado: 'activa', activadaAt: r.activadaAt ?? ahora, actualizadoAt: ahora };
              if (r.estado === 'activa') return { ...r, estado: 'archivada', actualizadoAt: ahora };
              return r;
            }),
          });
          return { ok: true };
        },
        archivarRutina(id) {
          // No borra nada: el historial queda y la rutina se puede volver a activar más adelante.
          set({
            rutinas: get().rutinas.map((r) => (r.id === id ? { ...r, estado: 'archivada', actualizadoAt: ahoraIso() } : r)),
          });
        },
        duplicarRutina(id) {
          const orig = get().rutinas.find((r) => r.id === id);
          if (!orig) return null;
          const ahora = ahoraIso();
          // Ids nuevos hasta en cada ejercicio de cada día: la sugerencia de progresión se busca por
          // routineExerciseId, así que la copia parte sin sugerencias heredadas (el último peso sí se
          // hereda, porque ese se busca por exerciseId).
          const copia: Routine = {
            ...orig,
            id: newId(),
            nombre: `${orig.nombre} (copia)`,
            estado: 'borrador',
            creadoAt: ahora,
            activadaAt: null,
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
          // Las sesiones no se tocan: el historial y los récords quedan aunque la rutina desaparezca.
          set({ rutinas: get().rutinas.filter((r) => r.id !== id) });
        },

        // ── Sesiones ─────────────────────────────────────────────────────────────────
        iniciarSesion(routineId, dayId) {
          const { rutinas, sesiones, ejercicios } = get();
          // Si ya hay una en curso se devuelve esa, aunque sea de otro día: la pantalla decide si retomarla.
          const enCurso = sesiones.find((s) => s.estado === 'en_curso');
          if (enCurso) return enCurso;
          const rutina = rutinas.find((r) => r.id === routineId);
          const dia = rutina?.dias.find((d) => d.id === dayId);
          // Distinto al resto de las acciones: acá se lanza error en vez de devolver null, porque llegar
          // con ids malos es un bug de la pantalla, no un caso que el alumno pueda provocar.
          if (!rutina || !dia) throw new Error('Rutina o día no encontrado');

          // Cada ejercicio del día se copia a la sesión con todo lo que necesita, para que la sesión no
          // dependa de la rutina después (si la editan o la borran, la sesión no cambia). El slice es
          // porque sort ordena en el lugar y la rutina guardada no se toca.
          const ejerciciosSesion: SessionExercise[] = dia.ejercicios
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((re, i) => {
              const ex = ejercicios.find((x) => x.id === re.exerciseId);
              // De dónde salen los kilos y reps con que arranca cada serie, por prioridad:
              // 1) la sugerencia que dejó la última sesión cerrada de este mismo ejercicio de la rutina,
              // 2) el peso máximo de la última vez que se hizo el ejercicio (en cualquier rutina),
              // 3) el peso inicial escrito en la rutina, 4) 0, para que el alumno lo escriba.
              const sug = sugerenciaVigente(re.id, sesiones);
              const ultima = ultimaVez(re.exerciseId, sesiones);
              const peso = sug?.pesoKg ?? ultima?.pesoMax ?? re.pesoInicialKg ?? 0;
              const reps = sug?.repsMin ?? re.repsMin;
              return {
                id: newId(),
                exerciseId: re.exerciseId,
                routineExerciseId: re.id,
                orden: i,
                // Nombre y tipo de carga se copian: si después editan el ejercicio, esta sesión no cambia.
                nombre: ex?.nombre ?? 'Ejercicio',
                tipoCarga: ex?.tipoCarga ?? 'kg',
                descansoS: re.descansoS,
                // El objetivo también se congela: con esto se calcula la sugerencia al cerrar.
                objetivo: {
                  series: re.series,
                  repsMin: re.repsMin,
                  repsMax: re.repsMax,
                  rirObjetivo: re.rirObjetivo,
                  incrementoKg: re.incrementoKg,
                },
                // Tantas series como pide la rutina, todas pendientes y con el mismo peso y reps de partida.
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

          // duracionS, volumenKg, kcalEstimadas, sugerencias y prs quedan vacíos: los llena cerrarSesion.
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
            // Se busca por índice y no por id porque hay que saber cuáles series vienen después.
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
          // No se deshace lo que heredaron las series de abajo: pueden tener valores ya escritos a mano.
          actualizarSetEn(sid, eid, setId, (x) => ({ ...x, completada: false, fallo: false }));
        },
        agregarSet(sid, eid) {
          actualizarEjercicio(sid, eid, (e) => {
            // La serie nueva copia la última, que es lo que más se repite; sin series, parte del mínimo.
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
          // Se renumera para que la tabla de la bitácora no muestre huecos (1, 2, 4).
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
          // Todo el cálculo (descartar series pendientes, duración, volumen, récords, sugerencias) vive en
          // packages/shared/src/cierre.ts. Aquí solo se juntan los datos y se guarda lo que devuelve.
          const { sesiones, rutinas, ejercicios, perfil } = get();
          const sesion = sesiones.find((s) => s.id === sid);
          if (!sesion || sesion.estado !== 'en_curso') return null;
          const rutina = rutinas.find((r) => r.id === sesion.routineId);
          const cerrada = calcularCierre({
            sesion,
            // Van todas las sesiones, incluida esta: calcularCierre la deja fuera por id.
            previas: sesiones,
            ejercicios,
            // Si borraron la rutina con la sesión abierta, se cierra igual con la regla por defecto.
            metodo: rutina?.metodo ?? 'doble_progresion',
            ahoraIso: ahoraIso(),
            pesoCorporalKg: perfil.pesoCorporalKg,
          });
          set({ sesiones: sesiones.map((s) => (s.id === sid ? cerrada : s)) });
          return cerrada;
        },
        descartarSesion(sid) {
          // Se borra de verdad en vez de dejarla con estado 'descartada': así no aparece en racha ni historial.
          set({ sesiones: get().sesiones.filter((s) => s.id !== sid) });
        },
      };
    },
    // ── Persistencia ─────────────────────────────────────────────────────────────
    {
      // Clave con la que se guarda en AsyncStorage. Cambiarla dejaría atrás lo que ya tienen los teléfonos;
      // si cambia la forma de los datos, la regla de la guía es agregar campos opcionales con valor por
      // defecto al leer (packages/shared/src/types.ts).
      name: 'gymtrack-v1',
      // Si la lectura falló (errorCarga), las escrituras se ignoran para no pisar los datos reales en disco.
      storage: createJSONStorage(() => ({
        getItem: (k: string) => AsyncStorage.getItem(k),
        setItem: (k: string, v: string) => (escrituraBloqueada ? Promise.resolve() : AsyncStorage.setItem(k, v)),
        removeItem: (k: string) => AsyncStorage.removeItem(k),
      })),
      // Solo se guardan datos: hidratado y errorCarga son banderas de esta apertura y se recalculan.
      partialize: (s) => ({
        perfil: s.perfil,
        ejercicios: s.ejercicios,
        rutinas: s.rutinas,
        sesiones: s.sesiones,
        sembrado: s.sembrado,
      }),
      onRehydrateStorage: () => (_estado, error) => {
        // Corre cuando termina de leer el almacenamiento (haya datos o no).
        // Usa useStore (la constante de afuera) porque aquí no hay set/get. Funciona porque AsyncStorage es
        // asíncrono y el store ya existe cuando llega la respuesta; con un storage síncrono esto reventaría.
        if (error) {
          // No se pudo leer lo guardado: sembrar ahora pisaría los datos reales en disco.
          escrituraBloqueada = true;
          useStore.setState({ hidratado: true, errorCarga: true });
          return;
        }
        try {
          // Primera apertura: no había nada guardado, así que entran la biblioteca base y la rutina de ejemplo.
          const st = useStore.getState();
          if (!st.sembrado) st.sembrar();
        } finally {
          // Pase lo que pase se suelta el layout raíz, que no muestra la app hasta que hidratado sea true.
          useStore.setState({ hidratado: true });
        }
      },
    },
  ),
);
