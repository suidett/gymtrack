// ─────────────────────────────────────────────────────────────────────────────
// Avisos en este teléfono · Zona: Notificaciones (app)
//
// Qué hace: la primera fila de la tarjeta «Avisos» de Perfil (alumno y entrenador). Dice si los
// avisos llegan a este teléfono o navegador y, si no, por qué y qué hacer:
//   sin_pedir         botón «Activar avisos» (pide el permiso y registra el teléfono en la API);
//   instalar_primero  iPhone en Safari: cómo agregar la app a la pantalla de inicio, y el botón;
//   denegado          cómo activarlos en los ajustes;
//   activos           listo.
// El entrenador además tiene «Probar avisos»: un push a sus teléfonos y un correo a su dirección
// (POST /v1/notificaciones/prueba), para revisar Expo, Web Push y Gmail antes de una demostración.
// El botón llama a `activar` directo en su onPress: en el iPhone el permiso solo sale de un toque.
// Tócalo cuando: cambie lo que se muestra de los avisos del teléfono.
// No lo toques para: los textos de cada estado ni el flujo (src/lib/notificaciones/registro.ts).
// Depende de: @/components/ui y @/lib/notificaciones.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { View } from 'react-native';
import { Boton, Txt, useAviso } from '@/components/ui';
import { plataformaDeAvisos, probarAvisos, useAvisos } from '@/lib/notificaciones';

export function AvisosDelTelefono({ conPrueba = false }: { conPrueba?: boolean }) {
  const a = useAvisos();
  const aviso = useAviso();
  const [probando, setProbando] = useState(false);
  const dondeLlegan = plataformaDeAvisos === 'web' ? 'Avisos en este navegador' : 'Avisos en este teléfono';
  const puedeActivar = a.estado === 'sin_pedir' || a.estado === 'instalar_primero';

  async function probar() {
    setProbando(true);
    try {
      aviso.mostrar(await probarAvisos(true));
    } finally {
      setProbando(false);
    }
  }

  return (
    <View className="gap-1 py-3">
      <Txt v="cuerpoMedio">{dondeLlegan}</Txt>
      <Txt v="sec">{a.estado === null ? 'Revisando…' : a.mensaje}</Txt>
      {puedeActivar ? (
        <Boton
          titulo="Activar avisos"
          variante="secundario"
          ancho
          className="mt-2"
          cargando={a.ocupado ? 'Activando…' : false}
          onPress={() => {
            void a.activar().then((r) => aviso.mostrar(r.mensaje));
          }}
        />
      ) : null}
      {conPrueba && a.estado !== null ? (
        <Boton
          titulo="Probar avisos"
          variante="fantasma"
          className="mt-1 self-start"
          cargando={probando ? 'Mandando…' : false}
          onPress={probar}
        />
      ) : null}
    </View>
  );
}
