// ─────────────────────────────────────────────────────────────────────────────
// Fuentes de la marca · Zona: Diseño
//
// Qué hace: carga Archivo (interfaz) y JetBrains Mono (cifras) con expo-font. Importa cada peso
// por su subcarpeta para que el paquete lleve solo los pesos que usa y no los 18 de cada familia.
// Tócalo cuando: sumes un peso. Súmalo también en packages/tokens/index.js y tailwind.preset.js.
// No lo toques para: cambiar qué fuente usa un texto (va en la clase: font-sans-bold...).
// Depende de: expo-font, @expo-google-fonts/archivo y @expo-google-fonts/jetbrains-mono.
// ─────────────────────────────────────────────────────────────────────────────
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useFonts } from 'expo-font';

/** Las claves son los nombres de familia de packages/tokens (fonts.sans.*, fonts.mono.*). */
const FUENTES = {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
};

/** true cuando las fuentes están listas o fallaron (en ese caso se sigue con la del sistema). */
export function useFuentes(): boolean {
  const [listas, error] = useFonts(FUENTES);
  return listas || !!error;
}
