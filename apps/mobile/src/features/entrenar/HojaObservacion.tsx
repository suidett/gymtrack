// ─────────────────────────────────────────────────────────────────────────────
// Hoja de observación o dolor · Zona: Entrenar
//
// Qué hace: la hoja «Anotar en Sentadilla» del registro y «Sobre la sesión» de Rutina completada:
// elige Observación o Dolor; con Dolor pide «Dónde» (las zonas de la encuesta) y «Cuánto molesta»
// de 1 a 10 con más y menos de 56 dp; y el texto. Guardar devuelve lo escrito; quien la abre lo
// encola (sin señal queda en la cola).
// Tócalo cuando: cambie el formulario de observación de estas pantallas.
// No lo toques para: cómo se manda (almacen.ts, contrato.ts).
// Depende de: @/components/ui, @/lib/tema y ./contrato (ZONAS_DOLOR).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Boton, Chips, Hoja, Paso, Txt } from '@/components/ui';
import { useTema } from '@/lib/tema';
import { ZONAS_DOLOR } from './contrato';
import type { ObservacionGuardada, TipoObservacion } from './modelo';

const TIPOS = [
  { id: 'observacion', nombre: 'Observación' },
  { id: 'dolor', nombre: 'Dolor' },
] as const;

export function HojaObservacion({
  visible,
  titulo,
  nota,
  entrenador,
  ejemplos,
  onCerrar,
  onGuardar,
}: {
  visible: boolean;
  titulo: string;
  /** La línea gris de abajo («Camila la ve en tu ficha y te puede responder.»). */
  nota: string | null;
  /** Nombre del entrenador para el aviso de dolor fuerte; null si entrena solo. */
  entrenador: string | null;
  ejemplos: { observacion: string; dolor: string };
  onCerrar: () => void;
  onGuardar: (o: ObservacionGuardada) => void;
}) {
  const { c } = useTema();
  const [tipo, setTipo] = useState<TipoObservacion>('observacion');
  const [zona, setZona] = useState<string>('rodilla');
  const [intensidad, setIntensidad] = useState(3);
  const [texto, setTexto] = useState('');
  const esDolor = tipo === 'dolor';
  const puede = esDolor || texto.trim().length > 0;

  function cerrar() {
    onCerrar();
  }
  function guardar() {
    onGuardar({ tipo, texto, zona: esDolor ? zona : null, intensidad: esDolor ? intensidad : null });
    setTexto('');
    setTipo('observacion');
  }

  return (
    <Hoja
      visible={visible}
      onCerrar={cerrar}
      titulo={titulo}
      acciones={
        <>
          <Boton titulo="Cancelar" variante="secundario" alto className="flex-1" onPress={cerrar} />
          <Boton titulo="Guardar" alto className="flex-1" disabled={!puede} onPress={guardar} />
        </>
      }
    >
      <View className="mt-3">
        <Chips opciones={TIPOS} valor={tipo} onCambio={setTipo} />
      </View>
      {esDolor ? (
        <>
          <Txt v="etiquetaCampo" className="mb-2 mt-4 text-[14px]">
            Dónde
          </Txt>
          <Chips opciones={ZONAS_DOLOR} valor={zona} onCambio={setZona} />
          <Txt v="etiquetaCampo" className="mb-2 mt-4 text-[14px]">
            Cuánto molesta
          </Txt>
          <Paso valor={intensidad} onCambiar={setIntensidad} min={1} max={10} unidad="de 10" etiqueta="Cuánto molesta" />
          <Txt v="sec" className="mt-2 text-[13px]">
            {entrenador ? `Con 7 o más, ${entrenador} recibe un aviso al instante.` : 'Con 7 o más, queda marcado como dolor fuerte.'}
          </Txt>
        </>
      ) : null}
      <TextInput
        value={texto}
        onChangeText={setTexto}
        multiline
        accessibilityLabel={esDolor ? 'Qué dolor sentiste' : 'Qué quieres anotar'}
        placeholder={esDolor ? ejemplos.dolor : ejemplos.observacion}
        placeholderTextColor={c['texto-2']}
        className="mt-4 min-h-[96px] rounded-control border-2 border-campo-borde bg-campo-fondo px-3 py-3 font-sans-medium text-[16px] text-texto"
        style={{ textAlignVertical: 'top' }}
      />
      {nota ? (
        <Txt v="sec" className="mt-2 text-[13px]">
          {nota}
        </Txt>
      ) : null}
    </Hoja>
  );
}
