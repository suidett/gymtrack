// ─────────────────────────────────────────────────────────────────────────────
// Tokens de diseño · Zona: Diseño
//
// Qué hace: es la única fuente de verdad de la apariencia de GymTrack. Define los colores
// (menta para la acción, violeta para celebrar un récord y para el descanso, tinta para el
// texto, más los neutros de fondo y borde), las dos tipografías (Manrope para texto e IBM Plex
// Mono para cifras como kilos y repeticiones) y los radios de las esquinas. De aquí salen las
// clases de NativeWind (bg-primary, text-ink-muted, font-sans-bold, rounded-card) y el objeto
// que se usa desde código cuando no hay className, como el fondo de la pila de navegación.
// Tócalo cuando: quieras cambiar un color, agregar un tono nuevo, sumar un peso de fuente o
// ajustar un radio. Un cambio acá se ve en toda la app sin tocar ninguna pantalla.
// No lo toques para: cambiar cómo se ve un botón o una tarjeta en particular (eso vive en
// apps/mobile/src/components/ui/) ni para registrar una fuente nueva al arrancar (eso lo hace
// apps/mobile/src/app/_layout.tsx con useFonts).
// Depende de: nada propio. Lo leen tailwind.preset.js (mismo paquete) y la app vía
// @gymtrack/tokens; index.d.ts describe sus tipos para TypeScript.
// ─────────────────────────────────────────────────────────────────────────────

// Es CommonJS (module.exports) y no ESM porque tailwind.config.js lo carga con require en
// Node, sin transpilar. La app lo importa igual, como un objeto normal.

// ── Colores ──────────────────────────────────────────────────────────────────
/**
 * Paleta de la app. Las familias con DEFAULT son un color de raíz con sus variantes:
 * `deep` para texto de ese color sobre fondo claro, `soft` para fondos teñidos (tarjetas de
 * acento, chips, la pestaña activa) y `bright` para el mismo color sobre fondo oscuro.
 * En Tailwind, DEFAULT es la clase sin sufijo (`bg-primary`) y las variantes van con guion
 * (`bg-primary-soft`, `text-ink-muted`). Los hexadecimales se escriben solo acá: en las
 * pantallas siempre se usa la clase, o `colors.x` cuando el componente no acepta className.
 * Ojo: apps/mobile/app.json repite a mano `bg` (fondo del splash) y `primary.soft` (fondo del
 * ícono de Android). Si cambias esos dos, actualízalos allá también.
 */
const colors = {
  // Menta. El color de la acción: botón principal, serie marcada como hecha, pestaña activa.
  primary: { DEFAULT: '#45B392', deep: '#2f7f68', soft: '#E3F3ED', bright: '#7BE0BE' },
  // Violeta. Celebra (un récord, la sesión en curso) y acompaña el descanso entre series.
  accent: { DEFAULT: '#8B7BE8', deep: '#5B4CB8', soft: '#EDE9FD', bright: '#A895FF' },
  // Tinta. El texto: DEFAULT para títulos y cifras, muted para lo secundario, faint para
  // placeholders y etiquetas que casi no importan.
  ink: { DEFAULT: '#131A17', muted: '#71817B', faint: '#8B9A94' },
  // Neutros: fondo general de las pantallas, superficie de tarjetas y botones, borde fino y
  // relleno de los campos de texto.
  bg: '#F5F7F5',
  surface: '#FFFFFF',
  line: '#E6ECE8',
  field: '#E9EDEA',
  // Rojo apagado para borrar, una serie con fallo o una variación negativa en el progreso;
  // soft es su fondo teñido.
  danger: { DEFAULT: '#B4544E', soft: '#FBEAE8' },
  // Paleta oscura pensada para un modo gimnasio (pantalla negra con letras claras). Hoy
  // ninguna pantalla la usa; queda lista para cuando se construya.
  gym: { bg: '#08120E', card: '#18211E', line: '#23302B', text: '#F2F6F4', muted: '#6E807A' },
};

// ── Fuentes ──────────────────────────────────────────────────────────────────
/**
 * Familias tipográficas, con los nombres exactos que registra expo-font al cargar los paquetes
 * @expo-google-fonts. Cada peso es una familia distinta porque React Native no combina
 * `fontWeight` con una fuente cargada; por eso las clases llevan el peso en el nombre
 * (`font-sans-bold`, `font-mono-medium`) y nunca se usa `font-bold` a secas.
 * `sans` (Manrope) es para todo el texto; `mono` (IBM Plex Mono) para cifras como kilos,
 * repeticiones y el cronómetro, porque sus dígitos miden lo mismo y las columnas quedan alineadas.
 * Si agregas un peso, súmalo en tres lugares: acá, en `fontFamily` de tailwind.preset.js y en
 * el `useFonts` de apps/mobile/src/app/_layout.tsx. Si falta en alguno, la clase existe pero no
 * encuentra la fuente y el texto sale con la del sistema.
 */
const fonts = {
  sans: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },
  mono: {
    regular: 'IBMPlexMono_400Regular',
    medium: 'IBMPlexMono_500Medium',
    semibold: 'IBMPlexMono_600SemiBold',
  },
};

// ── Radios ───────────────────────────────────────────────────────────────────
/**
 * Radios de esquina en píxeles. `field` para campos de texto, `button` para botones, `card`
 * para tarjetas, `tab` para la pestaña activa de la barra inferior y `pill` para lo totalmente
 * redondeado. En el preset se vuelven las clases `rounded-field`, `rounded-button`,
 * `rounded-card` y `rounded-tab`; `pill` no tiene clase propia (la app usa `rounded-full`, que
 * ya viene con Tailwind) y existe solo para quien lo necesite desde código.
 */
const radius = { field: 13, button: 14, card: 16, tab: 12, pill: 999 };

// Lo que se exporta es exactamente lo que tipa index.d.ts: si agregas una clave acá, agrégala
// allá también o TypeScript no la va a ver desde la app.
module.exports = { colors, fonts, radius };
