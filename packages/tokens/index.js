// Tokens de diseño de GymTrack. Tres familias de color (menta, violeta, tinta)
// más neutros, dos tipografías y los radios del diseño. Es CommonJS porque
// tailwind.config.js lo carga con require; la app lo importa como objeto.

const colors = {
  primary: { DEFAULT: '#45B392', deep: '#2f7f68', soft: '#E3F3ED', bright: '#7BE0BE' },
  accent: { DEFAULT: '#8B7BE8', deep: '#5B4CB8', soft: '#EDE9FD', bright: '#A895FF' },
  ink: { DEFAULT: '#131A17', muted: '#71817B', faint: '#8B9A94' },
  bg: '#F5F7F5',
  surface: '#FFFFFF',
  line: '#E6ECE8',
  field: '#E9EDEA',
  danger: { DEFAULT: '#B4544E', soft: '#FBEAE8' },
  gym: { bg: '#08120E', card: '#18211E', line: '#23302B', text: '#F2F6F4', muted: '#6E807A' },
};

// Nombres tal como los registra expo-font al cargar @expo-google-fonts.
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

const radius = { field: 13, button: 14, card: 16, tab: 12, pill: 999 };

module.exports = { colors, fonts, radius };
