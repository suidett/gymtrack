import { fmtNum } from '@gymtrack/shared';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Boton, Cabecera, Campo, Confirmar, Dato, Pantalla, Separador, Stepper, Tarjeta, Txt } from '@/components/ui';
import { parseNumero } from '@/lib/tiempo';
import { rachaDias } from '@/store/selectors';
import { useStore } from '@/store/useStore';

export default function Perfil() {
  const perfil = useStore((s) => s.perfil);
  const sesiones = useStore((s) => s.sesiones);
  const rutinas = useStore((s) => s.rutinas);
  const actualizarPerfil = useStore((s) => s.actualizarPerfil);
  const restablecerDatos = useStore((s) => s.restablecerDatos);

  const [peso, setPeso] = useState(perfil.pesoCorporalKg != null ? fmtNum(perfil.pesoCorporalKg) : '');
  const [confirmar, setConfirmar] = useState(false);

  const cerradas = useMemo(() => sesiones.filter((s) => s.estado === 'cerrada').length, [sesiones]);
  const racha = useMemo(() => rachaDias(sesiones), [sesiones]);

  return (
    <Pantalla>
      <Cabecera titulo="Perfil" />
      <View className="flex-row gap-2">
        <Dato valor={String(cerradas)} etiqueta="sesiones" />
        <Dato valor={String(racha)} etiqueta="racha en días" />
        <Dato valor={String(rutinas.length)} etiqueta="rutinas" />
      </View>

      <Separador titulo="Datos personales" />
      <Tarjeta className="gap-4">
        <Campo
          etiqueta="Nombre"
          value={perfil.nombre}
          onChangeText={(t) => actualizarPerfil({ nombre: t })}
          placeholder="Cómo te llamas"
          autoCapitalize="words"
        />
        <Campo
          etiqueta="Peso corporal (kg)"
          value={peso}
          onChangeText={setPeso}
          onBlur={() => actualizarPerfil({ pesoCorporalKg: parseNumero(peso) })}
          keyboardType="decimal-pad"
          placeholder="Por ejemplo, 70,5"
        />
        <Txt v="pequeno">El peso corporal sirve para estimar las calorías de cada sesión.</Txt>
      </Tarjeta>

      <Separador titulo="Entrenamiento" />
      <Tarjeta>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Txt v="cuerpoMedio">Descanso predeterminado</Txt>
            <Txt v="secundario">Para los ejercicios nuevos que agregues a una rutina</Txt>
          </View>
          <Stepper
            valor={perfil.descansoDefaultS}
            onCambio={(v) => actualizarPerfil({ descansoDefaultS: v })}
            min={15}
            max={600}
            paso={15}
            formato={(v) => `${v} s`}
          />
        </View>
      </Tarjeta>

      <Separador titulo="Datos" />
      <Tarjeta className="gap-3">
        <Txt v="secundario">
          Todo se guarda en este teléfono. La cuenta, la sincronización y el entrenador llegan con el servidor.
        </Txt>
        <Boton titulo="Restablecer datos de ejemplo" variante="peligro" chico onPress={() => setConfirmar(true)} />
        {confirmar ? (
          <Confirmar
            pregunta="Se borran tus rutinas y sesiones y vuelve la rutina de ejemplo. ¿Seguir?"
            si="Sí, restablecer"
            onSi={() => {
              restablecerDatos();
              setConfirmar(false);
            }}
            onNo={() => setConfirmar(false)}
          />
        ) : null}
      </Tarjeta>

      <Txt v="pequeno" className="mt-6 text-center">GymTrack 0.1.0 · Expo SDK 57</Txt>
    </Pantalla>
  );
}
