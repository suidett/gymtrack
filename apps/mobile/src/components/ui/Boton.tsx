// ─────────────────────────────────────────────────────────────────────────────
// Boton · Zona: Kit de interfaz
//
// Qué hace: los botones de la app. Boton es el de texto (Guardar, Empezar sesión, Borrar) con sus
// variantes de color; BotonRedondo es el circulito con un solo signo (subir, bajar, quitar) que
// usa el editor de rutinas para ordenar los ejercicios de un día.
// Tócalo cuando: quieras cambiar el tamaño, el color o el estado apagado de todos los botones, o
// agregar una variante nueva.
// No lo toques para: cambiar un color de raíz (packages/tokens/index.js) ni para armar una
// pregunta de "estás seguro" (eso es Confirmar, en Vacio.tsx).
// Depende de: nada propio (solo React Native). Las clases bg-primary, rounded-button, etc. salen
// del preset de packages/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import { Pressable, Text, type PressableProps } from 'react-native';

// ── Variantes ────────────────────────────────────────────────────────────────
// Cada variante define la caja (fondo y borde) y el color del texto por separado, porque el texto
// va en un <Text> hijo y en React Native el color no se hereda del contenedor como en web.
const BOTONES = {
  primario: { caja: 'bg-primary', texto: 'text-white' },
  secundario: { caja: 'bg-primary-soft', texto: 'text-primary-deep' },
  fantasma: { caja: 'bg-transparent border border-line', texto: 'text-ink' },
  peligro: { caja: 'bg-danger-soft', texto: 'text-danger' },
  acento: { caja: 'bg-accent', texto: 'text-white' },
  acentoSuave: { caja: 'bg-accent-soft', texto: 'text-accent-deep' },
} as const;

/** Variante de botón: 'primario', 'secundario', 'fantasma', 'peligro', 'acento' o 'acentoSuave'. */
export type VarianteBoton = keyof typeof BOTONES;

// ── Botón de texto ───────────────────────────────────────────────────────────
/**
 * Botón con texto.
 * Recibe `titulo` (lo que dice), `variante` (por defecto 'primario'), `chico` para la versión
 * compacta que cabe en una fila, `disabled`, un `className` opcional (márgenes, flex-1) y el
 * resto de props de Pressable (onPress, etc.).
 * Apagado se ve al 40 % y no responde; activo se atenúa un poco mientras lo mantienes presionado.
 */
export function Boton({
  titulo,
  variante = 'primario',
  chico = false,
  className = '',
  disabled,
  ...p
}: PressableProps & { titulo: string; variante?: VarianteBoton; chico?: boolean; className?: string }) {
  // `disabled` se saca del resto de props para poder elegir el estilo según su valor.
  const e = BOTONES[variante];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`items-center justify-center rounded-button ${chico ? 'px-4 py-2.5' : 'px-5 py-4'} ${e.caja} ${
        disabled ? 'opacity-40' : 'active:opacity-80'
      } ${className}`}
      {...p}
    >
      <Text className={`font-sans-bold ${chico ? 'text-sm' : 'text-base'} ${e.texto}`}>{titulo}</Text>
    </Pressable>
  );
}

// ── Botón redondo ────────────────────────────────────────────────────────────
/**
 * Botón circular con un solo signo o letra adentro.
 * Recibe `glifo` (lo que se ve), `onPress`, `disabled` y `etiqueta`, el texto que lee el lector de
 * pantalla. Si no pasas etiqueta se usa el glifo, que para un lector no dice nada: pásala siempre.
 * Tiene hitSlop para que sea fácil de acertar aunque mida solo 40 px.
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
      hitSlop={6}
      className={`h-10 w-10 items-center justify-center rounded-full border border-line bg-surface ${disabled ? 'opacity-30' : 'active:opacity-70'}`}
    >
      <Text className="font-sans-bold text-lg text-ink">{glifo}</Text>
    </Pressable>
  );
}
