// ─────────────────────────────────────────────────────────────────────────────
// Encuesta inicial (pantalla) · Zona: Acceso
//
// Qué hace: PAN-04, como docs/pantallas/encuesta.html. Las 10 preguntas de a una, con «Pregunta
// n de 10» y la barra por segmentos; Atrás y Siguiente sin perder lo respondido. Fecha, altura y
// peso usan el más y menos de 56 dp (mantener avanza solo; tocar la cifra deja escribirla). La 10
// es el código del entrenador, opcional: se comprueba al completar los 6 caracteres y muestra a
// quién pertenece. Al final se revisan las respuestas (tocar una la cambia) y se da el
// consentimiento de datos de salud con casilla propia; «Terminar» manda POST /v1/me/survey, deja
// el vínculo hecho si hubo código y lleva a Hoy. Si falla, «No pudimos guardar» con Reintentar y
// las respuestas intactas.
// Tócalo cuando: cambie la maqueta de la Encuesta.
// No lo toques para: las preguntas y sus reglas (encuesta.ts) ni las llamadas (encuestaApi.ts).
// Quién la ve lo decide src/app/_layout.tsx (alumno con encuesta_pendiente).
// Depende de: @/components/ui, @/lib/sesion, @/lib/vibrar, expo-router, ./encuesta,
// ./encuestaApi, ./componentes y ./PantallaCrearCuenta (abrirLegal).
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import { useEffect, useReducer } from 'react';
import { AccessibilityInfo, BackHandler, Text, View } from 'react-native';
import { Avance, Boton, CampoTexto, Pantalla, Tarjeta, Txt, useAviso } from '@/components/ui';
import { useSesion } from '@/lib/sesion';
import { vibrarConfirmar, vibrarLimite } from '@/lib/vibrar';
import {
  Baldosa,
  BarraCarga,
  CampoCodigo,
  CasillaConsentimiento,
  FilaResumen,
  Mensaje,
  OpcionCasilla,
  OpcionGrande,
  PasoEscribible,
} from './componentes';
import {
  ANO_MINIMO,
  armarCuerpo,
  codigoDelCuerpo,
  edad,
  entrenadorDelCodigo,
  estadoInicial,
  etiquetaPrincipal,
  FINAL,
  MESES,
  nombreCompleto,
  PREGUNTAS,
  puedeSeguir,
  reducirEncuesta,
  segmentosHechos,
  textoRespuesta,
  TOTAL_PREGUNTAS,
  aNumero,
  type AccionEncuesta,
  type EstadoEncuesta,
  type Pregunta,
} from './encuesta';
import { comprobarCodigo, enviarEncuesta, falloDeEncuesta, vincular } from './encuestaApi';
import { abrirLegal } from './PantallaCrearCuenta';

type Despachar = (a: AccionEncuesta) => void;

