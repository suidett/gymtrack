// ─────────────────────────────────────────────────────────────────────────────
// Visor 3D del ejercicio (web e iPhone) · Zona: Componentes (app)
//
// Qué hace: lo mismo que VisorEjercicio3D.tsx, pero en la app web (la que se instala en el iPhone desde
// Safari): la página del visor va en un iframe. Metro elige este archivo solo en web.
// Tócalo cuando: cambie cómo se incrusta el visor en la web.
// No lo toques para: la figura ni sus movimientos (docs/pantallas/3d).
// Depende de: react-native-web y ./direccionVisor3D.
// ─────────────────────────────────────────────────────────────────────────────
import { createElement } from 'react';
import { View } from 'react-native';
import { FONDO_VISOR_3D, urlVisor3D } from './direccionVisor3D';

export function Visor3D({ slug, nombre, alto = 300 }: { slug: string; nombre: string; alto?: number }) {
  return (
    <View style={{ height: alto }} className="overflow-hidden rounded-control border border-sup-alta bg-sup">
      {createElement('iframe', {
        key: slug,
        src: urlVisor3D(slug),
        title: `Animación 3D de ${nombre}. Se puede girar con el dedo.`,
        loading: 'lazy',
        style: { border: 0, width: '100%', height: '100%', display: 'block', background: FONDO_VISOR_3D },
      })}
    </View>
  );
}
