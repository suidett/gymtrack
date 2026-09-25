import { EQUIPOS, GRUPOS, PATRONES, TIPOS_CARGA, type Exercise } from '@gymtrack/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { Boton, Campo, Chips, Stepper, Txt } from '@/components/ui';
import type { DatosEjercicio } from '@/store/useStore';

const NOMBRE_TIPO: Record<Exercise['tipoCarga'], string> = {
  kg: 'Kilos y repeticiones',
  peso_corporal: 'Peso corporal (lastre opcional)',
  tiempo: 'Tiempo en segundos',
};

const NOMBRE_PATRON: Record<Exercise['patron'], string> = {
  empuje: 'Empuje',
  tiron: 'Tirón',
  rodilla: 'Rodilla',
  cadera: 'Cadera',
  core: 'Core',
  aislamiento: 'Aislamiento',
};

export function FormularioEjercicio({
  inicial,
  textoGuardar,
  onGuardar,
}: {
  inicial?: Partial<DatosEjercicio>;
  textoGuardar: string;
  onGuardar: (d: DatosEjercicio) => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [grupo, setGrupo] = useState<Exercise['grupo']>(inicial?.grupo ?? 'Pecho');
  const [equipo, setEquipo] = useState<Exercise['equipo']>(inicial?.equipo ?? 'Barra');
  const [patron, setPatron] = useState<Exercise['patron']>(inicial?.patron ?? 'empuje');
  const [tipoCarga, setTipoCarga] = useState<Exercise['tipoCarga']>(inicial?.tipoCarga ?? 'kg');
  const [incrementoKg, setIncrementoKg] = useState(inicial?.incrementoKg ?? 2.5);
  const [instrucciones, setInstrucciones] = useState(inicial?.instrucciones ?? '');

  const valido = nombre.trim().length >= 2;

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
      <View className="gap-2">
        <Txt v="etiqueta">Incremento de carga sugerido</Txt>
        <Stepper valor={incrementoKg} onCambio={setIncrementoKg} paso={0.5} min={0} max={20} formato={(v) => `${String(v).replace('.', ',')} kg`} />
      </View>
      <Campo
        etiqueta="Instrucciones (opcional)"
        value={instrucciones}
        onChangeText={setInstrucciones}
        placeholder="Puntos de técnica, agarre, tempo"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
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
