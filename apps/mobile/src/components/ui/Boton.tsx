// ─────────────────────────────────────────────────────────────────────────────
// Botones · Zona: Kit de interfaz
//
// Qué hace: los botones de sistema.css: primario, secundario, fantasma, fantasma de peligro y
// peligro, de 48 dp (o 56 con `alto`, 64 con `empezar`), radio 8, Archivo 600. Al presionar
// cambian de color al instante (sin animación) y vibran liviano; al soltar vuelven en 100 ms.
// Deshabilitado: relleno y texto apagados. `cargando` muestra «Guardando…» y no responde.
// Más el botón de ícono (48 o 56 dp) y BotonRedondo, que queda por compatibilidad.
// Tócalo cuando: cambie cómo se ve o responde un botón en toda la app.
// No lo toques para: un botón distinto de una sola pantalla.
// Depende de: ./Icono, ../../lib/vibrar y las clases del preset de @gymtrack/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';
import { vibrarPresion } from '@/lib/vibrar';
import { Icono, type NombreIcono } from './Icono';

// ── Variantes ────────────────────────────────────────────────────────────────
// caja: fondo y borde en reposo; pres: al presionar; texto: color del texto. El texto va en un
// <Text> hijo porque en React Native el color no se hereda.
const BOTONES = {
  primario: { caja: 'bg-accion border-accion', pres: 'bg-accion-pres border-accion-pres', texto: 'text-accion-texto' },
  secundario: { caja: 'bg-sec-fondo border-sec-borde', pres: 'bg-sec-pres border-sec-pres-borde', texto: 'text-texto' },
  fantasma: { caja: 'bg-transparent border-transparent', pres: 'bg-fantasma-pres border-transparent', texto: 'text-texto' },
  fantasmaPeligro: { caja: 'bg-transparent border-transparent', pres: 'bg-fantasma-pres border-transparent', texto: 'text-peligro' },
  peligro: { caja: 'bg-peligro border-peligro', pres: 'bg-peligro-pres border-peligro-pres', texto: 'text-peligro-sobre' },
} as const;

// Nombres de la versión 0.1: acento era el violeta de celebrar; con «Más» es el primario.
const ALIAS = { acento: 'primario', acentoSuave: 'secundario' } as const;

/** Variante de botón. 'acento' y 'acentoSuave' quedan por compatibilidad. */
export type VarianteBoton = keyof typeof BOTONES | keyof typeof ALIAS;

function estilo(v: VarianteBoton) {
  return BOTONES[(ALIAS as Record<string, keyof typeof BOTONES>)[v] ?? (v as keyof typeof BOTONES)];
}

// ── Botón de texto ───────────────────────────────────────────────────────────
export interface PropsBoton extends Omit<PressableProps, 'children'> {
  titulo: string;
  variante?: VarianteBoton;
  /** 56 dp (acciones principales de una pantalla y de la hoja inferior). */
  alto?: boolean;
  /** 64 dp y vibración media: «Empezar entrenamiento». */
  empezar?: boolean;
  /** Ocupa todo el ancho. */
  ancho?: boolean;
  /** Versión compacta (40 dp) para una fila; viene de la 0.1. */
  chico?: boolean;
  /** Muestra «Guardando…» (o el texto que pases) y no responde. */
  cargando?: boolean | string;
  /** Ícono a la izquierda del texto. */
  icono?: NombreIcono;
  className?: string;
}

/**
 * Botón con texto. Por defecto primario de 48 dp. Pon `alto` en la acción principal de la
 * pantalla y `ancho` cuando va solo en la barra de abajo.
 */
export function Boton({
  titulo,
  variante = 'primario',
  alto = false,
  empezar = false,
  ancho = false,
  chico = false,
  cargando = false,
  icono,
  className = '',
  disabled,
  onPressIn,
  ...p
}: PropsBoton) {
  const e = estilo(variante);
  const apagado = !!disabled || !!cargando;
  const altura = empezar ? 'min-h-[64px]' : alto ? 'min-h-[56px]' : chico ? 'min-h-[40px]' : 'min-h-[48px]';
  const tamanoTexto = empezar ? 'text-[18px]' : alto ? 'text-[17px]' : chico ? 'text-[14px]' : 'text-[16px]';
  const relleno = variante === 'fantasma' || variante === 'fantasmaPeligro' ? 'px-3' : chico ? 'px-4' : 'px-5';
  const texto = typeof cargando === 'string' ? cargando : cargando ? 'Guardando…' : titulo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: apagado, busy: !!cargando }}
      disabled={apagado}
      hitSlop={chico ? 4 : 0}
      onPressIn={(ev) => {
        vibrarPresion(empezar);
        onPressIn?.(ev);
      }}
      className={`${ancho ? 'w-full' : ''} ${className}`}
      {...p}
    >
      {({ pressed }) => (
        <View
          className={`flex-row items-center justify-center gap-2 rounded-control border-2 ${altura} ${relleno} ${
            apagado ? 'border-desh-fondo bg-desh-fondo' : pressed ? e.pres : e.caja
          } ${variante.startsWith('fantasma') && apagado ? 'border-transparent bg-transparent' : ''}`}
        >
          {icono ? <Icono nombre={icono} tamano={20} /> : null}
          <Text className={`font-sans-semibold ${tamanoTexto} ${apagado ? 'text-desh-texto' : e.texto}`}>{texto}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Botón de ícono ───────────────────────────────────────────────────────────
/**
 * Botón cuadrado de 48 dp (o 56 con `alto`) con un ícono de 24, fondo transparente. `etiqueta`
 * es lo que lee el lector de pantalla: siempre pásala («Volver», «Cerrar»).
 */
export function BotonIcono({
  icono,
  etiqueta,
  onPress,
  disabled = false,
  alto = false,
  children,
}: {
  icono?: NombreIcono;
  etiqueta: string;
  onPress?: () => void;
  disabled?: boolean;
  alto?: boolean;
  /** En vez de un ícono de la lista, cualquier dibujo (por ejemplo el Simbolo). */
  children?: ReactNode;
}) {
  const lado = alto ? 'h-[56px] w-[56px]' : 'h-[48px] w-[48px]';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => vibrarPresion()}
      className={`${lado} items-center justify-center rounded-control active:bg-fantasma-pres`}
    >
      {children ?? (icono ? <IconoSegunEstado nombre={icono} apagado={disabled} /> : null)}
    </Pressable>
  );
}

function IconoSegunEstado({ nombre, apagado }: { nombre: NombreIcono; apagado: boolean }) {
  // El color apagado sale de la clase; el ícono necesita el hexadecimal, por eso va por opacidad.
  return (
    <View style={{ opacity: apagado ? 0.5 : 1 }}>
      <Icono nombre={nombre} />
    </View>
  );
}

// ── Botón redondo (0.1) ──────────────────────────────────────────────────────
/**
 * Botón con un signo adentro, de la versión 0.1. En pantallas nuevas usa BotonIcono o Paso.
 * Recibe `glifo`, `onPress`, `disabled` y `etiqueta` (lo que lee el lector de pantalla).
 */
export function BotonRedondo({
  glifo,
  onPress,
  disabled = false,
  etiqueta,
}: {
  glifo: string;
  onPress: () => void;
  disabled?: boolean;
  etiqueta?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? glifo}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      className={`h-12 w-12 items-center justify-center rounded-control border-2 border-sec-borde bg-sec-fondo ${disabled ? 'opacity-40' : 'active:bg-sec-pres'}`}
    >
      <Text className="font-mono-bold text-[20px] text-texto">{glifo}</Text>
    </Pressable>
  );
}
