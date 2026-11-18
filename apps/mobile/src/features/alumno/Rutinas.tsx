// ─────────────────────────────────────────────────────────────────────────────
// Rutinas · Zona: Alumno (área Rutinas, PAN-06)
//
// Qué hace: la pestaña Rutinas como en docs/pantallas/rutinas.html. Para el alumno: la tarjeta de
// la rutina activa con sus semanas y días, los borradores, las archivadas, el estado vacío (o
// «tu entrenador está armando tu rutina») y la tarjeta para ingresar el código si entrena solo.
// Cada rutina tiene su hoja de opciones; la que armó el entrenador solo se ve y se duplica
// (APP-019). Para el entrenador: su biblioteca, con las asignadas, las sin asignar, las
// archivadas y la hoja para asignar a sus clientes (APP-020).
// Tócalo cuando: cambie lo que muestra la pestaña Rutinas o sus hojas.
// No lo toques para: el detalle de una rutina (./DetalleRutina.tsx) ni el editor (./EditorRutina.tsx).
// Depende de: ./api, ./logica, ./piezas, ./useCarga, @/components/ui y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Boton, Hoja, Icono, Separador, Tarjeta, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import {
  activarRutina,
  archivarRutina,
  asignarRutina,
  clientesEntrenador,
  duplicarRutina,
  listarRutinas,
  mensajeDeError,
} from './api';
import type { Rutina } from './datos';
import {
  accionesRutina,
  esMia,
  fechaCorta,
  iniciales,
  indiceDiaDeHoy,
  LETRAS_DIA,
  listaNatural,
  metodoDe,
  ordenarRutinas,
  semanaActual,
} from './logica';
import { Avatar, BandaSinConexion, BotonOpciones, ConCifras, ErrorCarga, Esqueleto, FilaElegible, FilaMenu, Marca, MarcoPestana, Semanas } from './piezas';
import { ahora, useCarga } from './useCarga';

type HojaAbierta = { tipo: 'opciones' | 'activar' | 'eliminar' | 'asignar'; id: string } | null;

export function PantallaRutinas() {
  const { rol } = useSesion();
  return rol === 'entrenador' ? <BibliotecaEntrenador /> : <RutinasAlumno />;
}

