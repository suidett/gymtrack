// ─────────────────────────────────────────────────────────────────────────────
// Piezas de las pantallas del entrenador · Zona: Entrenador (app)
//
// Qué hace: las piezas chicas que se repiten en Clientes, Ficha, Alertas, Ajustar cargas y
// Perfil del entrenador y que no están en el kit: Avatar con iniciales, la barra de sesiones
// de la semana (grande y mini), las seis casillas del código, la escala de dolor de 10, la
// casilla de 32 dp para marcar, el aviso «Sin conexión», el error con Reintentar, los
// esqueletos de carga y la fila de tres cifras.
// Tócalo cuando: una pieza se vea distinta en las maquetas (docs/pantallas/clientes.html,
// ficha.html, alertas.html, perfil.html). Si otra área la necesita, conviene pasarla al kit.
// No lo toques para: piezas de una sola pantalla (van en su archivo).
// Depende de: @/components/ui (Txt, Boton, Icono, Tarjeta) y las clases de @gymtrack/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Boton, Icono, Tarjeta, Txt } from '@/components/ui';
import { useTema } from '@/lib/tema';
import { codigoAccesible, segmentosSemana } from './logica';

// ── Avatar ───────────────────────────────────────────────────────────────────
/** Cuadrado de 40 (56 si es `grande`) con las iniciales en mono. */
export function Avatar({ iniciales, grande = false }: { iniciales: string; grande?: boolean }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={`items-center justify-center rounded-control bg-sup-alta ${grande ? 'h-14 w-14' : 'h-10 w-10'}`}
    >
      <Text className={`font-mono-bold text-texto ${grande ? 'text-[18px]' : 'text-[14px]'}`}>{iniciales}</Text>
    </View>
  );
}

// ── Semana ───────────────────────────────────────────────────────────────────
type Semana = { hechas: number; perdidas: number; planificadas: number };
const SEG = { si: 'border border-hecho-borde bg-hecho-fondo', no: 'bg-peligro', '': 'bg-borde/45' } as const;

/** Barra de la adherencia de la semana: hechas en ámbar, perdidas en rojo, las que quedan en gris. */
export function BarraSemana({ semana }: { semana: Semana }) {
  const segs = segmentosSemana(semana);
  if (!segs.length) return null;
  return (
    <View className="mt-3.5 flex-row gap-0.5" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {segs.map((s, i) => (
        <View key={i} className={`h-2.5 flex-1 rounded-[1px] ${SEG[s]}`} />
      ))}
    </View>
  );
}

/** Leyenda bajo la barra: hechas, perdidas y cuántas quedan. */
export function LeyendaSemana({ quedan }: { quedan: number }) {
  const marca = (c: string) => <View className={`h-2.5 w-2.5 rounded-[1px] ${c}`} />;
  return (
    <View className="mt-2.5 flex-row flex-wrap items-center gap-1.5">
      {marca(SEG.si)}
      <Txt v="sec" className="mr-1 text-[13px]">
        hechas
      </Txt>
      {marca(SEG.no)}
      <Txt v="sec" className="mr-1 text-[13px]">
        perdidas
      </Txt>
      {marca(SEG[''])}
      <Txt v="sec" className="text-[13px]">
        quedan <Text className="font-mono-bold text-texto">{quedan}</Text>
      </Txt>
    </View>
  );
}

/** La semana de un cliente en su fila: segmentos chicos y «1 de 4». */
export function MiniSemana({ semana }: { semana: Semana }) {
  const segs = segmentosSemana(semana);
  if (!segs.length) return null;
  return (
    <View className="items-end gap-1.5" accessibilityLabel={`${semana.hechas} de ${semana.planificadas} sesiones esta semana`}>
      <View className="flex-row gap-0.5">
        {segs.map((s, i) => (
          <View key={i} className={`h-2 w-2.5 rounded-[1px] ${SEG[s]}`} />
        ))}
      </View>
      <Text className="font-sans-medium text-[12px] text-texto-2">
        <Text className="font-mono-bold text-texto">{semana.hechas}</Text> de{' '}
        <Text className="font-mono-bold text-texto">{semana.planificadas}</Text>
      </Text>
    </View>
  );
}

// ── Cifras ───────────────────────────────────────────────────────────────────
/** Fila de tres cifras con su leyenda (activos, entrenan hoy, sin rutina). */
export function TresCifras({ datos, borde = true }: { datos: { valor: string; sufijo?: string; texto: string }[]; borde?: boolean }) {
  return (
    <View className={`flex-row gap-2 ${borde ? 'mt-4 border-t border-sup-alta pt-3.5' : ''}`}>
      {datos.map((d) => (
        <View key={d.texto} className="flex-1" accessible accessibilityLabel={`${d.valor}${d.sufijo ?? ''} ${d.texto}`}>
          <Text className="font-mono-bold text-[24px] leading-[28px] text-texto">
            {d.valor}
            {d.sufijo ? <Text className="text-[16px] text-texto-2">{d.sufijo}</Text> : null}
          </Text>
          <Txt v="sec" className="mt-0.5 text-[13px]">
            {d.texto}
          </Txt>
        </View>
      ))}
    </View>
  );
}

