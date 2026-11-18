// ─────────────────────────────────────────────────────────────────────────────
// Progreso · Zona: Alumno (área Progreso, PAN-14)
//
// Qué hace: la pestaña de docs/pantallas/progreso.html con sus tres vistas. Fuerza: el volumen de
// la última semana completa frente a la anterior, el gráfico de 8 semanas (la en curso punteada)
// y los récords vigentes; con menos de 3 sesiones, el estado vacío. Peso: el actual, el cambio en
// 30 días y la tendencia por semana desde el tercer registro (APP-033), el gráfico y el
// historial, con la hoja «Registrar peso» de 0,1 en 0,1. Medidas: los cinco perímetros con su
// diferencia y su línea de tendencia desde el tercer registro (APP-051), las fotos por fecha
// (privadas) y las hojas para registrar medidas, agregar y comparar fotos.
// Tócalo cuando: cambie lo que muestra Progreso o una de sus hojas.
// No lo toques para: los cálculos de tendencia (./logica.ts) ni cómo se dibujan los gráficos (./graficos.tsx).
// Depende de: ./api, ./logica, ./graficos, ./piezas, ./useCarga, @/components/ui y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Boton, Chip, Hoja, Icono, Paso, Separador, Simbolo, Tarjeta, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { useTema } from '@/lib/tema';
import { fotosProgreso, medidasCorporales, mensajeDeError, recordsVigentes, registrarMedida, volumenSemanas } from './api';
import type { Foto, Medida, RecordPersonal, SemanaVolumen, TomaFoto } from './datos';
import { BarrasVolumen, Chispa, LineaTiempo } from './graficos';
import {
  aFecha,
  cambio30Dias,
  cifra1,
  conPerimetros,
  cuerpoMedidas,
  diaIso,
  fechaConDia,
  fechaCorta,
  fechaLarga,
  firmado,
  hayTendencia,
  MINIMO_TENDENCIA,
  PARTES_MEDIDA,
  pesosDe,
  tendenciaSemanal,
  textoSinTendenciaPeso,
  type ParteMedida,
} from './logica';
import { enviarMotivosPendientes } from './Motivos';
import { BandaSinConexion, ConCifras, ErrorCarga, Esqueleto, MarcoPestana } from './piezas';
import { ahora, useCarga } from './useCarga';

type Vista = 'fuerza' | 'peso' | 'medidas';
const VISTAS: { id: Vista; nombre: string }[] = [
  { id: 'fuerza', nombre: 'Fuerza' },
  { id: 'peso', nombre: 'Peso' },
  { id: 'medidas', nombre: 'Medidas' },
];
const TOMAS: { id: TomaFoto; nombre: string }[] = [
  { id: 'frente', nombre: 'Frente' },
  { id: 'lado', nombre: 'Lado' },
  { id: 'espalda', nombre: 'Espalda' },
];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const kg = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

interface DatosProgreso {
  semanas: SemanaVolumen[];
  records: RecordPersonal[];
  medidas: Medida[];
  fotos: Foto[];
}

/** Pide las cuatro listas por separado: si una ruta falla, las otras igual se ven. */
async function cargarProgreso(): Promise<DatosProgreso> {
  const r = await Promise.allSettled([volumenSemanas(8), recordsVigentes(), medidasCorporales(), fotosProgreso()]);
  if (r.every((x) => x.status === 'rejected')) throw (r[0] as PromiseRejectedResult).reason;
  const v = <T,>(x: PromiseSettledResult<T>, d: T) => (x.status === 'fulfilled' ? x.value : d);
  return { semanas: v(r[0], []), records: v(r[1], []), medidas: v(r[2], []), fotos: v(r[3], []) };
}

