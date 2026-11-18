// ─────────────────────────────────────────────────────────────────────────────
// Detalle de rutina · Zona: Alumno (área Rutinas, PAN-08)
//
// Qué hace: el plan de una rutina como en docs/pantallas/rutina.html: estado y autor, semanas
// (si está activa), el aviso de solo lectura cuando la armó el entrenador, el historial de una
// archivada, los días con sus ejercicios (series × reps, RIR, descanso y carga), la nota del
// entrenador y cómo sube el método. Abajo, una sola acción según el estado (APP-023): «Empezar»
// solo si el día elegido toca hoy, «Hacer X hoy» si no, «Activar» en borradores y archivadas
// propias, «Duplicar como mía» en las del entrenador y «Asignar a clientes» para el entrenador.
// Tócalo cuando: cambie lo que muestra el detalle o sus hojas.
// No lo toques para: la lista de rutinas (./Rutinas.tsx) ni el editor (./EditorRutina.tsx).
// Depende de: ./api, ./logica, ./piezas, ./Rutinas (HojaAsignar), @/components/ui y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarraAccion, Boton, Cabecera, Hoja, Icono, Pantalla, Separador, Tarjeta, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { activarRutina, archivarRutina, asignarRutina, clientesEntrenador, duplicarRutina, leerRutina, mensajeDeError } from './api';
import type { EjercicioDeRutina, Rutina } from './datos';
import {
  accionDetalle,
  accionesRutina,
  esMia,
  fechaCorta,
  iniciales,
  indiceDiaDeHoy,
  LETRAS_DIA,
  listaNatural,
  metodoDe,
  minutosDelDia,
  nombreDiaSemana,
  reloj,
  semanaActual,
  seriesDelDia,
} from './logica';
import { Avatar, BandaSinConexion, BotonOpciones, ConCifras, CuadroCifra, ErrorCarga, Esqueleto, FilaMenu, Marca, Semanas } from './piezas';
import { HojaAsignar } from './Rutinas';
import { ahora, useCarga } from './useCarga';

type Cliente = { id: string; nombre: string; rutina: string | null; rutinaId: string | null };
type HojaAbierta = 'menu' | 'activar' | 'archivar' | 'eliminar' | 'cambio' | 'asignar' | null;

const kg = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