// ── Código de invitación ─────────────────────────────────────────────────────
/** Las seis casillas de 44 × 56 del código; `vencido` lo pinta apagado. */
export function CeldasCodigo({ codigo, vencido = false }: { codigo: string; vencido?: boolean }) {
  const letras = codigo.padEnd(6, ' ').slice(0, 6).split('');
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={codigoAccesible(codigo)} className="mt-5 flex-row justify-center gap-2">
      {letras.map((l, i) => (
        <View key={i} className="h-14 w-11 items-center justify-center rounded-control bg-sup-alta">
          <Text className={`font-mono-bold text-[24px] ${vencido ? 'text-desh-texto' : 'text-texto'}`}>{l.trim()}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Dolor ────────────────────────────────────────────────────────────────────
/** Escala de 10 segmentos; los primeros `n` en rojo. */
export function EscalaDolor({ n, chica = false }: { n: number; chica?: boolean }) {
  return (
    <View className="flex-row gap-0.5" accessible accessibilityLabel={`Dolor ${n} de 10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <View key={i} className={`${chica ? 'h-2 w-2' : 'h-3 flex-1'} rounded-[1px] ${i < n ? 'bg-peligro' : 'bg-borde/45'}`} />
      ))}
    </View>
  );
}

// ── Casilla ──────────────────────────────────────────────────────────────────
/** Fila tocable de 56 con una casilla de 32 (hoja Resolver alerta). */
export function Casilla({ titulo, marcada, onCambiar }: { titulo: string; marcada: boolean; onCambiar: (v: boolean) => void }) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={() => onCambiar(!marcada)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={titulo}
      className="min-h-[56px] flex-row items-center gap-3 active:opacity-80"
    >
      <View
        className={`h-8 w-8 items-center justify-center rounded-control border-2 ${marcada ? 'border-hecho-borde bg-hecho-fondo' : 'border-borde bg-transparent'}`}
      >
        {marcada ? <Icono nombre="visto" tamano={20} color={c.visto} /> : null}
      </View>
      <Txt v="cuerpo" className="flex-1">
        {titulo}
      </Txt>
    </Pressable>
  );
}

// ── Estados de la pantalla ───────────────────────────────────────────────────
/** «Sin conexión. Lo que ves es de hoy a las 8:12.» con Reintentar. */
export function AvisoSinRed({ desde, onReintentar }: { desde: string | null; onReintentar: () => void }) {
  return (
    <View accessibilityRole="alert" className="mb-4 flex-row items-center gap-3 rounded-control border border-borde bg-sup px-4 py-2">
      <Icono nombre="sinSenal" tamano={20} />
      <View className="flex-1">
        <Text className="font-sans-bold text-[15px] text-texto">Sin conexión</Text>
        {desde ? <Txt v="sec">Lo que ves es de {desde}.</Txt> : null}
      </View>
      <Boton titulo="Reintentar" variante="fantasma" onPress={onReintentar} />
    </View>
  );
}

/** Error al cargar, con el texto de la pantalla y Reintentar. */
export function ErrorCarga({ titulo, texto, onReintentar }: { titulo: string; texto: string; onReintentar: () => void }) {
  return (
    <Tarjeta className="mt-4 items-start gap-2">
      <Icono nombre="sinSenal" />
      <Txt v="h3" accessibilityRole="alert">
        {titulo}
      </Txt>
      <Txt v="sec">{texto}</Txt>
      <Boton titulo="Reintentar" variante="secundario" ancho className="mt-2" onPress={onReintentar} />
    </Tarjeta>
  );
}

/** Bloque gris de carga. */
export function Esq({ ancho = '100%', alto = 14, className = '' }: { ancho?: `${number}%` | number; alto?: number; className?: string }) {
  return <View className={`rounded bg-sup-alta ${className}`} style={{ width: ancho, height: alto }} />;
}

/** Tres filas grises con avatar, como la lista mientras carga. */
export function EsqFilas({ n = 3 }: { n?: number }) {
  return (
    <Tarjeta className="py-1">
      {Array.from({ length: n }, (_, i) => (
        <View key={i} className={`min-h-[64px] flex-row items-center gap-3 ${i < n - 1 ? 'border-b border-sup-alta' : ''}`}>
          <Esq ancho={40} alto={40} />
          <View className="flex-1 gap-2">
            <Esq ancho="58%" />
            <Esq ancho="40%" alto={10} />
          </View>
        </View>
      ))}
    </Tarjeta>
  );
}

/** Cabeza de sección con contador opcional y algo a la derecha (Ver todas). */
export function CabezaSeccion({ titulo, cifra, derecha }: { titulo: string; cifra?: number; derecha?: ReactNode }) {
  return (
    <View className="mb-2 mt-6 min-h-[48px] flex-row items-center justify-between gap-2">
      <Text accessibilityRole="header" className="font-sans-bold text-[17px] text-texto">
        {titulo}
        {cifra !== undefined ? <Text className="font-mono-bold text-texto-2">{`  ${cifra}`}</Text> : null}
      </Text>
      {derecha}
    </View>
  );
}