export function PantallaProgreso({ vistaInicial }: { vistaInicial?: Vista }) {
  const { usuario } = useSesion();
  const aviso = useAviso();
  const carga = useCarga('progreso', () => {
    // Si quedaron motivos de una baja sin enviar por falta de señal, se mandan ahora.
    enviarMotivosPendientes(usuario?.id).catch(() => {});
    return cargarProgreso();
  });
  const [vista, setVista] = useState<Vista>(vistaInicial ?? 'fuerza');
  const [hoy] = useState(ahora);
  const [hoja, setHoja] = useState<'peso' | 'medidas' | 'foto' | 'comparar' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const d = carga.datos;
  const nombreEnt = usuario?.entrenador?.nombre ?? null;
  const sinRed = carga.sinConexion;

  async function guardar(cuerpo: object, exito: string, local: Medida) {
    setGuardando(true);
    try {
      await registrarMedida(cuerpo);
      // Una fila por día: la segunda del mismo día reemplaza (se mezcla con lo que había).
      carga.poner((x) => {
        if (!x) return x;
        const previa = x.medidas.find((m) => m.fecha === local.fecha);
        const nueva = previa ? { ...previa, ...Object.fromEntries(Object.entries(local).filter(([, val]) => val !== null)) } : local;
        return { ...x, medidas: [...x.medidas.filter((m) => m.fecha !== local.fecha), nueva as Medida].sort((a, b) => a.fecha.localeCompare(b.fecha)) };
      });
      setHoja(null);
      aviso.mostrar(exito);
    } catch (e) {
      aviso.mostrar(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  let cuerpo = null;
  if (carga.estado === 'cargando') cuerpo = <Esqueleto filas={3} etiqueta="Cargando tu progreso" />;
  else if (carga.estado === 'error' || !d) cuerpo = <ErrorCarga texto="No pudimos cargar tu progreso." onReintentar={carga.recargar} />;
  else if (vista === 'fuerza') cuerpo = <VistaFuerza semanas={d.semanas} records={d.records} hoy={hoy} />;
  else if (vista === 'peso') cuerpo = <VistaPeso medidas={d.medidas} hoy={hoy} />;
  else cuerpo = <VistaMedidas medidas={d.medidas} fotos={d.fotos} hoy={hoy} nombreEnt={nombreEnt} onHoja={setHoja} />;

  const pesos = d ? pesosDe(d.medidas) : [];
  const ultimaMedida = d ? conPerimetros(d.medidas).slice(-1)[0] : undefined;

  return (
    <MarcoPestana
      titulo="Progreso"
      arriba={
        <View className="flex-row gap-2" accessibilityRole="tablist">
          {VISTAS.map((v) => (
            <Chip key={v.id} titulo={v.nombre} activo={vista === v.id} onPress={() => setVista(v.id)} />
          ))}
        </View>
      }
      accion={
        carga.estado !== 'listo' ? null : vista === 'peso' ? (
          <Boton titulo="Registrar peso" alto ancho disabled={sinRed} onPress={() => setHoja('peso')} />
        ) : vista === 'medidas' ? (
          <Boton titulo="Registrar medidas" alto ancho disabled={sinRed} onPress={() => setHoja('medidas')} />
        ) : null
      }
    >
      {sinRed ? <BandaSinConexion texto="Ves lo guardado en tu teléfono. Para registrar peso, medidas o fotos necesitas señal." /> : null}
      {cuerpo}

      {hoja === 'peso' ? (
        <HojaPeso
          inicial={pesos[pesos.length - 1]?.pesoKg ?? 70}
          hoy={hoy}
          guardando={guardando}
          onCerrar={() => setHoja(null)}
          onGuardar={(p) =>
            guardar({ fecha: diaIso(hoy), peso_kg: Math.round(p * 10) / 10 }, `Guardado: ${cifra1(p)} kg, hoy.`, {
              id: null,
              fecha: diaIso(hoy),
              pesoKg: Math.round(p * 10) / 10,
              cinturaCm: null,
              caderaCm: null,
              pechoCm: null,
              brazoCm: null,
              musloCm: null,
              grasaPct: null,
            })
          }
        />
      ) : null}
      {hoja === 'medidas' ? (
        <HojaMedidas
          inicial={ultimaMedida}
          hoy={hoy}
          guardando={guardando}
          onCerrar={() => setHoja(null)}
          onGuardar={(vals) =>
            guardar(cuerpoMedidas(diaIso(hoy), vals), 'Medidas guardadas, hoy.', {
              id: null,
              fecha: diaIso(hoy),
              pesoKg: null,
              grasaPct: null,
              cinturaCm: vals.cinturaCm ?? null,
              caderaCm: vals.caderaCm ?? null,
              pechoCm: vals.pechoCm ?? null,
              brazoCm: vals.brazoCm ?? null,
              musloCm: vals.musloCm ?? null,
            })
          }
        />
      ) : null}
      <HojaFoto visible={hoja === 'foto'} hoy={hoy} nombreEnt={nombreEnt} onCerrar={() => setHoja(null)} />
      {hoja === 'comparar' && d ? <HojaComparar fotos={d.fotos} medidas={d.medidas} onCerrar={() => setHoja(null)} /> : null}
    </MarcoPestana>
  );
}

// ── Fuerza ───────────────────────────────────────────────────────────────────
function VistaFuerza({ semanas, records, hoy }: { semanas: SemanaVolumen[]; records: RecordPersonal[]; hoy: Date }) {
  const [todos, setTodos] = useState(false);
  const total = semanas.reduce((a, s) => a + s.sesiones, 0);
  if (total < MINIMO_TENDENCIA) {
    return (
      <>
        <Separador titulo="Volumen por semana" />
        <Tarjeta>
          <Txt v="h3">Tu gráfico aparece con la tercera sesión</Txt>
          <Txt v="sec" className="mt-1">
            Ahí empiezas a ver cuánto levantas cada semana y si va subiendo.
          </Txt>
          <View className="mt-4 flex-row gap-[3px]">
            {[0, 1, 2].map((i) => (
              <View key={i} className={`h-2 flex-1 rounded-[1px] ${i < total ? 'bg-hecho-fondo' : 'bg-sup-alta'}`} />
            ))}
          </View>
          <ConCifras className="mt-2" partes={[total, ' de ', 3, ' sesiones']} />
        </Tarjeta>
        <Separador titulo="Récords" />
        <Tarjeta>
          <Txt v="sec">Todavía no hay récords. Aparecen cuando superas una marca tuya, desde la segunda vez que haces un ejercicio.</Txt>
        </Tarjeta>
      </>
    );
  }
  const ultima = semanas[semanas.length - 1];
  const enCurso = ultima ? ultima.enCurso || ultima.desde === diaIso(lunes(hoy)) : false;
  const iSel = enCurso && semanas.length > 1 ? semanas.length - 2 : semanas.length - 1;
  const w = semanas[iSel] as SemanaVolumen;
  const prev = semanas[iSel - 1];
  const dif = prev ? (w.volumenKg - prev.volumenKg) / 1000 : null;
  const fin = new Date(aFecha(w.desde).getTime() + 6 * 86_400_000);
  const mes = hoy.getMonth();
  const delMes = records.filter((r) => r.fecha && aFecha(r.fecha.slice(0, 10)).getMonth() === mes && aFecha(r.fecha.slice(0, 10)).getFullYear() === hoy.getFullYear()).length;
  const visibles = todos ? records : records.slice(0, 6);
  return (
    <>
      <View className="mt-4">
        <Txt v="ceja">
          Semana del {aFecha(w.desde).getDate()} al {fechaCorta(diaIso(fin))} · {w.sesiones} {w.sesiones === 1 ? 'sesión' : 'sesiones'}
        </Txt>
        <Text className="mt-1 font-mono-bold text-[40px] leading-[44px] text-texto">
          {cifra1(w.volumenKg / 1000)}
          <Text className="text-[18px] text-texto-2"> t</Text>
        </Text>
        {dif !== null ? (
          <Txt v="sec">
            <Text className={`font-mono-bold ${dif > 0 ? 'text-acento-texto' : 'text-texto'}`}>{firmado(dif)} t</Text> frente a la semana anterior
          </Txt>
        ) : null}
      </View>
      <BarrasVolumen
        semanas={semanas.map((s, i) => ({ desde: s.desde, toneladas: s.volumenKg / 1000, enCurso: enCurso && i === semanas.length - 1 }))}
        seleccion={iSel}
        etiqueta={`Volumen por semana. ${semanas.map((s) => `semana del ${fechaCorta(s.desde)}: ${cifra1(s.volumenKg / 1000)} toneladas`).join('; ')}`}
      />
      <View className="mt-2 flex-row flex-wrap gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-3 w-3 rounded-[2px] border border-hecho-borde bg-hecho-fondo" />
          <Txt v="sec">Volumen por semana</Txt>
        </View>
        {enCurso && ultima ? (
          <View className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-[2px] border border-dashed border-hecho-borde bg-fila-hecha" />
            <ConCifras partes={['Esta semana: ', ultima.sesiones, ultima.sesiones === 1 ? ' sesión' : ' sesiones']} />
          </View>
        ) : null}
      </View>

      <Separador titulo="Récords" derecha={delMes ? <ConCifras partes={[delMes, ` en ${MES[mes]}`]} /> : undefined} />
      {records.length ? (
        <Tarjeta className="py-1">
          {visibles.map((p, i) => (
            <Pressable
              key={`${p.ejercicioId}-${p.tipo}-${i}`}
              onPress={() => p.ejercicioId && router.push({ pathname: '/ejercicio/[id]', params: { id: p.ejercicioId } })}
              disabled={!p.ejercicioId}
              accessibilityRole="button"
              accessibilityLabel={`${p.nombre}, ${textoRecord(p)}${p.diferencia ? `, ${firmado(p.diferencia)} kilos` : ''}`}
              className={`min-h-[64px] flex-row items-center gap-3 py-2 ${i ? 'border-t border-sup-alta' : ''} active:bg-fantasma-pres`}
            >
              <Simbolo tamano={20} />
              <View className="flex-1">
                <Text className="font-sans-semibold text-[16px] text-texto">{p.nombre}</Text>
                <Txt v="sec">
                  <Text className="font-mono-bold">{textoRecord(p)}</Text> · {p.fecha.slice(0, 10) === diaIso(hoy) ? 'hoy' : fechaCorta(p.fecha)}
                </Txt>
              </View>
              {p.diferencia ? <Text className="font-mono-bold text-[14px] text-acento-texto">{`+${kg(p.diferencia)} ${p.tipo.includes('reps') ? 'reps' : 'kg'}`}</Text> : null}
              <Icono nombre="adelante" tamano={20} />
            </Pressable>
          ))}
        </Tarjeta>
      ) : (
        <Tarjeta>
          <Txt v="sec">Todavía no hay récords. Aparecen cuando superas una marca tuya, desde la segunda vez que haces un ejercicio.</Txt>
        </Tarjeta>
      )}
      {records.length > 6 ? (
        <Boton titulo={todos ? 'Ver menos' : 'Ver todos los récords'} variante="fantasma" className="mt-1 self-start" onPress={() => setTodos((t) => !t)} />
      ) : null}
    </>
  );
}

function lunes(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function textoRecord(p: RecordPersonal): string {
  if (p.pesoKg !== null && p.reps !== null) return `${kg(p.pesoKg)} kg × ${p.reps}`;
  if (p.tipo === 'reps' || p.tipo === 'reps_con_peso') return `${p.valor} reps`;
  if (p.tipo === 'tiempo') return `${Math.floor(p.valor / 60)}:${String(Math.round(p.valor % 60)).padStart(2, '0')}`;
  if (p.tipo === 'volumen_sesion') return `${cifra1(p.valor / 1000)} t`;
  return `${kg(p.valor)} kg`;
}

// ── Peso ─────────────────────────────────────────────────────────────────────
function VistaPeso({ medidas, hoy }: { medidas: Medida[]; hoy: Date }) {
  const [todos, setTodos] = useState(false);
  const ps = pesosDe(medidas);
  const ult = ps[ps.length - 1];
  if (!ult) {
    return (
      <Tarjeta className="mt-4">
        <Txt v="h3">Todavía no registras tu peso</Txt>
        <Txt v="sec" className="mt-1">
          Pésate una vez por semana, el mismo día y a la misma hora. Con 3 registros ves tu tendencia.
        </Txt>
      </Tarjeta>
    );
  }
  const cuando = ult.fecha === diaIso(hoy) ? 'hoy' : fechaConDia(ult.fecha);
  const rev = [...ps].reverse();
  const historial = (n: number) => (
    <Tarjeta className="py-1">
      {rev.slice(0, n).map((p, i) => (
        <View key={p.fecha} className={`min-h-[48px] flex-row items-center ${i ? 'border-t border-sup-alta' : ''}`}>
          <Txt v="cuerpo" className="flex-1">
            {p.fecha === diaIso(hoy) ? 'Hoy' : fechaCorta(p.fecha)}
          </Txt>
          <Text className="w-24 text-right font-mono-bold text-[15px] text-texto">{cifra1(p.pesoKg)} kg</Text>
          <Text className="w-16 text-right font-mono-bold text-[13px] text-texto-2">{rev[i + 1] ? firmado(p.pesoKg - (rev[i + 1]?.pesoKg ?? 0)) : ''}</Text>
        </View>
      ))}
    </Tarjeta>
  );
  if (!hayTendencia(ps.length)) {
    return (
      <>
        <View className="mt-4">
          <Txt v="ceja">Actual · {cuando}</Txt>
          <Text className="mt-1 font-mono-bold text-[40px] leading-[44px] text-texto">
            {cifra1(ult.pesoKg)}
            <Text className="text-[18px] text-texto-2"> kg</Text>
          </Text>
        </View>
        <Tarjeta className="mt-4">
          <Txt v="h3">Con 3 registros ves tu tendencia</Txt>
          <Txt v="sec" className="mt-1">
            {textoSinTendenciaPeso(ps.length)} Pésate una vez por semana, el mismo día y a la misma hora.
          </Txt>
          <View className="mt-4 flex-row gap-[3px]">
            {[0, 1, 2].map((i) => (
              <View key={i} className={`h-2 flex-1 rounded-[1px] ${i < ps.length ? 'bg-hecho-fondo' : 'bg-sup-alta'}`} />
            ))}
          </View>
          <ConCifras className="mt-2" partes={[ps.length, ' de ', 3, ' registros']} />
        </Tarjeta>
        <Separador titulo="Historial" />
        {historial(6)}
      </>
    );
  }
  const c30 = cambio30Dias(ps, hoy);
  const tend = tendenciaSemanal(ps);
  return (
    <>
      <View className="mt-4">
        <Txt v="ceja">Actual · {cuando}</Txt>
        <Text className="mt-1 font-mono-bold text-[40px] leading-[44px] text-texto">
          {cifra1(ult.pesoKg)}
          <Text className="text-[18px] text-texto-2"> kg</Text>
        </Text>
        <Txt v="sec">
          {c30 !== null ? (
            <>
              <Text className="font-mono-bold text-texto">{firmado(c30)} kg</Text> en 30 días ·{' '}
            </>
          ) : null}
          tendencia <Text className="font-mono-bold text-texto">{firmado(tend ?? 0)} kg</Text> por semana
        </Txt>
      </View>
      <LineaTiempo
        puntos={ps.map((p) => ({ fecha: p.fecha, valor: p.pesoKg }))}
        etiqueta={`Peso corporal en el tiempo. ${ps.map((p) => `${fechaCorta(p.fecha)}: ${cifra1(p.pesoKg)} kilos`).join('; ')}`}
      />
      <Separador titulo="Historial" derecha={<Txt v="sec">{`${ps.length} registros`}</Txt>} />
      {historial(todos ? ps.length : 6)}
      {ps.length > 6 ? (
        <Boton titulo={todos ? 'Ver menos' : `Ver los ${ps.length} registros`} variante="fantasma" className="mt-1 self-start" onPress={() => setTodos((t) => !t)} />
      ) : null}
    </>
  );
}

// ── Medidas y fotos ──────────────────────────────────────────────────────────
function VistaMedidas({
  medidas,
  fotos,
  hoy,
  nombreEnt,
  onHoja,
}: {
  medidas: Medida[];
  fotos: Foto[];
  hoy: Date;
  nombreEnt: string | null;
  onHoja: (h: 'foto' | 'comparar') => void;
}) {
  const md = conPerimetros(medidas);
  const ult = md[md.length - 1];
  const ant = md[md.length - 2];
  return (
    <>
      {!ult ? (
        <>
          <Separador titulo="Medidas" />
          <Tarjeta>
            <Txt v="h3">Todavía no registras medidas</Txt>
            <Txt v="sec" className="mt-1">
              Cintura, cadera, pecho, brazo y muslo, con una huincha. Una vez al mes basta; con 3 registros ves la tendencia.
            </Txt>
          </Tarjeta>
        </>
      ) : (
        <>
          <Separador titulo="Medidas" derecha={<Txt v="sec">{ult.fecha === diaIso(hoy) ? 'hoy' : fechaCorta(ult.fecha)}</Txt>} />
          <Tarjeta className="py-1">
            {PARTES_MEDIDA.map((p, i) => {
              const v = ult[p.id];
              const a = ant?.[p.id] ?? null;
              const serie = md.map((m) => m[p.id]).filter((x): x is number => x !== null);
              return (
                <View key={p.id} className={`min-h-[52px] flex-row items-center gap-3 ${i ? 'border-t border-sup-alta' : ''}`}>
                  <Txt v="cuerpo" className="flex-1">
                    {p.nombre}
                  </Txt>
                  {hayTendencia(serie.length) ? <Chispa serie={serie} /> : null}
                  <Text className="w-20 text-right font-mono-bold text-[15px] text-texto">
                    {v !== null ? cifra1(v) : '·'}
                    <Text className="text-[12px] text-texto-2"> cm</Text>
                  </Text>
                  <Text className="w-14 text-right font-mono-bold text-[13px] text-texto-2">{v !== null && a !== null ? firmado(v - a) : ''}</Text>
                </View>
              );
            })}
          </Tarjeta>
          <Txt v="sec" className="mt-2 text-[13px]">
            {ant
              ? `Diferencia con el ${fechaCorta(ant.fecha)}.${hayTendencia(md.length) ? ` La línea es tu tendencia desde el ${fechaCorta(md[0]?.fecha ?? ant.fecha)}.` : ' Con 3 registros ves la tendencia.'}`
              : 'Con 3 registros ves la tendencia.'}
          </Txt>
        </>
      )}
      <BloqueFotos fotos={fotos} hoy={hoy} nombreEnt={nombreEnt} onHoja={onHoja} />
    </>
  );
}

function BloqueFotos({ fotos, hoy, nombreEnt, onHoja }: { fotos: Foto[]; hoy: Date; nombreEnt: string | null; onHoja: (h: 'foto' | 'comparar') => void }) {
  const { c } = useTema();
  const fechas = useMemo(() => [...new Set(fotos.map((f) => f.fecha))].sort().reverse(), [fotos]);
  const [fecha, setFecha] = useState<string | null>(null);
  const f = fecha && fechas.includes(fecha) ? fecha : (fechas[0] ?? null);
  const privadas = (
    <View className="flex-row items-center gap-1">
      <Icono nombre="candado" tamano={14} color={c['texto-2']} />
      <Txt v="sec" className="text-[13px]">
        {nombreEnt ? `Solo tú y ${nombreEnt}` : 'Solo tú'}
      </Txt>
    </View>
  );
  const marco = (t: (typeof TOMAS)[number]) => {
    const foto = f ? fotos.find((x) => x.fecha === f && x.tipo === t.id) : undefined;
    const puedeAgregar = !f || f === diaIso(hoy);
    return (
      <View key={t.id} className="flex-1 items-center gap-1">
        {foto?.url ? (
          <Image source={{ uri: foto.url }} className="w-full rounded-control" style={{ aspectRatio: 3 / 4 }} accessibilityLabel={`Foto de ${t.nombre.toLowerCase()} del ${fechaCorta(foto.fecha)}`} />
        ) : puedeAgregar ? (
          <Pressable
            onPress={() => onHoja('foto')}
            accessibilityRole="button"
            accessibilityLabel={`Agregar foto de ${t.nombre.toLowerCase()}`}
            className="w-full items-center justify-center gap-1 rounded-control border-2 border-dashed border-borde"
            style={{ aspectRatio: 3 / 4 }}
          >
            <Simbolo tamano={20} />
            <Txt v="sec">Agregar</Txt>
          </Pressable>
        ) : (
          <View className="w-full items-center justify-center rounded-control border border-sup-alta" style={{ aspectRatio: 3 / 4 }}>
            <Txt v="sec">Sin foto</Txt>
          </View>
        )}
        <Txt v="sec">{t.nombre}</Txt>
      </View>
    );
  };
  return (
    <>
      <Separador titulo="Fotos" derecha={privadas} />
      {!fechas.length ? (
        <Txt v="sec" className="mb-3">
          Opcionales. Sirven para ver cambios que la balanza no muestra.
        </Txt>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="mb-2 flex-grow-0">
          {fechas.map((x) => (
            <Chip key={x} titulo={fechaCorta(x)} texto={false} activo={x === f} onPress={() => setFecha(x)} />
          ))}
        </ScrollView>
      )}
      <View className="flex-row gap-2">{TOMAS.map(marco)}</View>
      {fechas.length ? (
        <View className="mt-3 flex-row gap-2">
          <Boton titulo="Comparar fechas" variante="secundario" className="flex-1" disabled={fechas.length < 2} onPress={() => onHoja('comparar')} />
          <Boton titulo="Agregar fotos" variante="secundario" className="flex-1" onPress={() => onHoja('foto')} />
        </View>
      ) : null}
    </>
  );
}

// ── Hojas ────────────────────────────────────────────────────────────────────
function HojaPeso({ inicial, hoy, guardando, onCerrar, onGuardar }: { inicial: number; hoy: Date; guardando: boolean; onCerrar: () => void; onGuardar: (p: number) => void }) {
  const [peso, setPeso] = useState(Math.round(inicial * 10) / 10);
  return (
    <Hoja
      visible
      onCerrar={onCerrar}
      titulo="Registrar peso"
      texto={`Hoy, ${fechaLarga(hoy).charAt(0).toLowerCase()}${fechaLarga(hoy).slice(1)}`}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={onCerrar} />
          <Boton titulo="Guardar" alto className="flex-1" cargando={guardando} onPress={() => onGuardar(peso)} />
        </>
      }
    >
      <View className="mt-4">
        <Paso valor={peso} onCambiar={setPeso} paso={0.1} min={30} max={250} formato={cifra1} unidad="kg" etiqueta="peso" />
      </View>
      <Txt v="sec" className="mt-3">
        De 0,1 en 0,1; mantén presionado para avanzar rápido. Pésate en ayunas y a la misma hora para comparar parejo.
      </Txt>
    </Hoja>
  );
}

function HojaMedidas({
  inicial,
  hoy,
  guardando,
  onCerrar,
  onGuardar,
}: {
  inicial: Medida | undefined;
  hoy: Date;
  guardando: boolean;
  onCerrar: () => void;
  onGuardar: (v: { [k in ParteMedida]?: number | null }) => void;
}) {
  const base: { [k in ParteMedida]: number } = { cinturaCm: 72, caderaCm: 96, pechoCm: 88, brazoCm: 27, musloCm: 55 };
  const [v, setV] = useState<{ [k in ParteMedida]: number }>(() => ({
    cinturaCm: inicial?.cinturaCm ?? base.cinturaCm,
    caderaCm: inicial?.caderaCm ?? base.caderaCm,
    pechoCm: inicial?.pechoCm ?? base.pechoCm,
    brazoCm: inicial?.brazoCm ?? base.brazoCm,
    musloCm: inicial?.musloCm ?? base.musloCm,
  }));
  return (
    <Hoja
      visible
      onCerrar={onCerrar}
      titulo="Registrar medidas"
      texto={`Hoy, ${fechaLarga(hoy).charAt(0).toLowerCase()}${fechaLarga(hoy).slice(1)} · en centímetros`}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={onCerrar} />
          <Boton titulo="Guardar" alto className="flex-1" cargando={guardando} onPress={() => onGuardar(v)} />
        </>
      }
    >
      <ScrollView style={{ maxHeight: 420 }} className="mt-2">
        {PARTES_MEDIDA.map((p) => (
          <View key={p.id} className="mt-2 flex-row items-center gap-3">
            <Text className="flex-1 font-sans-bold text-[15px] text-texto">{p.nombre}</Text>
            <View className="w-[228px]">
              <Paso valor={v[p.id]} onCambiar={(n) => setV((x) => ({ ...x, [p.id]: n }))} paso={0.5} min={10} max={200} formato={cifra1} unidad="cm" etiqueta={p.nombre.toLowerCase()} />
            </View>
          </View>
        ))}
        <Txt v="sec" className="mt-3">
          Mide siempre en el mismo punto, sin apretar la huincha.
        </Txt>
      </ScrollView>
    </Hoja>
  );
}

function HojaFoto({ visible, hoy, nombreEnt, onCerrar }: { visible: boolean; hoy: Date; nombreEnt: string | null; onCerrar: () => void }) {
  const aviso = useAviso();
  const [toma, setToma] = useState<TomaFoto>('frente');
  const avisar = () => aviso.mostrar('Subir fotos llega en la próxima versión de la app.');
  return (
    <Hoja
      visible={visible}
      onCerrar={onCerrar}
      titulo="Agregar foto"
      texto={`Hoy, ${fechaLarga(hoy).charAt(0).toLowerCase()}${fechaLarga(hoy).slice(1)} · ${nombreEnt ? `solo la ven tú y ${nombreEnt}` : 'solo la ves tú'}`}
    >
      <Txt v="etiquetaCampo" className="mt-4">
        Toma
      </Txt>
      <View className="mt-1 flex-row gap-2">
        {TOMAS.map((t) => (
          <Chip key={t.id} titulo={t.nombre} activo={toma === t.id} onPress={() => setToma(t.id)} />
        ))}
      </View>
      <Txt v="sec" className="mt-2">
        Con la misma luz y a la misma distancia que las anteriores, para comparar parejo.
      </Txt>
      <View className="mt-4 gap-2">
        <Boton titulo="Tomar foto" variante="secundario" alto ancho onPress={avisar} />
        <Boton titulo="Elegir de la galería" variante="secundario" alto ancho onPress={avisar} />
      </View>
      <View className="mt-3 flex-row">
        <Boton titulo="Cancelar" variante="fantasma" alto className="flex-1" onPress={onCerrar} />
      </View>
    </Hoja>
  );
}

function HojaComparar({ fotos, medidas, onCerrar }: { fotos: Foto[]; medidas: Medida[]; onCerrar: () => void }) {
  const fechas = [...new Set(fotos.map((f) => f.fecha))].sort();
  const [toma, setToma] = useState<TomaFoto>('frente');
  const [lados, setLados] = useState<[number, number]>([0, Math.max(0, fechas.length - 1)]);
  const lado = (k: 0 | 1) => {
    const f = fechas[lados[k]] ?? '';
    const foto = fotos.find((x) => x.fecha === f && x.tipo === toma);
    const m = medidas.find((x) => x.fecha === f);
    return (
      <View className="flex-1 gap-2">
        <Boton
          titulo={fechaCorta(f)}
          variante="secundario"
          accessibilityLabel={`Cambiar la fecha ${k ? 'de la derecha' : 'de la izquierda'}`}
          onPress={() => setLados((l) => (k === 0 ? [(l[0] + 1) % fechas.length, l[1]] : [l[0], (l[1] + 1) % fechas.length]))}
        />
        {foto?.url ? (
          <Image source={{ uri: foto.url }} className="w-full rounded-control" style={{ aspectRatio: 3 / 4 }} accessibilityLabel={`Foto del ${fechaCorta(f)}`} />
        ) : (
          <View className="w-full items-center justify-center rounded-control border border-sup-alta" style={{ aspectRatio: 3 / 4 }}>
            <Txt v="sec">Sin foto</Txt>
          </View>
        )}
        <Txt v="sec">
          {[m?.pesoKg ? `${cifra1(m.pesoKg)} kg` : '', m?.cinturaCm ? `cintura ${cifra1(m.cinturaCm)}` : ''].filter(Boolean).join(' · ')}
        </Txt>
      </View>
    );
  };
  return (
    <Hoja
      visible
      onCerrar={onCerrar}
      titulo="Comparar fotos"
      acciones={<Boton titulo="Cerrar" variante="secundario" alto className="flex-1" onPress={onCerrar} />}
    >
      <View className="mt-3 flex-row gap-2">
        {TOMAS.map((t) => (
          <Chip key={t.id} titulo={t.nombre} activo={toma === t.id} onPress={() => setToma(t.id)} />
        ))}
      </View>
      <View className="mt-3 flex-row gap-3">
        {lado(0)}
        {lado(1)}
      </View>
    </Hoja>
  );
}