// ── Alumno ───────────────────────────────────────────────────────────────────
function RutinasAlumno() {
  const { usuario } = useSesion();
  const aviso = useAviso();
  const carga = useCarga('rutinas', listarRutinas);
  const [hoja, setHoja] = useState<HojaAbierta>(null);
  const [ocupado, setOcupado] = useState(false);
  const [hoy] = useState(ahora);
  const yo = usuario?.id ?? null;
  const ent = usuario?.entrenador ?? null;
  const nombreEnt = ent ? `${ent.nombre} ${ent.apellido}`.trim() : null;
  const rutinas = useMemo(() => carga.datos ?? [], [carga.datos]);
  const { activa, borradores, archivadas } = ordenarRutinas(rutinas);
  const elegida = hoja ? rutinas.find((r) => r.id === hoja.id) ?? null : null;
  const sinRed = carga.sinConexion;

  const autor = (r: Rutina) => (esMia(r, yo) ? 'Tuya' : `De ${r.duenoNombre ?? nombreEnt ?? 'tu entrenador'}`);
  const autorCorto = (r: Rutina) => (esMia(r, yo) ? 'Tuya' : `De ${(r.duenoNombre ?? nombreEnt ?? 'tu entrenador').split(' ')[0]}`);

  async function hacer(accion: () => Promise<unknown>, exito: string) {
    setOcupado(true);
    try {
      await accion();
      setHoja(null);
      aviso.mostrar(exito);
      carga.recargar();
    } catch (e) {
      aviso.mostrar(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  const abrir = (r: Rutina, dia?: number) =>
    router.push({ pathname: '/rutina/[id]', params: dia !== undefined ? { id: r.id, dia: String(dia) } : { id: r.id } });

  let principal: ReactNode = null;
  if (carga.estado === 'cargando') principal = <Esqueleto filas={2} etiqueta="Cargando rutinas" />;
  else if (carga.estado === 'error') principal = <ErrorCarga texto="No pudimos cargar tus rutinas." onReintentar={carga.recargar} />;
  else if (activa) {
    const semana = semanaActual(activa, hoy);
    const idxHoy = indiceDiaDeHoy(activa.dias, hoy);
    principal = (
      <Tarjeta className="mb-2">
        <View className="-mr-3 -mt-3 flex-row items-center justify-between">
          <Txt v="cejaAcento">Activa</Txt>
          <BotonOpciones etiqueta={`Opciones de ${activa.nombre}`} onPress={() => setHoja({ tipo: 'opciones', id: activa.id })} />
        </View>
        <Txt v="h2">{activa.nombre}</Txt>
        <Txt v="sec" className="mt-1">
          {autor(activa)} · {metodoDe(activa.metodo).nombre}
        </Txt>
        <Semanas total={activa.semanas} actual={semana} />
        <ConCifras
          className="mt-2"
          partes={['Semana ', semana, ' de ', activa.semanas, ' · ', activa.numDias, activa.numDias === 1 ? ' día por semana' : ' días por semana']}
        />
        <View className="mt-3">
          {activa.dias.map((d, i) => (
            <Pressable
              key={d.id ?? i}
              onPress={() => abrir(activa, i)}
              accessibilityRole="button"
              accessibilityLabel={`${d.nombre}${i === idxHoy ? ', hoy' : ''}${d.hechoSemana ? ', hecho esta semana' : ''}`}
              className={`min-h-[56px] flex-row items-center gap-3 ${i ? 'border-t border-sup-alta' : ''} active:bg-fantasma-pres`}
            >
              <Text className="w-6 font-mono-bold text-[14px] text-texto-2">{d.diaSemana ? LETRAS_DIA[d.diaSemana - 1] : i + 1}</Text>
              <Text className="flex-1 font-sans-semibold text-[16px] text-texto">{d.nombre}</Text>
              {d.hechoSemana ? (
                <View className="h-6 w-6 items-center justify-center rounded-[4px] bg-hecho-fondo">
                  <Icono nombre="visto" tamano={16} />
                </View>
              ) : i === idxHoy ? (
                <Marca texto="Hoy" tono="llena" />
              ) : null}
              <Icono nombre="adelante" tamano={20} />
            </Pressable>
          ))}
        </View>
        <Boton titulo="Ver plan" variante="secundario" ancho className="mt-3" onPress={() => abrir(activa)} />
      </Tarjeta>
    );
  } else if (!rutinas.length && ent) {
    principal = (
      <Tarjeta>
        <View className="flex-row items-center gap-3">
          <Avatar texto={iniciales(ent.nombre, ent.apellido)} />
          <View>
            <Txt v="h3">{nombreEnt}</Txt>
            <Txt v="sec">Te entrena</Txt>
          </View>
        </View>
        <Txt v="h2" className="mt-4">
          {ent.nombre} está armando tu rutina
        </Txt>
        <Txt v="sec" className="mt-2">
          Ya tiene tu encuesta. Cuando la active, aparece aquí y en Hoy. Te avisamos con una notificación.
        </Txt>
      </Tarjeta>
    );
  } else if (!rutinas.length) {
    principal = (
      <Tarjeta>
        <Txt v="h2">Todavía no tienes rutinas</Txt>
        <Txt v="sec" className="mt-2">
          Una rutina son tus días de entrenamiento y lo que haces en cada uno. La app te sugiere cuánto subir cada semana.
        </Txt>
        <Pasos
          pasos={['Ponle nombre y elige cómo progresar.', 'Arma los días, por ejemplo Empuje A o Pierna.', 'Agrega ejercicios con series y repeticiones.']}
        />
      </Tarjeta>
    );
  } else {
    principal = (
      <Tarjeta>
        <Txt v="ceja">Sin rutina activa</Txt>
        <Txt v="h2" className="mt-1">
          Elige con qué seguir
        </Txt>
        <Txt v="sec" className="mt-2">
          Activa una de tus rutinas o crea una nueva. Mientras, Hoy queda sin plan.
        </Txt>
      </Tarjeta>
    );
  }

  const filaRutina = (r: Rutina, i: number) => (
    <View key={r.id} className={`min-h-[56px] flex-row items-center ${i ? 'border-t border-sup-alta' : ''}`}>
      <Pressable onPress={() => abrir(r)} accessibilityRole="button" accessibilityLabel={r.nombre} className="flex-1 py-3 active:bg-fantasma-pres">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-sans-semibold text-[16px] text-texto">{r.nombre}</Text>
          {r.estado === 'borrador' ? <Marca texto="Borrador" /> : null}
        </View>
        <Txt v="sec" className="mt-0.5">
          {r.estado === 'borrador'
            ? `Tuya · sin activar · ${r.numDias} ${r.numDias === 1 ? 'día' : 'días'}`
            : [autorCorto(r), rangoFechas(r), r.sesiones !== null ? `${r.sesiones} sesiones` : ''].filter(Boolean).join(' · ')}
        </Txt>
      </Pressable>
      <BotonOpciones etiqueta={`Opciones de ${r.nombre}`} onPress={() => setHoja({ tipo: 'opciones', id: r.id })} />
    </View>
  );

  const listaSeccion = (titulo: string, rs: Rutina[]) =>
    rs.length ? (
      <>
        <Separador titulo={titulo} derecha={<Txt v="cifraSec">{String(rs.length)}</Txt>} />
        <Tarjeta className="py-0">{rs.map(filaRutina)}</Tarjeta>
      </>
    ) : null;

  const destacado = !ent || !activa;
  return (
    <MarcoPestana
      titulo="Rutinas"
      accion={
        carga.estado === 'cargando' ? null : (
          <Boton
            titulo="Crear rutina"
            alto
            ancho
            variante={destacado && !(ent && !rutinas.length) ? 'primario' : 'secundario'}
            onPress={() => router.push('/rutina/nueva')}
          />
        )
      }
    >
      {sinRed ? <BandaSinConexion texto="Ves lo guardado en tu teléfono. Activar, duplicar y archivar vuelven con la señal." /> : null}
      {principal}
      {carga.estado === 'listo' ? (
        <>
          {listaSeccion('Borradores', borradores)}
          {listaSeccion('Archivadas', archivadas)}
          {!ent ? (
            <>
              <Separador titulo="¿Entrenas con alguien?" />
              <Tarjeta>
                <Txt v="sec">Si tu entrenador te dio un código de 6 caracteres, ingrésalo: así te arma la rutina y la ves aquí.</Txt>
                <Boton
                  titulo="Ingresar código"
                  variante="secundario"
                  ancho
                  className="mt-3"
                  onPress={() => router.push({ pathname: '/perfil', params: { vincular: '1' } })}
                />
              </Tarjeta>
            </>
          ) : null}
        </>
      ) : null}

      {/* Hoja de opciones */}
      <Hoja visible={hoja?.tipo === 'opciones' && !!elegida} onCerrar={() => setHoja(null)} titulo={elegida?.nombre}>
        {elegida ? (
          <>
            <Txt v="sec" className="mt-1">
              {autor(elegida)} · {elegida.estado === 'activa' ? 'activa' : elegida.estado === 'borrador' ? 'borrador' : 'archivada'}
            </Txt>
            <View className="-mx-4 mt-3">
              {accionesRutina(elegida, yo).map((a) => {
                if (a === 'ver') return <FilaMenu key={a} titulo="Ver plan" onPress={() => (setHoja(null), abrir(elegida))} />;
                if (a === 'activar')
                  return (
                    <FilaMenu
                      key={a}
                      titulo="Activar"
                      nota={activa ? `${activa.nombre} queda archivada` : undefined}
                      disabled={sinRed}
                      onPress={() => setHoja({ tipo: 'activar', id: elegida.id })}
                    />
                  );
                if (a === 'editar')
                  return (
                    <FilaMenu
                      key={a}
                      titulo="Editar"
                      onPress={() => {
                        setHoja(null);
                        router.push({ pathname: '/rutina/nueva', params: { editar: elegida.id } });
                      }}
                    />
                  );
                if (a === 'duplicar') {
                  const mia = esMia(elegida, yo);
                  return (
                    <FilaMenu
                      key={a}
                      titulo={mia ? 'Duplicar' : 'Duplicar como mía'}
                      nota={mia ? 'Crea una copia en borrador' : 'Crea una copia tuya que sí puedes editar'}
                      disabled={sinRed || ocupado}
                      onPress={() => hacer(() => duplicarRutina(elegida.id), 'Copia guardada como borrador. Edítala y actívala cuando quieras.')}
                    />
                  );
                }
                if (a === 'eliminar')
                  return (
                    <FilaMenu key={a} titulo="Eliminar borrador" nota="Nunca se usó, así que se borra" peligro disabled={sinRed} onPress={() => setHoja({ tipo: 'eliminar', id: elegida.id })} />
                  );
                return (
                  <FilaMenu
                    key={a}
                    titulo="Archivar"
                    nota="El historial se guarda"
                    disabled={sinRed || ocupado}
                    onPress={() =>
                      hacer(
                        () => archivarRutina(elegida.id),
                        elegida.estado === 'activa' ? `Archivaste ${elegida.nombre}. Quedas sin rutina activa.` : `Archivaste ${elegida.nombre}.`,
                      )
                    }
                  />
                );
              })}
            </View>
            {!esMia(elegida, yo) ? (
              <Txt v="sec" className="mt-3 text-[13px]">
                La armó {(elegida.duenoNombre ?? nombreEnt ?? 'tu entrenador').split(' ')[0]}: la puedes ver y duplicar, pero no editarla, activarla ni archivarla. Si quieres un cambio, pídeselo.
              </Txt>
            ) : null}
            {sinRed ? (
              <Txt v="sec" className="mt-3 text-[13px]">
                Sin conexión: lo que está gris vuelve cuando haya señal.
              </Txt>
            ) : null}
          </>
        ) : null}
        <View className="mt-5 flex-row">
          <Boton titulo="Cerrar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
        </View>
      </Hoja>

      {/* Confirmar activar */}
      <Hoja
        visible={hoja?.tipo === 'activar' && !!elegida}
        onCerrar={() => setHoja(null)}
        titulo={elegida ? `¿Activar ${elegida.nombre}?` : undefined}
        texto={
          activa && elegida
            ? `${activa.nombre} queda archivada con su historial.${!esMia(activa, yo) ? ` Como la armó ${(activa.duenoNombre ?? nombreEnt ?? 'tu entrenador').split(' ')[0]}, le avisamos del cambio.` : ''}`
            : 'Empieza en la semana 1. Hoy y el registro usan esta rutina desde ahora.'
        }
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Activar"
              alto
              className="flex-1"
              cargando={ocupado ? 'Activando…' : false}
              onPress={() =>
                elegida &&
                hacer(
                  () => activarRutina(elegida.id),
                  activa ? `${elegida.nombre} quedó activa. ${activa.nombre} pasó a archivadas.` : `${elegida.nombre} quedó activa.`,
                )
              }
            />
          </>
        }
      />

      {/* Confirmar eliminar borrador */}
      <Hoja
        visible={hoja?.tipo === 'eliminar' && !!elegida}
        onCerrar={() => setHoja(null)}
        titulo="¿Eliminar el borrador?"
        texto={elegida ? `${elegida.nombre} nunca se usó, así que se borra entera. No se puede deshacer.` : undefined}
        acciones={
          <>
            <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
            <Boton
              titulo="Eliminar"
              variante="peligro"
              alto
              className="flex-1"
              cargando={ocupado ? 'Eliminando…' : false}
              onPress={() => elegida && hacer(() => archivarRutina(elegida.id), `Eliminaste ${elegida.nombre}.`)}
            />
          </>
        }
      />
    </MarcoPestana>
  );
}

function rangoFechas(r: Rutina): string {
  const desde = r.primeraSesion ?? r.activadaAt;
  const hasta = r.ultimaSesion;
  if (desde && hasta) return `${fechaCorta(desde)} a ${fechaCorta(hasta)}`;
  if (!r.sesiones) return 'sin sesiones';
  return desde ? `desde el ${fechaCorta(desde)}` : '';
}

/** Lista numerada de pasos del estado vacío. */
export function Pasos({ pasos }: { pasos: string[] }) {
  return (
    <View className="mt-4 gap-3">
      {pasos.map((p, i) => (
        <View key={p} className="flex-row items-start gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-control bg-sup-alta">
            <Text className="font-mono-bold text-[14px] text-texto">{i + 1}</Text>
          </View>
          <Txt v="cuerpo" className="flex-1 pt-0.5">
            {p}
          </Txt>
        </View>
      ))}
    </View>
  );
}

// ── Entrenador ───────────────────────────────────────────────────────────────
type Cliente = { id: string; nombre: string; rutina: string | null; rutinaId: string | null };

async function cargarBiblioteca() {
  const [rutinas, clientes] = await Promise.all([listarRutinas(), clientesEntrenador().catch(() => [] as Cliente[])]);
  return { rutinas, clientes };
}

function BibliotecaEntrenador() {
  const { usuario } = useSesion();
  const aviso = useAviso();
  const carga = useCarga('biblioteca', cargarBiblioteca);
  const [hoja, setHoja] = useState<HojaAbierta>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const rutinas = useMemo(() => carga.datos?.rutinas ?? [], [carga.datos]);
  const clientes = useMemo(() => carga.datos?.clientes ?? [], [carga.datos]);
  const yo = usuario?.id ?? null;
  // La biblioteca son las plantillas (sin cliente); las copias asignadas cuelgan de su origen.
  const plantillas = rutinas.filter((r) => !r.alumnoId && esMia(r, yo));
  const vivas = plantillas.filter((r) => r.estado !== 'archivada');
  const archivadas = plantillas.filter((r) => r.estado === 'archivada');
  const clientesDe = (r: Rutina): Cliente[] => {
    if (r.asignados.length) return r.asignados.map((a) => clientes.find((c) => c.id === a.id) ?? { ...a, rutina: r.nombre, rutinaId: null });
    const copias = rutinas.filter((x) => x.origenId === r.id && x.estado === 'activa' && x.alumnoId).map((x) => x.alumnoId);
    return clientes.filter((c) => copias.includes(c.id) || (c.rutinaId !== null && c.rutinaId === r.id));
  };
  const sinRutina = clientes.filter((c) => !c.rutina);
  const conRutina = clientes.length - sinRutina.length;
  const asignadas = vivas.filter((r) => clientesDe(r).length);
  const libres = vivas.filter((r) => !clientesDe(r).length);
  const elegida = hoja ? plantillas.find((r) => r.id === hoja.id) ?? null : null;

  async function hacer(accion: () => Promise<unknown>, exito: string) {
    setOcupado(true);
    try {
      await accion();
      setHoja(null);
      setSel([]);
      aviso.mostrar(exito);
      carga.recargar();
    } catch (e) {
      aviso.mostrar(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  const abrir = (r: Rutina) => router.push({ pathname: '/rutina/[id]', params: { id: r.id } });
  const meta = (r: Rutina) => `${metodoDe(r.metodo).nombre} · ${r.numDias} días · ${r.semanas} semanas`;

  const tarjetaAsignada = (r: Rutina) => {
    const cl = clientesDe(r);
    return (
      <Tarjeta key={r.id} className="mb-2 flex-row items-start py-2 pr-1">
        <Pressable onPress={() => abrir(r)} accessibilityRole="button" accessibilityLabel={r.nombre} className="flex-1 py-1">
          <Text className="font-sans-semibold text-[16px] text-texto">{r.nombre}</Text>
          <Txt v="sec" className="mt-0.5">
            {meta(r)}
          </Txt>
          <View className="mt-3 flex-row items-center gap-1">
            {cl.slice(0, 5).map((c) => (
              <Avatar key={c.id} texto={iniciales(c.nombre)} tamano="chico" />
            ))}
            {cl.length > 5 ? <Avatar texto={`+${cl.length - 5}`} tamano="chico" /> : null}
            <Txt v="sec" className="ml-2">
              {cl.length} {cl.length === 1 ? 'cliente' : 'clientes'}
            </Txt>
          </View>
        </Pressable>
        <BotonOpciones etiqueta={`Opciones de ${r.nombre}`} onPress={() => setHoja({ tipo: 'opciones', id: r.id })} />
      </Tarjeta>
    );
  };

  const fila = (r: Rutina, i: number, archivada = false) => (
    <View key={r.id} className={`min-h-[56px] flex-row items-center ${i ? 'border-t border-sup-alta' : ''}`}>
      <Pressable onPress={() => abrir(r)} accessibilityRole="button" accessibilityLabel={r.nombre} className="flex-1 py-3">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-sans-semibold text-[16px] text-texto">{r.nombre}</Text>
          {archivada ? <Marca texto="Archivada" /> : null}
        </View>
        <Txt v="sec" className="mt-0.5">
          {archivada ? `${metodoDe(r.metodo).nombre} · ${r.numDias} días` : meta(r)}
        </Txt>
      </Pressable>
      <BotonOpciones etiqueta={`Opciones de ${r.nombre}`} onPress={() => setHoja({ tipo: 'opciones', id: r.id })} />
    </View>
  );

  const nudge = (n: number, titulo: string, detalle: string) => (
    <Pressable
      onPress={() => router.push('/entrenador')}
      accessibilityRole="button"
      accessibilityLabel={`${n} ${titulo}. ${detalle}`}
      className="mt-2 min-h-[64px] flex-row items-center gap-3 rounded-control border border-hecho-borde bg-fila-hecha px-4 py-3 active:opacity-80"
    >
      <Text className="font-mono-bold text-[24px] text-acento-texto">{n}</Text>
      <View className="flex-1">
        <Text className="font-sans-bold text-[15px] text-texto">{titulo}</Text>
        <Txt v="sec">{detalle}</Txt>
      </View>
      <Icono nombre="adelante" tamano={20} />
    </Pressable>
  );

  const cl = elegida ? clientesDe(elegida) : [];
  const reemplaza = sel.some((id) => clientes.find((c) => c.id === id)?.rutina);

  return (
    <MarcoPestana titulo="Rutinas" accion={<Boton titulo="Crear rutina" alto ancho onPress={() => router.push('/rutina/nueva')} />}>
      {carga.sinConexion ? <BandaSinConexion texto="Ves lo guardado en tu teléfono. Asignar y archivar vuelven con la señal." /> : null}
      {carga.estado === 'cargando' ? <Esqueleto filas={3} etiqueta="Cargando tu biblioteca" /> : null}
      {carga.estado === 'error' ? <ErrorCarga texto="No pudimos cargar tu biblioteca." onReintentar={carga.recargar} /> : null}
      {carga.estado === 'listo' && !plantillas.length ? (
        <>
          <Tarjeta>
            <Txt v="ceja">Tu biblioteca</Txt>
            <Txt v="h2" className="mt-1">
              Arma tu primera rutina
            </Txt>
            <Txt v="sec" className="mt-2">
              La creas una vez y se la asignas a los clientes que quieras. Cada uno la lleva a su ritmo y tú ves su avance.
            </Txt>
            <Pasos
              pasos={['Crea la rutina con sus días y ejercicios.', 'Asígnala desde aquí o desde la ficha del cliente.', 'Ajusta las cargas cuando lo necesite.']}
            />
          </Tarjeta>
          {clientes.length ? (
            <>
              <Separador titulo="Tus clientes" />
              {nudge(clientes.length, 'Sin rutina asignada', 'Todos esperan su primera rutina.')}
            </>
          ) : null}
        </>
      ) : null}
      {carga.estado === 'listo' && plantillas.length ? (
        <>
          <ConCifras
            partes={['Tu biblioteca · ', vivas.length, ' rutinas', ...(clientes.length ? [' · ', conRutina, ' de ', clientes.length, ' clientes con rutina'] : [])]}
          />
          {sinRutina.length
            ? nudge(sinRutina.length, sinRutina.length === 1 ? 'Cliente sin rutina' : 'Clientes sin rutina', listaNatural(sinRutina.map((c) => c.nombre.split(' ')[0] ?? c.nombre)))
            : null}
          {asignadas.length ? (
            <>
              <Separador titulo="Asignadas" />
              {asignadas.map(tarjetaAsignada)}
            </>
          ) : null}
          {libres.length ? (
            <>
              <Separador titulo="Sin asignar" />
              <Tarjeta className="py-0">{libres.map((r, i) => fila(r, i))}</Tarjeta>
            </>
          ) : null}
          {archivadas.length ? (
            <>
              <Pressable
                onPress={() => setVerArchivadas((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: verArchivadas }}
                className="mt-4 min-h-[48px] flex-row items-center gap-2 self-start rounded-control px-3 active:bg-fantasma-pres"
              >
                <ConCifras partes={['Archivadas ', archivadas.length]} className="text-texto" />
                <Icono nombre={verArchivadas ? 'arriba' : 'abajo'} tamano={20} />
              </Pressable>
              {verArchivadas ? <Tarjeta className="py-0">{archivadas.map((r, i) => fila(r, i, true))}</Tarjeta> : null}
            </>
          ) : null}
        </>
      ) : null}

      <Hoja visible={hoja?.tipo === 'opciones' && !!elegida} onCerrar={() => setHoja(null)} titulo={elegida?.nombre}>
        {elegida ? (
          <>
            <Txt v="sec" className="mt-1">
              {meta(elegida)}
            </Txt>
            <View className="-mx-4 mt-3">
              <FilaMenu titulo="Ver plan" onPress={() => (setHoja(null), abrir(elegida))} />
              {elegida.estado !== 'archivada' ? (
                <FilaMenu
                  titulo="Asignar a clientes"
                  nota={cl.length ? `La tienen ${cl.length} ${cl.length === 1 ? 'cliente' : 'clientes'}` : 'Todavía no la tiene nadie'}
                  disabled={carga.sinConexion}
                  onPress={() => {
                    setSel([]);
                    setHoja({ tipo: 'asignar', id: elegida.id });
                  }}
                />
              ) : null}
              <FilaMenu
                titulo="Editar"
                nota={cl.length ? 'Los cambios llegan a sus clientes desde la próxima sesión' : undefined}
                onPress={() => {
                  setHoja(null);
                  router.push({ pathname: '/rutina/nueva', params: { editar: elegida.id } });
                }}
              />
              <FilaMenu
                titulo="Duplicar"
                nota="Crea una copia para variarla"
                disabled={carga.sinConexion || ocupado}
                onPress={() => hacer(() => duplicarRutina(elegida.id), `Duplicaste ${elegida.nombre}. La copia está en Sin asignar.`)}
              />
              {elegida.estado !== 'archivada' ? (
                <FilaMenu
                  titulo="Archivar"
                  nota={cl.length ? 'Sale de tu biblioteca; sus clientes la siguen usando' : 'Sale de tu biblioteca'}
                  disabled={carga.sinConexion || ocupado}
                  onPress={() => hacer(() => archivarRutina(elegida.id), `Archivaste ${elegida.nombre}.`)}
                />
              ) : null}
            </View>
          </>
        ) : null}
        <View className="mt-5 flex-row">
          <Boton titulo="Cerrar" variante="secundario" alto className="flex-1" onPress={() => setHoja(null)} />
        </View>
      </Hoja>

      <HojaAsignar
        visible={hoja?.tipo === 'asignar' && !!elegida}
        rutina={elegida}
        clientes={clientes}
        yaLaTienen={cl.map((c) => c.id)}
        sel={sel}
        onSel={setSel}
        reemplaza={reemplaza}
        ocupado={ocupado}
        onCerrar={() => setHoja(null)}
        onAsignar={() =>
          elegida &&
          hacer(
            () => asignarRutina(elegida.id, sel),
            `Asignaste ${elegida.nombre} a ${listaNatural(clientes.filter((c) => sel.includes(c.id)).map((c) => c.nombre.split(' ')[0] ?? c.nombre))}. Les llega un aviso.`,
          )
        }
      />
    </MarcoPestana>
  );
}

/** La hoja para asignar una rutina a clientes (Rutinas y Detalle de rutina del entrenador). */
export function HojaAsignar({
  visible,
  rutina,
  clientes,
  yaLaTienen,
  sel,
  onSel,
  reemplaza,
  ocupado,
  onCerrar,
  onAsignar,
}: {
  visible: boolean;
  rutina: Rutina | null;
  clientes: Cliente[];
  yaLaTienen: string[];
  sel: string[];
  onSel: (s: string[]) => void;
  reemplaza: boolean;
  ocupado: boolean;
  onCerrar: () => void;
  onAsignar: () => void;
}) {
  const fila = (c: Cliente) => {
    const ya = yaLaTienen.includes(c.id);
    const marcado = ya || sel.includes(c.id);
    return (
      <FilaElegible
        key={c.id}
        titulo={c.nombre}
        detalle={ya ? 'Ya la tiene' : c.rutina ? `Tiene ${c.rutina}` : 'Sin rutina'}
        marcada={marcado}
        disabled={ya}
        izquierda={<Avatar texto={iniciales(c.nombre)} tamano="chico" />}
        onPress={() => onSel(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])}
      />
    );
  };
  const grupo = (t: string, l: Cliente[]) =>
    l.length ? (
      <View key={t}>
        <Txt v="ceja" className="mt-3">
          {t}
        </Txt>
        {l.map(fila)}
      </View>
    ) : null;
  return (
    <Hoja
      visible={visible}
      onCerrar={onCerrar}
      titulo={rutina ? `Asignar ${rutina.nombre}` : undefined}
      texto={`Se activa de inmediato y empieza en la semana 1.${reemplaza ? ' La rutina que tenían queda archivada con su historial.' : ''}`}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={onCerrar} />
          <Boton
            titulo={sel.length ? `Asignar a ${sel.length}` : 'Elige clientes'}
            alto
            className="flex-1"
            disabled={!sel.length}
            cargando={ocupado ? 'Asignando…' : false}
            onPress={onAsignar}
          />
        </>
      }
    >
      <View style={{ maxHeight: 380 }}>
        {clientes.length ? (
          <ScrollView className="mt-2">
            {grupo('Sin rutina', clientes.filter((c) => !c.rutina && !yaLaTienen.includes(c.id)))}
            {grupo('Con otra rutina', clientes.filter((c) => c.rutina && !yaLaTienen.includes(c.id)))}
            {grupo('Ya la tienen', clientes.filter((c) => yaLaTienen.includes(c.id)))}
          </ScrollView>
        ) : (
          <Txt v="sec" className="mt-3">
            Todavía no tienes clientes vinculados. Invítalos con tu código desde Perfil.
          </Txt>
        )}
      </View>
    </Hoja>
  );
}
