// ─────────────────────────────────────────────────────────────────────────────
// Nueva rutina y Editar rutina · Zona: Alumno (área Rutinas, PAN-07)
//
// Qué hace: el editor de docs/pantallas/nueva-rutina.html. Nombre, cómo progresa (hoja con los 4
// métodos; parte en doble progresión), semanas, y los días: cada uno se abre para ver sus
// ejercicios, se renombra, se le fija día de la semana, se duplica, se quita y se reordena. Los
// ejercicios se agregan desde la biblioteca (hoja con buscador, grupos y varias casillas) y se
// ajustan en su hoja (series, rango de repeticiones, RIR, descanso, incremento, carga inicial,
// esquema y, para el entrenador, la nota). Al guardar revisa lo que falta (APP-021) y, si la API
// responde 422, marca el día o el ejercicio del error sin perder nada (APP-022). Nueva hace
// POST /routines (y la asigna si llegó ?cliente=); editar hace PATCH y PUT /routines/:id/days.
// Tócalo cuando: cambie el editor de rutinas o una de sus hojas.
// No lo toques para: las reglas (./logica.ts) ni el detalle (./DetalleRutina.tsx).
// Depende de: ./api, ./logica, ./piezas, ./useCarga, @/components/ui y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAccion, Boton, Cabecera, CampoTexto, Chip, Hoja, Icono, Paso, Simbolo, Txt, useAviso } from '@/components/ui';
import { ErrorDeApi, useSesion } from '@/lib/sesion';
import { activarRutina, cambiarRutina, crearRutina, leerRutina, listarEjercicios, mensajeDeError, reemplazarDias } from './api';
import type { DiaDeRutina, EjercicioDeRutina, Ejercicio, Rutina } from './datos';
import {
  borradorDe,
  cuerpoDias,
  cuerpoRutina,
  diaNuevo,
  ejercicioNuevo,
  erroresDeApi,
  erroresRutina,
  ESQUEMAS,
  GRUPOS_FILTRO,
  INCREMENTOS,
  LETRAS_DIA,
  metodoDe,
  METODOS_RUTINA,
  mover,
  nombreDiaSemana,
  pasoCarga,
  plural,
  reloj,
  rutinaVacia,
  seriesDelDia,
  sinTildes,
  tituloErrores,
  type BorradorRutina,
  type ErrorRutina,
} from './logica';
import { BandaSinConexion, BotonOpciones, Buscador, ErrorCarga, Esqueleto, FilaControl, FilaElegible, FilaMenu, Marca } from './piezas';
import { useCarga } from './useCarga';

const kg = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const rango = (e: EjercicioDeRutina) => (e.repsMin === e.repsMax ? `${e.repsMin}` : `${e.repsMin}–${e.repsMax}`);

/** Abre el editor: vacío, o con la rutina `editarId` ya cargada. */
export function PantallaEditorRutina({ editarId, clienteId }: { editarId?: string; clienteId?: string }) {
  const carga = useCarga(null, async () => (editarId ? leerRutina(editarId) : null));
  if (editarId && carga.estado !== 'listo') {
    return (
      <View className="flex-1 bg-fondo px-4 pt-12">
        <Cabecera cerrar titulo="Editar rutina" />
        {carga.estado === 'error' ? (
          <ErrorCarga texto="No pudimos abrir la rutina para editarla." onReintentar={carga.recargar} />
        ) : (
          <Esqueleto filas={3} etiqueta="Cargando la rutina" />
        )}
      </View>
    );
  }
  const r = carga.datos;
  return <Editor key={r?.id ?? 'nueva'} rutina={r ?? null} clienteId={clienteId} />;
}

type HojaEditor =
  | { tipo: 'ejercicio'; d: number; e: number }
  | { tipo: 'biblioteca'; d: number; sel: string[]; q: string; grupo: string }
  | { tipo: 'metodo' }
  | { tipo: 'dia'; d: number }
  | { tipo: 'quitar-dia'; d: number }
  | { tipo: 'salir' }
  | null;