const iniciales = (nombre: string, apellido: string) => `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

/** Rótulo chico sobre cada más y menos de la fecha (sistema.css, .fld-rot). */
function Rotulo({ children, primero = false }: { children: string; primero?: boolean }) {
  return <Text className={`mb-1.5 font-sans-semibold text-[14px] leading-[18px] text-texto ${primero ? '' : 'mt-4'}`}>{children}</Text>;
}

// ── Respuestas por tipo de pregunta ──────────────────────────────────────────
function Respuestas({ q, s, despachar }: { q: Pregunta; s: EstadoEncuesta; despachar: Despachar }) {
  switch (q.tipo) {
    case 'unica':
      return (
        <View accessibilityRole="radiogroup" accessibilityLabel={q.titulo} className="gap-2">
          {q.opciones.map((o) => (
            <OpcionGrande
              key={o.v}
              titulo={o.texto}
              detalle={o.detalle}
              activa={s.r[q.id] === o.v}
              onPress={() => despachar({ tipo: 'elegir', valor: o.v })}
            />
          ))}
        </View>
      );

    case 'baldosas':
      return (
        <View accessibilityRole="radiogroup" accessibilityLabel={q.titulo} className="flex-row gap-2">
          {q.opciones.map((o) => (
            <Baldosa
              key={o.v}
              cifra={o.cifra}
              unidad={o.unidad}
              voz={o.voz}
              activa={s.r[q.id] === o.v}
              onPress={() => despachar({ tipo: 'elegir', valor: o.v })}
            />
          ))}
        </View>
      );

    case 'fecha': {
      const f = s.r.nacimiento ?? { d: null, m: null, a: null };
      const e = edad(f, s.hoy);
      return (
        <View>
          <Rotulo primero>Día</Rotulo>
          <PasoEscribible
            etiqueta="Día"
            texto={f.d ? String(f.d) : ''}
            largo={2}
            onEscribir={(t) => despachar({ tipo: 'escribir', campo: 'd', valor: t })}
            onPasar={(dir) => despachar({ tipo: 'pasar', campo: 'd', dir })}
          />
          <Rotulo>Mes</Rotulo>
          <PasoEscribible
            etiqueta="Mes"
            texto=""
            escribible={false}
            textoCentro={f.m ? MESES[f.m - 1] : '-'}
            onPasar={(dir) => despachar({ tipo: 'pasar', campo: 'm', dir })}
          />
          <Rotulo>Año</Rotulo>
          <PasoEscribible
            etiqueta="Año"
            texto={f.a ? String(f.a) : ''}
            largo={4}
            limiteMin={f.a === ANO_MINIMO}
            limiteMax={f.a === s.hoy.a}
            error={!!s.err}
            onEscribir={(t) => despachar({ tipo: 'escribir', campo: 'a', valor: t })}
            onPasar={(dir) => despachar({ tipo: 'pasar', campo: 'a', dir })}
          />
          {s.err ? (
            <Txt v="error" className="mt-2" accessibilityRole="alert">
              {s.err}
            </Txt>
          ) : e != null && e >= 0 ? (
            <Text className="mt-4 font-sans-medium text-[15px] leading-[21px] text-texto-2">
              Tienes <Text className="font-mono-bold text-texto">{e}</Text> años.
            </Text>
          ) : null}
        </View>
      );
    }

    case 'numero': {
      const v = aNumero(s.r[q.id]);
      return (
        <View>
          <PasoEscribible
            etiqueta={q.nombre}
            texto={s.r[q.id] ?? ''}
            unidad={q.unidad}
            teclado={q.decimales ? 'decimal-pad' : 'number-pad'}
            largo={q.decimales ? 5 : 3}
            limiteMin={v === q.min}
            limiteMax={v === q.max}
            error={!!s.err}
            onEscribir={(t) => despachar({ tipo: 'escribir', campo: q.id, valor: t })}
            onPasar={(dir) => despachar({ tipo: 'pasar', campo: q.id, dir })}
          />
          {s.err ? (
            <Txt v="error" className="mt-2" accessibilityRole="alert">
              {s.err}
            </Txt>
          ) : null}
        </View>
      );
    }

    case 'multiple': {
      const elegidas = s.r.lesiones ?? [];
      const conLesion = elegidas.length > 0 && !elegidas.includes('ninguna');
      const filas = [q.opciones.slice(0, 2), q.opciones.slice(2, 4), q.opciones.slice(4, 6)];
      return (
        <View>
          <View accessibilityLabel={q.titulo} className="gap-2">
            {filas.map((fila, i) => (
              <View key={i} className="flex-row gap-2">
                {fila.map((o) => (
                  <OpcionCasilla
                    key={o.v}
                    titulo={o.texto}
                    activa={elegidas.includes(o.v)}
                    onPress={() => despachar({ tipo: 'marcar', valor: o.v })}
                  />
                ))}
              </View>
            ))}
          </View>
          {conLesion ? (
            <View className="mt-5">
              <CampoTexto
                etiqueta="Cuéntanos más (opcional)"
                valor={s.r.lesionesTexto ?? ''}
                onCambiar={(t) => despachar({ tipo: 'escribir', campo: 'lesionesTexto', valor: t })}
                multilinea
                maxLength={500}
                placeholder="Por ejemplo: me molesta la rodilla derecha al bajar en la sentadilla"
              />
            </View>
          ) : null}
        </View>
      );
    }

    case 'codigo': {
      const c = s.codigo;
      const entrenador = entrenadorDelCodigo(s);
      return (
        <View>
          <CampoCodigo
            valor={s.r.codigo ?? ''}
            onCambiar={(t) => despachar({ tipo: 'codigo', valor: t })}
            estado={c.tipo === 'valido' ? 'valido' : c.tipo === 'error' ? 'error' : 'normal'}
          />
          {c.tipo === 'comprobando' ? (
            <Txt v="sec" className="mt-3" accessibilityLiveRegion="polite">
              Comprobando el código…
            </Txt>
          ) : entrenador ? (
            <Tarjeta tono="hecha" className="mt-4 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-control bg-sup-alta">
                <Text className="font-mono-bold text-[14px] text-texto">{iniciales(entrenador.nombre, entrenador.apellido)}</Text>
              </View>
              <View className="flex-1" accessible accessibilityLiveRegion="polite">
                <Text className="font-sans-bold text-[16px] leading-[21px] text-texto">{nombreCompleto(entrenador)}</Text>
                <Txt v="sec">Tu entrenador. Al terminar, verá tus rutinas, sesiones y medidas.</Txt>
              </View>
            </Tarjeta>
          ) : c.tipo === 'error' ? (
            <Txt v="error" className="mt-3" accessibilityRole="alert">
              {c.mensaje}
            </Txt>
          ) : c.tipo === 'sin-comprobar' ? (
            <Txt v="sec" className="mt-3" accessibilityLiveRegion="polite">
              No pudimos comprobarlo ahora. Lo revisamos al terminar.
            </Txt>
          ) : (
            <Txt v="sec" className="mt-3">
              Son 6 caracteres, letras y números. Cada código dura 7 días.
            </Txt>
          )}
        </View>
      );
    }
  }
}

// ── Pantalla ─────────────────────────────────────────────────────────────────
export function PantallaEncuesta() {
  const { usuario, api, refrescarUsuario, actualizarUsuario } = useSesion();
  const { mostrar } = useAviso();
  const [s, despachar] = useReducer(reducirEncuesta, null, () => estadoInicial(new Date()));
  const q = s.n < FINAL ? PREGUNTAS[s.n] : null;
  const codigo = s.r.codigo ?? '';
  const comprobando = s.codigo.tipo === 'comprobando';

  // Comprueba el código al completar los 6 caracteres. Si cambia antes de responder, se descarta.
  useEffect(() => {
    if (!comprobando) return;
    let vivo = true;
    comprobarCodigo(api, codigo).then((resultado) => {
      if (vivo) despachar({ tipo: 'codigoComprobado', codigo, resultado });
    });
    return () => {
      vivo = false;
    };
  }, [api, codigo, comprobando]);

  // El más o el menos chocó con un límite: vibra y lo dice.
  useEffect(() => {
    if (!s.limite) return;
    vibrarLimite();
    mostrar(s.limite === 'max' ? 'Llegaste al máximo.' : 'Llegaste al mínimo.', { duracionMs: 2400 });
  }, [s.limite, mostrar]);

  // Al cambiar de pregunta, el lector de pantalla lee la nueva.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(s.n < FINAL ? `Pregunta ${s.n + 1} de ${TOTAL_PREGUNTAS}. ${PREGUNTAS[s.n].titulo}` : 'Revisa tus respuestas');
  }, [s.n]);

  // El botón atrás de Android vuelve a la pregunta anterior en vez de salir de la encuesta.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (s.guardando) return true;
      if (s.n > 0 || s.editando) {
        despachar({ tipo: 'atras' });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [s.n, s.editando, s.guardando]);

  async function terminar() {
    if (!puedeSeguir(s)) return;
    let cuerpo;
    try {
      cuerpo = armarCuerpo(s);
    } catch {
      despachar({ tipo: 'falloGuardar' });
      return;
    }
    despachar({ tipo: 'guardando' });
    try {
      await enviarEncuesta(api, cuerpo);
    } catch (e) {
      despachar(falloDeEncuesta(e));
      return;
    }
    vibrarConfirmar();
    // La encuesta quedó guardada: aunque GET /me falle ahora, no se vuelve a pedir.
    actualizarUsuario({ encuesta_pendiente: false });
    let u = await refrescarUsuario();
    const codigo = codigoDelCuerpo(cuerpo);
    if (codigo && u && !u.entrenador) {
      const r = await vincular(api, codigo);
      if (r === 'vinculado') u = await refrescarUsuario();
      else mostrar('Guardamos tu encuesta, pero no pudimos vincularte. Ingresa el código en tu perfil.');
    }
    if (u?.encuesta_pendiente) actualizarUsuario({ encuesta_pendiente: false });
    router.replace('/');
  }

  function principal() {
    if (s.n === FINAL) terminar();
    else despachar({ tipo: 'siguiente' });
  }

  const entrenador = entrenadorDelCodigo(s);
  const nombre = usuario?.nombre?.trim();

  const cabecera = (
    <View className="pb-3">
      <BarraCarga etiqueta="Guardando tus respuestas" visible={s.guardando} />
      <View className="h-10 flex-row items-center">
        {s.n === FINAL ? (
          <Text className="font-sans-semibold text-[14px] text-texto-2">Último paso · revisa y termina</Text>
        ) : (
          <Text className="font-sans-semibold text-[14px] text-texto-2">
            Pregunta <Text className="font-mono-bold text-texto">{s.n + 1}</Text> de{' '}
            <Text className="font-mono-bold text-texto">{TOTAL_PREGUNTAS}</Text>
          </Text>
        )}
      </View>
      <Avance
        total={TOTAL_PREGUNTAS}
        hechos={segmentosHechos(s)}
        actual={s.n < FINAL ? s.n : undefined}
        etiqueta="Avance de la encuesta"
      />
    </View>
  );

  const botones = (
    <View className="flex-row gap-2">
      {s.n > 0 && !s.editando ? (
        <Boton titulo="Atrás" variante="secundario" alto className="w-[112px]" disabled={s.guardando} onPress={() => despachar({ tipo: 'atras' })} />
      ) : null}
      <Boton
        titulo={etiquetaPrincipal(s)}
        alto
        className="flex-1"
        disabled={!puedeSeguir(s)}
        cargando={s.guardando ? 'Guardando…' : false}
        onPress={principal}
      />
    </View>
  );

  const accion =
    s.n === FINAL ? (
      <View>
        <CasillaConsentimiento
          marcada={s.consentimiento}
          disabled={s.guardando}
          onPress={() => despachar({ tipo: 'consentir' })}
          texto={`Acepto que GymTrack guarde mi fecha de nacimiento, mi peso, mi altura y mis lesiones para seguir mi entrenamiento${
            entrenador ? `, y que ${nombreCompleto(entrenador)} los vea` : ''
          }.`}
        />
        <View className="mt-2">{botones}</View>
      </View>
    ) : (
      botones
    );

  return (
    <Pantalla key={s.n} cabecera={cabecera} accion={accion}>
      {q ? (
        <>
          {s.n === 0 ? (
            <Text className="mt-2 font-sans-medium text-[15px] leading-[21px] text-texto-2">
              {nombre ? <Text className="font-sans-semibold text-texto">Hola, {nombre}. </Text> : null}
              Son 10 preguntas cortas, unos 2 minutos. Quedan como tu punto de partida.
            </Text>
          ) : null}
          <Text accessibilityRole="header" className="mt-3 font-sans-bold text-[28px] leading-[32px] tracking-[-0.28px] text-texto">
            {q.titulo}
          </Text>
          <Text className="mt-2 font-sans-medium text-[15px] leading-[21px] text-texto-2">{q.ayuda}</Text>
          <View className="mt-6">
            <Respuestas q={q} s={s} despachar={despachar} />
          </View>
        </>
      ) : (
        <>
          {s.errorGuardar ? (
            <Mensaje
              mensaje={{ titulo: 'No pudimos guardar', texto: 'Revisa tu conexión e intenta de nuevo. Tus respuestas siguen aquí.', tono: 'peligro' }}
            />
          ) : null}
          <Text accessibilityRole="header" className="mt-3 font-sans-bold text-[28px] leading-[32px] tracking-[-0.28px] text-texto">
            Revisa tus respuestas
          </Text>
          <Text className="mt-2 font-sans-medium text-[15px] leading-[21px] text-texto-2">
            Toca una para cambiarla. Quedan guardadas como tu punto de partida
            {entrenador ? ` y ${entrenador.nombre} las ve en tu ficha` : ''}.
          </Text>
          <View className="mt-5 rounded-control border border-sup-alta bg-sup pl-4">
            {PREGUNTAS.map((p, i) => (
              <FilaResumen
                key={p.id}
                ceja={p.corto}
                tramos={textoRespuesta(p, s)}
                ultimo={i === PREGUNTAS.length - 1}
                disabled={s.guardando}
                onPress={() => despachar({ tipo: 'editar', i })}
              />
            ))}
          </View>
          <View className="-ml-3 mt-2 flex-row">
            <Boton titulo="Cómo cuidamos tus datos" variante="fantasma" onPress={() => abrirLegal('urlPrivacidad', mostrar)} />
          </View>
        </>
      )}
    </Pantalla>
  );
}
