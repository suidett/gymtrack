// ─────────────────────────────────────────────────────────────────────────────
// Visor 3D del ejercicio (Android) · Zona: Componentes (app)
//
// Qué hace: muestra el maniquí 3D de un ejercicio de la biblioteca dentro de la app, en bucle,
// con Frente, Lado, 3/4, pausa y giro con el dedo. Carga la página del visor (./direccionVisor3D) en
// un WebView; mientras carga muestra el ámbar girando y, si falla, un aviso con Reintentar.
// En la web se usa VisorEjercicio3D.web.tsx (un iframe), que Metro elige solo.
// Tócalo cuando: cambie cómo se incrusta el visor en Android.
// No lo toques para: la figura ni sus movimientos (docs/pantallas/3d).
// Depende de: react-native-webview, ./ui y ./direccionVisor3D.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Boton, Txt } from './ui';
import { FONDO_VISOR_3D, urlVisor3D } from './direccionVisor3D';

export function Visor3D({ slug, nombre, alto = 300 }: { slug: string; nombre: string; alto?: number }) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);
  return (
    <View
      style={{ height: alto }}
      className="overflow-hidden rounded-control border border-sup-alta bg-sup"
      accessible
      accessibilityLabel={`Animación 3D de ${nombre}. Se puede girar con el dedo.`}
    >
      {estado === 'error' ? (
        <View className="flex-1 items-center justify-center gap-2 p-4">
          <Txt v="h3">No se pudo cargar el 3D</Txt>
          <Txt v="sec" className="text-center">Revisa tu conexión. La técnica de abajo está guardada en tu teléfono.</Txt>
          <Boton titulo="Reintentar" variante="secundario" onPress={() => { setEstado('cargando'); setIntento((n) => n + 1); }} />
        </View>
      ) : (
        <WebView
          key={`${slug}-${intento}`}
          source={{ uri: urlVisor3D(slug) }}
          originWhitelist={['https://*']}
          style={{ backgroundColor: FONDO_VISOR_3D }}
          containerStyle={{ backgroundColor: FONDO_VISOR_3D }}
          onLoadEnd={() => setEstado((e) => (e === 'error' ? e : 'listo'))}
          onError={() => setEstado('error')}
          onHttpError={() => setEstado('error')}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          scrollEnabled={false}
          bounces={false}
          nestedScrollEnabled
          overScrollMode="never"
          androidLayerType="hardware"
        />
      )}
      {estado === 'cargando' ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
          <ActivityIndicator color="#F5B83D" />
        </View>
      ) : null}
    </View>
  );
}