function Editor({ rutina, clienteId }: { rutina: Rutina | null; clienteId?: string }) {
  const { rol } = useSesion();
  const aviso = useAviso();
  const insets = useSafeAreaInsets();
  const ent = rol === 'entrenador';
  const editar = !!rutina;
  const inicial = useMemo(() => (rutina ? borradorDe(rutina) : rutinaVacia()), [rutina]);
  const [b, setB] = useState<BorradorRutina>(inicial);
  const [abierto, setAbierto] = useState(rutina ? 0 : -1);
  const [ordenar, setOrdenar] = useState(false);
  const [intento, setIntento] = useState(false);
  const [erroresApi, setErroresApi] = useState<ErrorRutina[] | null>(null);
  const [hoja, setHoja] = useState<HojaEditor>(null);
  const [guardando, setGuardando] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const catalogo = useCarga('ejercicios', listarEjercicios);
  const ejercicios = useMemo(() => catalogo.datos ?? [], [catalogo.datos]);
  const cambio = JSON.stringify(b) !== JSON.stringify(inicial);

  const errs = intento ? erroresRutina(b) : [];
  const todos = erroresApi ?? errs;
  const errNombre = todos.some((x) => x.campo === 'nombre');
  const errDia = (i: number) => todos.find((x) => x.campo === 'dia' && x.dia === i);
  const errEj = (i: number, k: number) => todos.find((x) => x.campo === 'ejercicio' && x.dia === i && x.ejercicio === k);

  // ── Cambios al borrador ────────────────────────────────────────────────────
  const cambiar = (f: (x: BorradorRutina) => BorradorRutina) => {
    setErroresApi(null);
    setB((x) => f(x));
  };
  const cambiarDia = (i: number, f: (d: DiaDeRutina) => DiaDeRutina) =>
    cambiar((x) => ({ ...x, dias: x.dias.map((d, j) => (j === i ? f(d) : d)) }));
  const cambiarEj = (i: number, k: number, f: (e: EjercicioDeRutina) => EjercicioDeRutina) =>
    cambiarDia(i, (d) => ({ ...d, ejercicios: d.ejercicios.map((e, j) => (j === k ? f(e) : e)) }));

  function agregarDia() {
    const n = b.dias.length;
    cambiar((x) => ({ ...x, dias: [...x.dias, diaNuevo(n + 1)] }));
    setAbierto(n);
    setHoja({ tipo: 'dia', d: n });
  }

  function volver() {
    if (cambio) setHoja({ tipo: 'salir' });
    else salir();
  }
  const salir = () => (router.canGoBack() ? router.back() : router.replace(ent ? '/entrenador/rutinas' : '/rutinas'));

  async function guardar() {
    const lista = erroresRutina(b);
    setIntento(true);
    setErroresApi(null);
    if (lista.length) {
      scroll.current?.scrollTo({ y: 0, animated: true });
      aviso.mostrar('Revisa lo marcado en rojo.');
      return;
    }
    setGuardando(true);
    try {
      if (rutina) {
        await cambiarRutina(rutina.id, { nombre: b.nombre.trim(), metodo_progresion: b.metodo, semanas: b.semanas });
        await reemplazarDias(rutina.id, cuerpoDias(b.dias, ent, true));
        aviso.mostrar('Guardaste los cambios.');
        salir();
      } else {
        // Con ?cliente= la rutina se escribe para ese cliente de una (client_id), sin copia aparte.
        const nueva = await crearRutina(cuerpoRutina(b, ent, ent ? clienteId : null));
        // «Al guardarla queda asignada a tu cliente y empieza en la semana 1»: se activa al tiro.
        if (ent && clienteId && nueva.id) await activarRutina(nueva.id);
        aviso.mostrar(
          clienteId
            ? `Guardaste ${b.nombre.trim()} y quedó asignada.`
            : ent
              ? `Guardaste ${b.nombre.trim()} en tu biblioteca.`
              : `Guardaste ${b.nombre.trim()}. Actívala para usarla en Hoy.`,
        );
        if (nueva.id) router.replace({ pathname: '/rutina/[id]', params: { id: nueva.id } });
        else salir();
      }
    } catch (e) {
      if (e instanceof ErrorDeApi && (e.estado === 422 || e.estado === 400)) {
        setErroresApi(erroresDeApi(e.detalles, b, e.message));
        scroll.current?.scrollTo({ y: 0, animated: true });
      } else aviso.mostrar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  // ── Piezas ─────────────────────────────────────────────────────────────────
  const filaEjercicio = (e: EjercicioDeRutina, k: number, i: number, n: number) => {
    const corporal = e.tipoCarga !== 'kg';
    const meta = `RIR ${e.rir === 4 ? '4+' : e.rir} · ${reloj(e.descansoS)}${corporal || !e.incrementoKg ? '' : ` · sube ${kg(e.incrementoKg)}`}`;
    const error = errEj(i, k);
    return (
      <View key={`${e.ejercicioId}-${k}`} className="border-t border-sup-alta">
        <View className="min-h-[56px] flex-row items-center">
          <Pressable
            onPress={() => !ordenar && setHoja({ tipo: 'ejercicio', d: i, e: k })}
            disabled={ordenar}
            accessibilityRole="button"
            accessibilityLabel={`${e.nombre}, ${e.series} series de ${rango(e)}`}
            className="flex-1 flex-row items-center gap-3 py-2 active:bg-fantasma-pres"
          >
            <Text className="w-5 font-mono-bold text-[13px] text-texto-2">{k + 1}</Text>
            <View className="flex-1">
              <Text className="font-sans-semibold text-[15px] text-texto">{e.nombre}</Text>
              <Txt v="sec">{meta}</Txt>
            </View>
            {!ordenar ? (
              <View className="items-end">
                <Text className="font-mono-bold text-[15px] text-texto">
                  {e.series}
                  <Text className="text-texto-2">×</Text>
                  {rango(e)}
                </Text>
                <Text className="font-mono-bold text-[13px] text-texto-2">{corporal ? 'peso corporal' : `${kg(e.pesoInicialKg ?? 0)} kg`}</Text>
              </View>
            ) : null}
          </Pressable>
          {ordenar ? (
            <Flechas
              nombre={e.nombre}
              arriba={k > 0}
              abajo={k < n - 1}
              onMover={(dir) => cambiarDia(i, (d) => ({ ...d, ejercicios: mover(d.ejercicios, k, dir) }))}
            />
          ) : null}
        </View>
        {error ? (
          <Txt v="error" className="mb-2">
            {error.texto}
          </Txt>
        ) : null}
      </View>
    );
  };

  const tarjetaDia = (d: DiaDeRutina, i: number) => {
    const ab = abierto === i;
    const err = errDia(i);
    const sub = `${nombreDiaSemana(d.diaSemana)} · ${plural(d.ejercicios.length, 'ejercicio', 'ejercicios')}${
      d.ejercicios.length ? ` · ${seriesDelDia(d)} series` : ''
    }`;
    return (
      <View key={`dia-${i}`} className={`mb-2 rounded-control border bg-sup px-4 ${err ? 'border-peligro' : 'border-sup-alta'}`}>
        <View className="min-h-[64px] flex-row items-center">
          <Pressable
            onPress={() => setAbierto(ab ? -1 : i)}
            accessibilityRole="button"
            accessibilityState={{ expanded: ab }}
            accessibilityLabel={`${d.nombre}. ${sub}`}
            className="flex-1 flex-row items-center gap-3 py-2"
          >
            <View className="h-7 w-7 items-center justify-center rounded-control bg-sup-alta">
              <Text className="font-mono-bold text-[13px] text-texto">{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans-bold text-[16px] text-texto">{d.nombre}</Text>
              <Txt v="sec">{sub}</Txt>
            </View>
            <Icono nombre={ab ? 'arriba' : 'abajo'} tamano={20} />
          </Pressable>
          {ordenar ? (
            <Flechas
              nombre={d.nombre}
              arriba={i > 0}
              abajo={i < b.dias.length - 1}
              onMover={(dir) => {
                cambiar((x) => ({ ...x, dias: mover(x.dias, i, dir) }));
                if (abierto === i) setAbierto(i + dir);
              }}
            />
          ) : (
            <View className="-mr-3">
              <BotonOpciones etiqueta={`Opciones de ${d.nombre}`} onPress={() => setHoja({ tipo: 'dia', d: i })} />
            </View>
          )}
        </View>
        {err ? (
          <Txt v="error" className="mb-3">
            {err.campo === 'dia' && !d.ejercicios.length ? 'Agrega al menos un ejercicio o quita este día.' : err.texto}
          </Txt>
        ) : null}
        {ab ? (
          <View className="pb-2">
            {d.ejercicios.length ? (
              d.ejercicios.map((e, k) => filaEjercicio(e, k, i, d.ejercicios.length))
            ) : !err ? (
              <Txt v="sec" className="pb-2">
                Todavía no hay ejercicios en este día.
              </Txt>
            ) : null}
            {!ordenar ? (
              <Pressable
                onPress={() => setHoja({ tipo: 'biblioteca', d: i, sel: [], q: '', grupo: 'Todos' })}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ejercicio a ${d.nombre}`}
                className="-ml-3 min-h-[48px] flex-row items-center gap-2 self-start rounded-control px-3 active:bg-fantasma-pres"
              >
                <Simbolo tamano={18} />
                <Text className="font-sans-semibold text-[16px] text-texto">Agregar ejercicio</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const metodo = metodoDe(b.metodo);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-fondo" style={{ paddingTop: insets.top }}>
      <View className="px-4">
        <Cabecera atras titulo={editar ? 'Editar rutina' : 'Nueva rutina'} alVolver={volver} />
      </View>
      <ScrollView ref={scroll} className="flex-1" contentContainerClassName="px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        {catalogo.sinConexion ? <BandaSinConexion texto="Puedes armar la rutina con los ejercicios guardados; para guardarla necesitas señal." /> : null}
        {todos.length ? (
          <View accessibilityRole="alert" className="mb-4 rounded-control border-2 border-peligro bg-sup p-4">
            <Txt v="h3">{erroresApi ? 'Con errores al guardar' : tituloErrores(todos.length)}</Txt>
            {todos.map((x, i) => (
              <Txt key={i} v="cuerpo" className="mt-1">
                {`· ${x.texto}`}
              </Txt>
            ))}
          </View>
        ) : null}
        {editar ? (
          <View className="mb-4 rounded-control border border-sup-alta bg-sup px-3.5 py-3">
            <Txt v="cuerpo">
              {ent
                ? 'Los cambios les llegan a tus clientes desde su próxima sesión; lo que ya hicieron no cambia.'
                : rutina?.estado === 'activa'
                  ? 'Es tu rutina activa. Los cambios corren desde tu próxima sesión; lo que ya hiciste no cambia.'
                  : 'Los cambios se guardan en esta rutina.'}
            </Txt>
          </View>
        ) : ent ? (
          <Txt v="sec" className="mb-4">
            {clienteId ? 'Al guardarla queda asignada a tu cliente y empieza en la semana 1.' : 'Queda en tu biblioteca. Después la asignas a los clientes que quieras.'}
          </Txt>
        ) : null}

        <CampoTexto
          etiqueta="Nombre"
          valor={b.nombre}
          onCambiar={(v) => cambiar((x) => ({ ...x, nombre: v }))}
          placeholder="Por ejemplo: Fuerza 4 días"
          error={errNombre ? 'Ponle un nombre para encontrarla después.' : null}
          autoCapitalize="sentences"
        />

        <Txt v="etiquetaCampo" className="mt-5">
          Cómo progresa
        </Txt>
        <Pressable
          onPress={() => setHoja({ tipo: 'metodo' })}
          accessibilityRole="button"
          accessibilityLabel={`Cómo progresa: ${metodo.nombre}`}
          className="mt-2 min-h-[64px] flex-row items-center gap-3 rounded-control border-2 border-campo-borde bg-campo-fondo px-3 py-3 active:bg-fantasma-pres"
        >
          <View className="flex-1">
            <Text className="font-sans-bold text-[16px] text-texto">{metodo.nombre}</Text>
            {metodo.detalle ? <Txt v="sec">{metodo.detalle}</Txt> : null}
          </View>
          <Icono nombre="adelante" tamano={20} />
        </Pressable>

        <FilaControl rotulo="Semanas" ayuda="Cuánto dura antes de cambiarla">
          <Paso valor={b.semanas} onCambiar={(v) => cambiar((x) => ({ ...x, semanas: v }))} min={1} max={24} etiqueta="semanas" />
        </FilaControl>

        <View className="mb-2 mt-6 flex-row items-center justify-between">
          <Text accessibilityRole="header" className="font-sans-bold text-[17px] text-texto">
            Días{b.dias.length ? <Text className="font-mono-bold text-texto-2">{`  ${b.dias.length}`}</Text> : null}
          </Text>
          {b.dias.length > 1 ? (
            <Boton titulo={ordenar ? 'Listo' : 'Ordenar'} variante="fantasma" onPress={() => setOrdenar((o) => !o)} accessibilityState={{ selected: ordenar }} />
          ) : null}
        </View>

        {b.dias.length ? (
          b.dias.map(tarjetaDia)
        ) : (
          <View className={`rounded-control border bg-sup p-4 ${intento ? 'border-peligro' : 'border-sup-alta'}`}>
            <Txt v="h3">Todavía no hay días</Txt>
            <Txt v="sec" className="mt-1">
              Agrega uno por cada día distinto que entrenas. Por ejemplo Empuje A, Pierna A y Tirón A.
            </Txt>
            <Boton titulo="Agregar el primer día" variante="secundario" ancho className="mt-3" onPress={agregarDia} />
          </View>
        )}
        {b.dias.length && !ordenar ? <Boton titulo="Agregar día" variante="secundario" ancho className="mt-2" onPress={agregarDia} /> : null}
      </ScrollView>
      <BarraAccion>
        <Boton
          titulo={editar ? 'Guardar cambios' : 'Guardar rutina'}
          alto
          ancho
          cargando={guardando}
          onPress={guardar}
        />
      </BarraAccion>

      <HojaEjercicio hoja={hoja} b={b} ent={ent} onCerrar={() => setHoja(null)} cambiarEj={cambiarEj} quitar={(i, k) => {
        cambiarDia(i, (d) => ({ ...d, ejercicios: d.ejercicios.filter((_, j) => j !== k) }));
        setHoja(null);
      }} />

      {hoja?.tipo === 'biblioteca' ? (
        <HojaBiblioteca
          dia={b.dias[hoja.d]}
          ejercicios={ejercicios}
          estado={hoja}
          onEstado={(h) => setHoja({ ...hoja, ...h })}
          onCerrar={() => setHoja(null)}
          onAgregar={() => {
            const nuevos = hoja.sel.map((id) => ejercicios.find((e) => e.id === id)).filter((e): e is Ejercicio => !!e).map(ejercicioNuevo);
            cambiarDia(hoja.d, (d) => ({ ...d, ejercicios: [...d.ejercicios, ...nuevos] }));
            setAbierto(hoja.d);
            setHoja(null);
            aviso.mostrar(nuevos.length === 1 ? `Agregaste ${nuevos[0]?.nombre}.` : `Agregaste ${nuevos.length} ejercicios.`);
          }}
        />
      ) : null}

      <Hoja visible={hoja?.tipo === 'metodo'} onCerrar={() => setHoja(null)} titulo="Cómo progresa" texto="Con esto la app calcula cuánto subir en cada sesión. Vale para toda la rutina.">
        <View className="mt-2" accessibilityRole="radiogroup">
          {METODOS_RUTINA.map((m) => (
            <FilaElegible
              key={m.id}
              radio
              titulo={m.nombre}
              detalle={m.detalle}
              marcada={b.metodo === m.id}
              derecha={m.recomendado ? <Marca texto="Recomendado" /> : undefined}
              onPress={() => cambiar((x) => ({ ...x, metodo: m.id }))}
            />
          ))}
        </View>
        <View className="mt-5 flex-row">
          <Boton titulo="Listo" alto className="flex-1" onPress={() => setHoja(null)} />
        </View>
      </Hoja>

      {hoja?.tipo === 'dia' && b.dias[hoja.d] ? (
        <Hoja visible onCerrar={() => setHoja(null)} titulo={`Día ${hoja.d + 1}`}>
          <View className="mt-3">
            <CampoTexto
              etiqueta="Nombre del día"
              valor={b.dias[hoja.d]?.nombre ?? ''}
              onCambiar={(v) => cambiarDia(hoja.d, (d) => ({ ...d, nombre: v }))}
              placeholder="Por ejemplo: Pierna A"
              autoCapitalize="sentences"
            />
          </View>
          <Txt v="etiquetaCampo" className="mt-4">
            Qué día de la semana
          </Txt>
          <View className="mt-1 flex-row gap-1">
            {LETRAS_DIA.map((l, j) => (
              <Chip
                key={l}
                titulo={l}
                texto={false}
                ancho
                etiqueta={nombreDiaSemana(j + 1)}
                activo={b.dias[hoja.d]?.diaSemana === j + 1}
                onPress={() => cambiarDia(hoja.d, (d) => ({ ...d, diaSemana: d.diaSemana === j + 1 ? null : j + 1 }))}
              />
            ))}
          </View>
          <Txt v="sec" className="mt-1">
            {b.dias[hoja.d]?.diaSemana
              ? `Toca ${LETRAS_DIA[(b.dias[hoja.d]?.diaSemana ?? 1) - 1]} de nuevo para dejarlo sin día fijo.`
              : 'Sin día fijo: la rutina sigue el orden de la lista.'}
          </Txt>
          <View className="-mx-4 mt-3">
            <FilaMenu
              titulo="Duplicar día"
              onPress={() => {
                const d = b.dias[hoja.d] as DiaDeRutina;
                cambiar((x) => ({
                  ...x,
                  dias: [...x.dias.slice(0, hoja.d + 1), { ...d, id: null, nombre: `${d.nombre} (copia)`, ejercicios: d.ejercicios.map((e) => ({ ...e, id: null })) }, ...x.dias.slice(hoja.d + 1)],
                }));
                setHoja(null);
                aviso.mostrar(`Duplicaste ${d.nombre}.`);
              }}
            />
            <FilaMenu titulo="Quitar día" peligro onPress={() => setHoja({ tipo: 'quitar-dia', d: hoja.d })} />
          </View>
          <View className="mt-5 flex-row">
            <Boton titulo="Listo" alto className="flex-1" onPress={() => setHoja(null)} />
          </View>
        </Hoja>
      ) : null}

      {hoja?.tipo === 'quitar-dia' && b.dias[hoja.d] ? (
        <Hoja
          visible
          onCerrar={() => setHoja({ tipo: 'dia', d: hoja.d })}
          titulo={`¿Quitar ${b.dias[hoja.d]?.nombre}?`}
          texto={`Se quitan sus ${plural(b.dias[hoja.d]?.ejercicios.length ?? 0, 'ejercicio', 'ejercicios')}. Lo que ya entrenaste no se borra.`}
          acciones={
            <>
              <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja({ tipo: 'dia', d: hoja.d })} />
              <Boton
                titulo="Quitar día"
                variante="peligro"
                alto
                className="flex-1"
                onPress={() => {
                  cambiar((x) => ({ ...x, dias: x.dias.filter((_, j) => j !== hoja.d) }));
                  setAbierto(-1);
                  setHoja(null);
                }}
              />
            </>
          }
        />
      ) : null}

      <Hoja
        visible={hoja?.tipo === 'salir'}
        onCerrar={() => setHoja(null)}
        titulo="¿Salir sin guardar?"
        texto="Se pierde lo que armaste en esta rutina."
        acciones={
          <>
            <Boton titulo="Seguir armando" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Salir"
              variante="peligro"
              alto
              className="flex-1"
              onPress={() => {
                setHoja(null);
                salir();
              }}
            />
          </>
        }
      />
    </KeyboardAvoidingView>
  );
}

// ── Flechas de ordenar ───────────────────────────────────────────────────────
function Flechas({ nombre, arriba, abajo, onMover }: { nombre: string; arriba: boolean; abajo: boolean; onMover: (d: -1 | 1) => void }) {
  return (
    <View className="flex-row">
      <BotonFlecha icono="arriba" etiqueta={`Subir ${nombre}`} activo={arriba} onPress={() => onMover(-1)} />
      <BotonFlecha icono="abajo" etiqueta={`Bajar ${nombre}`} activo={abajo} onPress={() => onMover(1)} />
    </View>
  );
}

function BotonFlecha({ icono, etiqueta, activo, onPress }: { icono: 'arriba' | 'abajo'; etiqueta: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!activo}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !activo }}
      className="h-12 w-12 items-center justify-center rounded-control active:bg-fantasma-pres"
      style={{ opacity: activo ? 1 : 0.35 }}
    >
      <Icono nombre={icono} tamano={22} />
    </Pressable>
  );
}

// ── Hoja de un ejercicio ─────────────────────────────────────────────────────
function HojaEjercicio({
  hoja,
  b,
  ent,
  onCerrar,
  cambiarEj,
  quitar,
}: {
  hoja: HojaEditor;
  b: BorradorRutina;
  ent: boolean;
  onCerrar: () => void;
  cambiarEj: (i: number, k: number, f: (e: EjercicioDeRutina) => EjercicioDeRutina) => void;
  quitar: (i: number, k: number) => void;
}) {
  const visible = hoja?.tipo === 'ejercicio';
  const d = visible ? b.dias[hoja.d] : undefined;
  const e = visible && d ? d.ejercicios[hoja.e] : undefined;
  if (!visible || !d || !e) return <Hoja visible={false} onCerrar={onCerrar} />;
  const i = hoja.d;
  const k = hoja.e;
  const set = (f: (x: EjercicioDeRutina) => EjercicioDeRutina) => cambiarEj(i, k, f);
  const corporal = e.tipoCarga !== 'kg';
  const idxInc = Math.max(0, INCREMENTOS.indexOf(e.incrementoKg));
  const esquema = ESQUEMAS.find((x) => x.id === e.esquema) ?? ESQUEMAS[0];
  return (
    <Hoja
      visible
      onCerrar={onCerrar}
      titulo={e.nombre}
      texto={[e.grupo, e.equipo, `en ${d.nombre}`].filter(Boolean).join(' · ')}
      acciones={
        <>
          <Boton titulo="Quitar" variante="fantasmaPeligro" alto className="flex-1" onPress={() => quitar(i, k)} />
          <Boton titulo="Listo" alto className="flex-1" onPress={onCerrar} />
        </>
      }
    >
      <ScrollView style={{ maxHeight: 440 }} className="mt-2" keyboardShouldPersistTaps="handled">
        <FilaControl rotulo="Series">
          <Paso valor={e.series} onCambiar={(v) => set((x) => ({ ...x, series: v }))} min={1} max={10} etiqueta="series" />
        </FilaControl>
        <FilaControl rotulo="Repeticiones mín.">
          <Paso valor={e.repsMin} onCambiar={(v) => set((x) => ({ ...x, repsMin: v }))} min={1} max={e.repsMax} unidad="reps" etiqueta="repeticiones mínimas" />
        </FilaControl>
        <FilaControl rotulo="Repeticiones máx.">
          <Paso valor={e.repsMax} onCambiar={(v) => set((x) => ({ ...x, repsMax: v }))} min={e.repsMin} max={50} unidad="reps" etiqueta="repeticiones máximas" />
        </FilaControl>

        <Txt v="etiquetaCampo" className="mt-5">
          RIR objetivo · repeticiones que deben quedar
        </Txt>
        <View className="mt-1 flex-row gap-2">
          {[0, 1, 2, 3, 4].map((r) => (
            <Chip key={r} titulo={r === 4 ? '4+' : String(r)} texto={false} ancho etiqueta={`RIR ${r === 4 ? '4 o más' : r}`} activo={e.rir === r} onPress={() => set((x) => ({ ...x, rir: r }))} />
          ))}
        </View>
        <Txt v="sec">0 es llegar al fallo; 4+ es terminar con mucho resto.</Txt>

        <FilaControl rotulo="Descanso" ayuda="Entre series">
          <Paso valor={e.descansoS} onCambiar={(v) => set((x) => ({ ...x, descansoS: v }))} paso={15} min={0} max={600} formato={reloj} etiqueta="descanso" />
        </FilaControl>
        {corporal ? (
          <Txt v="sec" className="mt-4">
            Es con tu peso: la app sugiere más repeticiones en vez de kilos.
          </Txt>
        ) : (
          <>
            <FilaControl rotulo="Incremento" ayuda="Lo que sube cuando toca">
              <Paso
                valor={idxInc}
                onCambiar={(v) => set((x) => ({ ...x, incrementoKg: INCREMENTOS[v] ?? x.incrementoKg }))}
                min={0}
                max={INCREMENTOS.length - 1}
                formato={(v) => kg(INCREMENTOS[Math.round(v)] ?? 0)}
                unidad="kg"
                etiqueta="incremento"
              />
            </FilaControl>
            <FilaControl rotulo="Carga inicial" ayuda="Para la primera sesión">
              <Paso
                valor={e.pesoInicialKg ?? 0}
                onCambiar={(v) => set((x) => ({ ...x, pesoInicialKg: v }))}
                paso={pasoCarga(e.equipo)}
                min={0}
                max={400}
                unidad="kg"
                etiqueta="carga inicial"
              />
            </FilaControl>
          </>
        )}

        <Txt v="etiquetaCampo" className="mt-5">
          Esquema de las series
        </Txt>
        <View className="mt-1 flex-row flex-wrap gap-2">
          {ESQUEMAS.map((x) => (
            <Chip key={x.id} titulo={x.nombre} activo={e.esquema === x.id} onPress={() => set((y) => ({ ...y, esquema: x.id }))} />
          ))}
        </View>
        <Txt v="sec">{esquema?.detalle}</Txt>

        {ent ? (
          <View className="mt-4">
            <CampoTexto etiqueta="Nota para tus clientes" valor={e.nota} onCambiar={(v) => set((x) => ({ ...x, nota: v }))} placeholder="Por ejemplo: baja en 3 segundos" />
          </View>
        ) : null}
        <View className="h-2" />
      </ScrollView>
    </Hoja>
  );
}

// ── Hoja de la biblioteca ────────────────────────────────────────────────────
function HojaBiblioteca({
  dia,
  ejercicios,
  estado,
  onEstado,
  onCerrar,
  onAgregar,
}: {
  dia: DiaDeRutina | undefined;
  ejercicios: Ejercicio[];
  estado: { sel: string[]; q: string; grupo: string };
  onEstado: (h: Partial<{ sel: string[]; q: string; grupo: string }>) => void;
  onCerrar: () => void;
  onAgregar: () => void;
}) {
  const { usuario } = useSesion();
  if (!dia) return null;
  const ya = dia.ejercicios.map((e) => e.ejercicioId);
  const q = sinTildes(estado.q.trim());
  const coincide = (e: Ejercicio) => !q || sinTildes(e.nombre).includes(q);
  const visibles = ejercicios
    .filter((e) => estado.grupo === 'Todos' || sinTildes(e.grupo) === sinTildes(estado.grupo))
    .filter(coincide)
    .sort((x, y) => Number(ya.includes(x.id)) - Number(ya.includes(y.id)) || x.nombre.localeCompare(y.nombre, 'es'));
  const enOtro = !visibles.length && estado.grupo !== 'Todos' && ejercicios.some(coincide);
  const n = estado.sel.length;
  return (
    <Hoja
      visible
      onCerrar={onCerrar}
      titulo={`Agregar a ${dia.nombre}`}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={onCerrar} />
          <Boton titulo={n ? `Agregar ${n}` : 'Elige ejercicios'} alto className="flex-1" disabled={!n} onPress={onAgregar} />
        </>
      }
    >
      <View className="mt-3">
        <Buscador valor={estado.q} onCambiar={(v) => onEstado({ q: v })} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="mt-1 flex-grow-0">
        {GRUPOS_FILTRO.map((g) => (
          <Chip key={g} titulo={g} activo={estado.grupo === g} onPress={() => onEstado({ grupo: g })} />
        ))}
      </ScrollView>
      <ScrollView style={{ maxHeight: 320 }} className="mt-1 border-t border-sup-alta" keyboardShouldPersistTaps="handled">
        {visibles.map((e) => {
          const esta = ya.includes(e.id);
          return (
            <FilaElegible
              key={e.id}
              titulo={e.nombre}
              detalle={esta ? `Ya está en ${dia.nombre}` : `${e.grupo} · ${e.equipo}`}
              marcada={esta || estado.sel.includes(e.id)}
              disabled={esta}
              derecha={e.duenoId && e.duenoId === usuario?.id ? <Marca texto="Propio" /> : undefined}
              onPress={() => onEstado({ sel: estado.sel.includes(e.id) ? estado.sel.filter((x) => x !== e.id) : [...estado.sel, e.id] })}
            />
          );
        })}
        {enOtro ? (
          <View className="items-start gap-2 py-4">
            <Txt v="h3">No está en {estado.grupo}</Txt>
            <Txt v="sec">Hay resultados en otros grupos.</Txt>
            <Boton titulo="Buscar en todos" variante="secundario" ancho onPress={() => onEstado({ grupo: 'Todos' })} />
          </View>
        ) : null}
        {!visibles.length && !enOtro ? (
          <View className="items-start gap-2 py-4">
            <Txt v="h3">{ejercicios.length ? 'No está en la biblioteca' : 'No hay ejercicios guardados'}</Txt>
            <Txt v="sec">
              {ejercicios.length ? 'Créalo como ejercicio propio, con tu foto o video de referencia.' : 'Conéctate para cargar la biblioteca de ejercicios.'}
            </Txt>
            {ejercicios.length ? (
              <Boton
                titulo="Crear ejercicio"
                variante="secundario"
                ancho
                onPress={() => {
                  onCerrar();
                  router.push({ pathname: '/ejercicio/[id]', params: { id: 'nuevo', nombre: estado.q.trim() } });
                }}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Hoja>
  );
}
