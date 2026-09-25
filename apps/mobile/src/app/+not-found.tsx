// ─────────────────────────────────────────────────────────────────────────────
// Página no encontrada · Zona: Rutas
//
// Qué hace: es lo que ve el alumno si llega a una dirección que no existe (un enlace viejo,
// una URL mal escrita en web, una sesión que se borró). Le ofrece volver a Hoy.
// Tócalo cuando: quieras cambiar el texto o a dónde lo mandas.
// Depende de: @/components/ui (Pantalla, Cabecera, Txt, Boton).
// ─────────────────────────────────────────────────────────────────────────────

import { router } from 'expo-router';
import { Boton, Cabecera, Pantalla, Txt } from '@/components/ui';

/**
 * Pantalla de respaldo. Expo Router la monta solo por el nombre del archivo (+not-found),
 * no hay que registrarla en ningún layout. No recibe props.
 * Usa `router.replace` y no `push` para que la dirección rota no quede en el historial y el
 * botón de volver no regrese a ella.
 */
export default function NoEncontrada() {
  return (
    <Pantalla>
      <Cabecera titulo="Página no encontrada" />
      <Txt v="secundario" className="mb-4">Esa dirección no existe en la app.</Txt>
      <Boton titulo="Volver al inicio" onPress={() => router.replace('/')} />
    </Pantalla>
  );
}