export function PantallaDetalleRutina({ id, diaInicial }: { id: string; diaInicial?: number }) {
  const { usuario, rol } = useSesion();
  const aviso = useAviso();
  const { c } = useTema();
  const ent = rol === 'entrenador';
  const carga = useCarga(`rutina.${id}`, async () => {
    const r = await leerRutina(id);
    const clientes = ent ? await clientesEntrenador().catch(() => [] as Cliente[]) : [];
    return { r, clientes };
  });
  const [hoy] = useState(ahora);
  const [diaSel, setDiaSel] = useState<number | null>(diaInicial ?? null);
  const [hoja, setHoja] = useState<HojaAbierta>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const yo = usuario?.id ?? null;
  const nombreEnt = usuario?.entrenador ? `${usuario.entrenador.nombre} ${usuario.entrenador.apellido}`.trim() : null;

  if (carga.estado !== 'listo' || !carga.datos) {
    return (
      <Pantalla cabecera={<Cabecera atras />}>
        {carga.estado === 'error' ? (
          <ErrorCarga texto="No pudimos abrir esta rutina." onReintentar={carga.recargar} />
        ) : (
          <Esqueleto filas={3} etiqueta="Cargando la rutina" />
        )}
      </Pantalla>
    );
  }

  const r: Rutina = carga.datos.r;
  const clientes = carga.datos.clientes;
  const mia = esMia(r, yo);
  const autorNombre = r.duenoNombre ?? nombreEnt ?? 'tu entrenador';
  const corto = autorNombre.split(' ')[0] ?? autorNombre;
  const idxHoy = indiceDiaDeHoy(r.dias, hoy);
  const k = Math.min(Math.max(0, diaSel ?? (r.estado === 'activa' && idxHoy >= 0 ? idxHoy : 0)), Math.max(0, r.dias.length - 1));
  const d = r.dias[k];
  const semana = semanaActual(r, hoy);
  const metodo = metodoDe(r.metodo);
  const accion = accionDetalle(r, k, yo, rol, hoy);
  const plantilla = ent && mia && !r.alumnoId;
  const laTienen = clientes.filter((cl) => r.asignados.some((a) => a.id === cl.id) || cl.rutinaId === r.id);

  async function hacer(f: () => Promise<unknown>, exito: string, luego?: () => void) {
    setOcupado(true);
    try {
      await f();
      setHoja(null);
      aviso.mostrar(exito);
      if (luego) luego();
      else carga.recargar();
    } catch (e) {
      aviso.mostrar(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  const empezar = (dia: number) => {
    setHoja(null);
    const elegido = r.dias[dia];
    // El registro arranca desde Hoy, que arma la sesión con la sugerencia de cada ejercicio.
    router.navigate({ pathname: '/', params: elegido?.id ? { dia: elegido.id } : {} });
  };

  // ── Cabeza ─────────────────────────────────────────────────────────────────
  const marca =
    r.estado === 'activa' ? (
      <Marca texto="Activa" tono="acento" />
    ) : r.estado === 'archivada' ? (
      <Marca texto="Archivada" />
    ) : plantilla ? (
      <Marca texto="Tu biblioteca" />
    ) : (
      <Marca texto="Borrador · sin activar" />
    );

  const filaEjercicio = (e: EjercicioDeRutina, i: number) => {
    const corporal = e.tipoCarga !== 'kg';
    const carga = e.pesoSugeridoKg ?? e.pesoInicialKg;
    const sube = r.estado === 'activa' && e.pesoSugeridoKg !== null && e.pesoInicialKg !== null && e.pesoSugeridoKg > e.pesoInicialKg ? e.pesoSugeridoKg - e.pesoInicialKg : 0;
    const textoKg = corporal ? 'peso corporal' : ent ? `sube ${kg(e.incrementoKg)} kg` : carga !== null ? `${kg(carga)} kg` : '';
    return (
      <View key={e.id ?? `${e.ejercicioId}-${i}`} className={i ? 'border-t border-sup-alta' : ''}>
        <Pressable
          onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: e.ejercicioId } })}
          accessibilityRole="button"
          accessibilityLabel={`${e.nombre}, ${e.series} series de ${e.repsMin} a ${e.repsMax}, ${textoKg}`}
          className="min-h-[56px] flex-row items-center gap-3 py-2 active:bg-fantasma-pres"
        >
          <View className="flex-1">
            <Text className="font-sans-semibold text-[16px] text-texto">{e.nombre}</Text>
            <Txt v="sec">
              RIR {e.rir === 4 ? '4+' : e.rir} · descanso {reloj(e.descansoS)}
            </Txt>
          </View>
          <View className="items-end">
            <Text className="font-mono-bold text-[16px] text-texto">
              {e.series}
              <Text className="text-texto-2">×</Text>
              {e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`}
            </Text>
            <Text className="font-mono-bold text-[13px] text-texto-2">
              {sube ? <Text className="text-acento-texto">+{kg(sube)} </Text> : null}
              {textoKg}
            </Text>
          </View>
        </Pressable>
        {e.nota && (!mia || ent) ? (
          <Txt v="sec" className="-mt-1 mb-2 italic">
            {e.nota}
          </Txt>
        ) : null}
      </View>
    );
  };

  const ultima =
    r.estado === 'archivada'
      ? d?.ultimaVez
        ? `Última vez el ${fechaCorta(d.ultimaVez)} · cargas de esa sesión`
        : 'Cargas de la última sesión'
      : r.estado === 'activa'
        ? d?.ultimaVez
          ? `Última vez el ${fechaCorta(d.ultimaVez)} · cargas sugeridas para hoy`
          : 'Primera vez · cargas iniciales'
        : ent
          ? 'Cada cliente parte con su propia carga'
          : 'Cargas iniciales para la primera sesión';

  // ── Acción de abajo ────────────────────────────────────────────────────────
  let pie = null;
  if (accion.tipo === 'empezar' && d) pie = <Boton titulo={`Empezar ${d.nombre}`} alto ancho onPress={() => empezar(k)} />;
  else if (accion.tipo === 'cambiar' && d) {
    const diaHoy = accion.hoy >= 0 ? r.dias[accion.hoy] : undefined;
    pie = (
      <>
        <Txt v="sec" className="text-center">
          {diaHoy ? `Hoy toca ${diaHoy.nombre}` : 'Hoy no toca entrenar'}
        </Txt>
        <Boton titulo={`Hacer ${d.nombre} hoy`} variante="secundario" alto ancho onPress={() => setHoja('cambio')} />
      </>
    );
  } else if (accion.tipo === 'activar')
    pie = (
      <Boton
        titulo={r.estado === 'archivada' ? 'Activar de nuevo' : 'Activar rutina'}
        alto
        ancho
        disabled={carga.sinConexion}
        onPress={() => setHoja('activar')}
      />
    );
  else if (accion.tipo === 'duplicar')
    pie = (
      <Boton
        titulo="Duplicar como mía"
        variante="secundario"
        alto
        ancho
        disabled={carga.sinConexion}
        cargando={ocupado ? 'Duplicando…' : false}
        onPress={() => hacer(() => duplicarRutina(r.id), 'Copia guardada como borrador en tus rutinas.', () => router.replace('/rutinas'))}
      />
    );
  else if (accion.tipo === 'asignar' && plantilla)
    pie = (
      <Boton
        titulo="Asignar a clientes"
        alto
        ancho
        disabled={carga.sinConexion}
        onPress={() => {
          setSel([]);
          setHoja('asignar');
        }}
      />
    );

  return (
    <View className="flex-1 bg-fondo">
      <Pantalla
        cabecera={<Cabecera atras derecha={<BotonOpciones etiqueta="Opciones de la rutina" onPress={() => setHoja('menu')} />} />}
      >
        {carga.sinConexion ? <BandaSinConexion texto="Ves lo guardado en tu teléfono." /> : null}
        <View className="flex-row flex-wrap items-center gap-2">
          {marca}
          {!ent ? <Txt v="sec">{mia ? 'Tuya' : `De ${autorNombre}`}</Txt> : null}
        </View>
        <Txt v="titulo" className="mt-2" accessibilityRole="header">
          {r.nombre}
        </Txt>
        <ConCifras className="mt-1" partes={[`${metodo.nombre} · `, r.semanas, ' semanas · ', r.numDias, r.numDias === 1 ? ' día por semana' : ' días por semana']} />
        {r.estado === 'activa' ? (
          <>
            <Semanas total={r.semanas} actual={semana} />
            <ConCifras
              className="mt-2"
              partes={['Semana ', semana, ' de ', r.semanas, ...(r.activadaAt ? [` · empezó el ${fechaCorta(r.activadaAt)}`] : [])]}
            />
          </>
        ) : null}

        {r.estado === 'activa' && !mia && !ent ? (
          <View className="mt-4 flex-row items-start gap-2.5 rounded-control border border-sup-alta bg-sup px-3.5 py-3">
            <Icono nombre="candado" tamano={20} color={c['texto-2']} />
            <Text className="flex-1 font-sans-medium text-[14px] leading-[20px] text-texto">
              <Text className="font-sans-bold">Solo lectura. </Text>
              La arma {corto}. Si quieres cambiar algo, duplícala como tuya o pídeselo.
            </Text>
          </View>
        ) : null}

        {r.estado === 'archivada' && (r.sesiones !== null || r.volumenKg !== null) ? (
          <>
            <Separador
              titulo="Cuando la usaste"
              derecha={r.primeraSesion && r.ultimaSesion ? <Txt v="sec">{`${fechaCorta(r.primeraSesion)} a ${fechaCorta(r.ultimaSesion)}`}</Txt> : undefined}
            />
            <View className="flex-row gap-2">
              {r.sesiones !== null ? <CuadroCifra valor={String(r.sesiones)} leyenda="sesiones" /> : null}
              {r.adherenciaPct !== null ? <CuadroCifra valor={String(Math.round(r.adherenciaPct))} unidad="%" leyenda="adherencia" /> : null}
              {r.volumenKg !== null ? <CuadroCifra valor={kg(Math.round(r.volumenKg / 100) / 10)} unidad="t" leyenda="levantadas" /> : null}
            </View>
          </>
        ) : null}

        {ent && plantilla ? (
          <>
            <Separador titulo="La tienen" derecha={<Txt v="sec">{`${laTienen.length} ${laTienen.length === 1 ? 'cliente' : 'clientes'}`}</Txt>} />
            <Tarjeta className="py-1">
              {laTienen.length ? (
                laTienen.map((cl, i) => (
                  <Pressable
                    key={cl.id}
                    onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: cl.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={cl.nombre}
                    className={`min-h-[56px] flex-row items-center gap-3 ${i ? 'border-t border-sup-alta' : ''}`}
                  >
                    <Avatar texto={iniciales(cl.nombre)} tamano="chico" />
                    <Text className="flex-1 font-sans-semibold text-[16px] text-texto">{cl.nombre}</Text>
                    <Icono nombre="adelante" tamano={20} />
                  </Pressable>
                ))
              ) : (
                <Txt v="sec" className="py-3">
                  Todavía no la tiene nadie.
                </Txt>
              )}
            </Tarjeta>
          </>
        ) : null}

        <Separador titulo={r.estado === 'activa' ? 'Días' : 'Días del plan'} />
        {r.dias.length ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" accessibilityRole="tablist">
              {r.dias.map((x, i) => (
                <Pressable
                  key={x.id ?? i}
                  onPress={() => setDiaSel(i)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: i === k }}
                  accessibilityLabel={`${x.nombre}${r.estado === 'activa' && i === idxHoy ? ', hoy' : ''}`}
                  className={`min-h-[56px] min-w-[72px] justify-center rounded-control border-2 px-3 py-1.5 ${
                    i === k ? 'border-chip-fondo bg-chip-fondo' : 'border-borde bg-transparent'
                  }`}
                >
                  <Text className={`font-mono-bold text-[12px] ${i === k ? 'text-chip-texto' : 'text-texto-2'}`}>
                    {x.diaSemana ? LETRAS_DIA[x.diaSemana - 1] : i + 1}
                    {r.estado === 'activa' && i === idxHoy ? ' · hoy' : ''}
                  </Text>
                  <Text className={`font-sans-semibold text-[15px] ${i === k ? 'text-chip-texto' : 'text-texto'}`}>{x.nombre}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {d ? (
              <Tarjeta className="mt-3">
                <View className="flex-row items-center gap-2">
                  <Txt v="h2" className="flex-1">
                    {d.nombre}
                  </Txt>
                  {r.estado === 'activa' && k === idxHoy ? <Marca texto="Hoy" tono="llena" /> : null}
                </View>
                <Txt v="sec" className="mt-1">
                  {[
                    nombreDiaSemana(d.diaSemana),
                    `${d.ejercicios.length} ejercicios`,
                    `${seriesDelDia(d)} series`,
                    d.ejercicios.length ? `unos ${minutosDelDia(d)} min` : '',
                    r.estado === 'activa' && d.hechoSemana ? 'hecho esta semana' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
                <Txt v="sec">{ultima}</Txt>
                <View className="mt-2">{d.ejercicios.map(filaEjercicio)}</View>
              </Tarjeta>
            ) : null}
          </>
        ) : (
          <Txt v="sec">Esta rutina todavía no tiene días.</Txt>
        )}

        {r.descripcion ? (
          <>
            <Separador titulo={ent ? 'Nota para tus clientes' : mia ? 'Nota' : 'Nota de tu entrenador'} />
            <Tarjeta>
              {!mia && !ent ? (
                <View className="mb-3 flex-row items-center gap-3">
                  <Avatar texto={iniciales(autorNombre)} />
                  <Txt v="h3">{autorNombre}</Txt>
                </View>
              ) : null}
              <Txt v="cuerpo">{r.descripcion}</Txt>
            </Tarjeta>
          </>
        ) : null}

        <Tarjeta className="mt-6">
          <Txt v="h3">Cómo sube: {metodo.nombre.toLowerCase()}</Txt>
          {metodo.explica ? (
            <Txt v="sec" className="mt-1">
              {metodo.explica}
            </Txt>
          ) : null}
        </Tarjeta>
      </Pantalla>
      {pie ? <BarraAccion>{pie}</BarraAccion> : null}

      {/* Menú */}
      <Hoja visible={hoja === 'menu'} onCerrar={() => setHoja(null)} titulo={r.nombre}>
        <View className="-mx-4 mt-3">
          {ent ? (
            <>
              <FilaMenu
                titulo="Editar"
                nota={laTienen.length ? `Los cambios llegan a sus ${laTienen.length} clientes desde la próxima sesión` : undefined}
                onPress={() => {
                  setHoja(null);
                  router.push({ pathname: '/rutina/nueva', params: { editar: r.id } });
                }}
              />
              <FilaMenu
                titulo="Duplicar"
                nota="Crea una copia para variarla"
                disabled={carga.sinConexion || ocupado}
                onPress={() => hacer(() => duplicarRutina(r.id), `Duplicaste ${r.nombre}. La copia está en tu biblioteca.`)}
              />
              {r.estado !== 'archivada' ? (
                <FilaMenu
                  titulo="Archivar"
                  nota="Sale de tu biblioteca; sus clientes la siguen usando"
                  disabled={carga.sinConexion || ocupado}
                  onPress={() => hacer(() => archivarRutina(r.id), `Archivaste ${r.nombre}. Sus clientes la siguen usando.`)}
                />
              ) : null}
            </>
          ) : (
            accionesRutina(r, yo)
              .filter((a) => a !== 'ver' && a !== 'activar')
              .map((a) =>
                a === 'editar' ? (
                  <FilaMenu
                    key={a}
                    titulo="Editar"
                    nota={r.estado === 'activa' ? 'Los cambios corren desde tu próxima sesión' : undefined}
                    onPress={() => {
                      setHoja(null);
                      router.push({ pathname: '/rutina/nueva', params: { editar: r.id } });
                    }}
                  />
                ) : a === 'duplicar' ? (
                  <FilaMenu
                    key={a}
                    titulo={mia ? 'Duplicar' : 'Duplicar como mía'}
                    nota={mia ? 'Crea una copia en borrador' : 'Crea una copia tuya que sí puedes editar'}
                    disabled={carga.sinConexion || ocupado}
                    onPress={() => hacer(() => duplicarRutina(r.id), 'Copia guardada como borrador en tus rutinas.', () => router.replace('/rutinas'))}
                  />
                ) : a === 'archivar' ? (
                  <FilaMenu
                    key={a}
                    titulo="Archivar"
                    nota={r.estado === 'activa' ? 'Quedas sin rutina activa; el historial se guarda' : 'El historial se guarda'}
                    disabled={carga.sinConexion}
                    onPress={() => setHoja('archivar')}
                  />
                ) : (
                  <FilaMenu key={a} titulo="Eliminar borrador" nota="Nunca se usó, así que se borra" peligro disabled={carga.sinConexion} onPress={() => setHoja('eliminar')} />
                ),
              )
          )}
        </View>
        {!ent && !mia ? (
          <Txt v="sec" className="mt-3 text-[13px]">
            La armó {corto}: la puedes ver y duplicar, pero no editarla, activarla ni archivarla.
          </Txt>
        ) : null}
        <View className="mt-5 flex-row">
          <Boton titulo="Cerrar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
        </View>
      </Hoja>

      <Hoja
        visible={hoja === 'activar'}
        onCerrar={() => setHoja(null)}
        titulo={`¿Activar ${r.nombre}?`}
        texto="Empieza en la semana 1. Hoy y el registro usan esta rutina desde ahora. La que tenías activa queda archivada con su historial."
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Activar"
              alto
              className="flex-1"
              cargando={ocupado ? 'Activando…' : false}
              onPress={() => hacer(() => activarRutina(r.id), `${r.nombre} quedó activa. Empieza en la semana 1.`)}
            />
          </>
        }
      />

      <Hoja
        visible={hoja === 'archivar'}
        onCerrar={() => setHoja(null)}
        titulo={`¿Archivar ${r.nombre}?`}
        texto={
          r.estado === 'activa'
            ? 'Quedas sin rutina activa hasta que actives otra. Tus sesiones y récords se guardan.'
            : 'Tus sesiones y récords se guardan.'
        }
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Archivar"
              alto
              className="flex-1"
              cargando={ocupado ? 'Archivando…' : false}
              onPress={() =>
                hacer(() => archivarRutina(r.id), r.estado === 'activa' ? `Archivaste ${r.nombre}. Quedas sin rutina activa.` : `Archivaste ${r.nombre}.`)
              }
            />
          </>
        }
      />

      <Hoja
        visible={hoja === 'eliminar'}
        onCerrar={() => setHoja(null)}
        titulo="¿Eliminar el borrador?"
        texto={`${r.nombre} nunca se usó, así que se borra entera. No se puede deshacer.`}
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Eliminar"
              variante="peligro"
              alto
              className="flex-1"
              cargando={ocupado ? 'Eliminando…' : false}
              onPress={() => hacer(() => archivarRutina(r.id), `Eliminaste ${r.nombre}.`, () => router.replace('/rutinas'))}
            />
          </>
        }
      />

      <Hoja
        visible={hoja === 'cambio' && !!d}
        onCerrar={() => setHoja(null)}
        titulo={d ? `¿Hacer ${d.nombre} hoy?` : undefined}
        texto={[
          d?.hechoSemana ? 'Ya la hiciste esta semana.' : '',
          idxHoy >= 0 ? `${r.dias[idxHoy]?.nombre} queda pendiente para tu próximo día de entrenamiento.` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton titulo={d ? `Empezar ${d.nombre}` : 'Empezar'} alto className="flex-1" onPress={() => empezar(k)} />
          </>
        }
      />

      <HojaAsignar
        visible={hoja === 'asignar'}
        rutina={r}
        clientes={clientes}
        yaLaTienen={laTienen.map((x) => x.id)}
        sel={sel}
        onSel={setSel}
        reemplaza={sel.some((s) => clientes.find((x) => x.id === s)?.rutina)}
        ocupado={ocupado}
        onCerrar={() => setHoja(null)}
        onAsignar={() =>
          hacer(
            () => asignarRutina(r.id, sel),
            `Asignaste ${r.nombre} a ${listaNatural(clientes.filter((x) => sel.includes(x.id)).map((x) => x.nombre.split(' ')[0] ?? x.nombre))}. Les llega un aviso.`,
          )
        }
      />
    </View>
  );
}
