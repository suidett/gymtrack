// ─────────────────────────────────────────────────────────────────────────────
// Pantalla Perfil · Zona: Rutas
//
// Qué hace: el alumno pone su nombre y su peso corporal (sirve para estimar las calorías de
// cada sesión), elige el descanso predeterminado para los ejercicios nuevos y, si quiere partir
// de cero, restablece los datos de ejemplo. Arriba ve sus totales: sesiones cerradas, racha y
// rutinas.
// Tócalo cuando: agregues un dato al perfil, cambies los límites del descanso o los textos.
// No lo toques para: cambiar qué campos tiene el perfil o qué hace restablecer (Perfil y
// restablecerDatos en src/store/useStore.ts), cómo se cuenta la racha (src/store/selectors.ts)
// ni los campos y el stepper en sí (src/components/ui/).
// Depende de: @gymtrack/shared (fmtNum), @/components/ui, @/lib/tiempo (parseNumero),
// @/store/selectors (rachaDias) y @/store/useStore.
// ─────────────────────────────────────────────────────────────────────────────

import { fmtNum } from '@gymtrack/shared';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Boton, Cabecera, Campo, CampoDiferido, Confirmar, Dato, Pantalla, Separador, Stepper, Tarjeta, Txt } from '@/components/ui';
import { parseNumero } from '@/lib/tiempo';
import { rachaDias } from '@/store/selectors';
import { useStore } from '@/store/useStore';

/**
 * Pestaña Perfil. No recibe props. Cada campo guarda al perder el foco (no en cada tecla):
 * el nombre por CampoDiferido, el peso con su onBlur y el descanso en cada toque del stepper.
 */
export default function Perfil() {
  // ── Estado del store ─────────────────────────────────────────────────────────
  const perfil = useStore((s) => s.perfil);
  const sesiones = useStore((s) => s.sesiones);
  const rutinas = useStore((s) => s.rutinas);
  const actualizarPerfil = useStore((s) => s.actualizarPerfil);
  const restablecerDatos = useStore((s) => s.restablecerDatos);

  // ── Estado local ─────────────────────────────────────────────────────────────
  // El peso se edita como texto y no con CampoDiferido porque en el store es un número y el
  // alumno escribe con coma ("70,5"): se convierte recién al salir del campo con parseNumero.
  // Se inicializa con fmtNum para que aparezca con coma decimal, igual que en el resto de la app.
  const [peso, setPeso] = useState(perfil.pesoCorporalKg != null ? fmtNum(perfil.pesoCorporalKg) : '');
  // Muestra la confirmación en línea antes de restablecer (Alert.alert no anda en web).
  const [confirmar, setConfirmar] = useState(false);

  // ── Datos derivados ──────────────────────────────────────────────────────────
  // Solo hace falta contar, por eso se filtra directo en vez de usar sesionesCerradas (que ordena).
  const cerradas = useMemo(() => sesiones.filter((s) => s.estado === 'cerrada').length, [sesiones]);
  const racha = useMemo(() => rachaDias(sesiones), [sesiones]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Pantalla>
      <Cabecera titulo="Perfil" />
      {/* Totales de toda la vida, no del mes: por eso no se usa estadisticasDelMes */}
      <View className="flex-row gap-2">
        <Dato valor={String(cerradas)} etiqueta="sesiones" />
        <Dato valor={String(racha)} etiqueta="racha en días" />
        <Dato valor={String(rutinas.length)} etiqueta="rutinas" />
      </View>

      {/* Nombre: se guarda al perder el foco, sin espacios en las puntas.
          Peso: parseNumero devuelve null si el texto está vacío o no es número, y eso borra el
          peso guardado; el texto del campo queda como lo escribió el alumno. */}
      <Separador titulo="Datos personales" />
      <Tarjeta className="gap-4">
        <CampoDiferido
          etiqueta="Nombre"
          valor={perfil.nombre}
          onConfirmar={(t) => actualizarPerfil({ nombre: t.trim() })}
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

      {/* Descanso de 15 s a 10 min, de a 15 s. Solo afecta a los ejercicios que se agreguen a una
          rutina de aquí en adelante; los que ya están conservan su descanso. */}
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

      {/* Restablecer vuelve a sembrar: biblioteca base más la rutina de ejemplo, y borra las
          sesiones. El perfil (nombre, peso, descanso) se conserva porque sembrar no lo toca. */}
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

      {/* La versión está escrita a mano: si cambias "version" en app.json, cámbiala aquí también */}
      <Txt v="pequeno" className="mt-6 text-center">GymTrack 0.1.0 · Expo SDK 57</Txt>
    </Pantalla>
  );
}
