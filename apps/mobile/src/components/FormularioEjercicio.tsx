// ─────────────────────────────────────────────────────────────────────────────
// Formulario de ejercicio · Zona: Kit de interfaz
//
// Qué hace: los campos para crear o editar un ejercicio propio (nombre, grupo, equipo, patrón, cómo
// se registra, incremento sugerido e instrucciones). Guarda todo en estado local y recién al tocar el
// botón entrega los datos limpios a quien lo usa. Lo comparten la pantalla de nuevo ejercicio y la
// ficha en modo edición. Vive en src/components/ (no en ui/) porque conoce el dominio: sabe qué es
// un Exercise. El kit de ui/ es genérico.
// Tócalo cuando: se agregue o quite un campo de Exercise que el alumno pueda escribir, cambie la
// validación (hoy: nombre de 2 letras o más) o los textos de las opciones.
// No lo toques para: qué pasa con los datos al guardar (lo decide cada pantalla y el store en
// src/store/useStore.ts); ni para la lista de grupos, equipos y patrones, que vive en
// packages/shared/src/types.ts.
// Depende de: @gymtrack/shared (EQUIPOS, GRUPOS, PATRONES, TIPOS_CARGA y el tipo Exercise),
// @/components/ui y el tipo DatosEjercicio de @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────
import { EQUIPOS, GRUPOS, PATRONES, TIPOS_CARGA, type Exercise } from '@gymtrack/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { Boton, Campo, Chips, Stepper, Txt } from '@/components/ui';
import type { DatosEjercicio } from '@/store/useStore';

// ── Nombres visibles ─────────────────────────────────────────────────────────
// Los ids de types.ts (kg, peso_corporal, tiron...) son internos; esto es lo que lee el alumno en
// los chips. Con mayúscula inicial porque cada chip es un botón suelto.

/** Texto de cada tipo de carga: explica cómo se va a registrar el ejercicio en la sesión. */
const NOMBRE_TIPO: Record<Exercise['tipoCarga'], string> = {
  kg: 'Kilos y repeticiones',
  peso_corporal: 'Peso corporal (lastre opcional)',
  tiempo: 'Tiempo en segundos',
};

/** Texto de cada patrón de movimiento. La ficha del ejercicio tiene su propia copia en minúsculas. */
const NOMBRE_PATRON: Record<Exercise['patron'], string> = {
  empuje: 'Empuje',
  tiron: 'Tirón',
  rodilla: 'Rodilla',
  cadera: 'Cadera',
  core: 'Core',
  aislamiento: 'Aislamiento',
};

/**
 * Formulario de un ejercicio propio.
 * - `inicial`: valores con que parte (para editar). Si falta, parte en Pecho, Barra, empuje, kg y 2,5 kg.
 * - `textoGuardar`: el texto del botón ("Guardar ejercicio", "Guardar cambios").
 * - `onGuardar`: recibe los datos ya limpios (nombre sin espacios sobrantes, instrucciones undefined
 *   si quedaron vacías). Guardar y navegar es tarea de quien lo usa; el formulario no toca el store.
 * El botón queda deshabilitado hasta que el nombre tenga al menos 2 letras.
 */
export function FormularioEjercicio({
  inicial,
  textoGuardar,
  onGuardar,
}: {
  inicial?: Partial<DatosEjercicio>;
  textoGuardar: string;
  onGuardar: (d: DatosEjercicio) => void;
}) {
  // ── Estado local del formulario ──────────────────────────────────────────────
  // Es estado local (Campo, no CampoDiferido) porque nada se guarda hasta tocar el botón. `inicial`
  // se lee una sola vez, al montar: si cambiara después, el formulario no se refresca. Cada pantalla
  // lo monta de nuevo, así que hoy no importa.
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [grupo, setGrupo] = useState<Exercise['grupo']>(inicial?.grupo ?? 'Pecho');
  const [equipo, setEquipo] = useState<Exercise['equipo']>(inicial?.equipo ?? 'Barra');
  const [patron, setPatron] = useState<Exercise['patron']>(inicial?.patron ?? 'empuje');
  const [tipoCarga, setTipoCarga] = useState<Exercise['tipoCarga']>(inicial?.tipoCarga ?? 'kg');
  const [incrementoKg, setIncrementoKg] = useState(inicial?.incrementoKg ?? 2.5);
  const [instrucciones, setInstrucciones] = useState(inicial?.instrucciones ?? '');

  // Única validación: dos letras evitan guardar un ejercicio sin nombre o con una letra por error.
  const valido = nombre.trim().length >= 2;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View className="gap-5">
      <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Por ejemplo, Press inclinado en máquina" />
      <View className="gap-2">
        <Txt v="etiqueta">Grupo muscular</Txt>
        <Chips opciones={GRUPOS.map((g) => ({ id: g, nombre: g }))} valor={grupo} onCambio={setGrupo} />
      </View>
      <View className="gap-2">
        <Txt v="etiqueta">Equipo</Txt>
        <Chips opciones={EQUIPOS.map((e) => ({ id: e, nombre: e }))} valor={equipo} onCambio={setEquipo} />
      </View>
      <View className="gap-2">
        <Txt v="etiqueta">Patrón de movimiento</Txt>
        <Chips opciones={PATRONES.map((p) => ({ id: p, nombre: NOMBRE_PATRON[p] }))} valor={patron} onCambio={setPatron} />
      </View>
      <View className="gap-2">
        <Txt v="etiqueta">Cómo se registra</Txt>
        <Chips opciones={TIPOS_CARGA.map((t) => ({ id: t, nombre: NOMBRE_TIPO[t] }))} valor={tipoCarga} onCambio={setTipoCarga} />
      </View>
      {/* Coma decimal, como en toda la app. Es el incremento sugerido: cada rutina puede cambiarlo
          para ese ejercicio sin tocar la biblioteca. */}
      <View className="gap-2">
        <Txt v="etiqueta">Incremento de carga sugerido</Txt>
        <Stepper valor={incrementoKg} onCambio={setIncrementoKg} paso={0.5} min={0} max={20} formato={(v) => `${String(v).replace('.', ',')} kg`} />
      </View>
      {/* textAlignVertical="top": en Android un multiline centra el texto verticalmente si no se dice. */}
      <Campo
        etiqueta="Instrucciones (opcional)"
        value={instrucciones}
        onChangeText={setInstrucciones}
        placeholder="Puntos de técnica, agarre, tempo"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      {/* Limpia antes de entregar: nombre sin espacios sobrantes e instrucciones undefined si quedaron vacías. */}
      <Boton
        titulo={textoGuardar}
        disabled={!valido}
        onPress={() =>
          onGuardar({
            nombre: nombre.trim(),
            grupo,
            equipo,
            patron,
            tipoCarga,
            incrementoKg,
            instrucciones: instrucciones.trim() || undefined,
          })
        }
      />
    </View>
  );
}
