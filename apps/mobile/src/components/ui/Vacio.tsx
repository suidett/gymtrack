// ─────────────────────────────────────────────────────────────────────────────
// Vacio · Zona: Kit de interfaz
//
// Qué hace: dos tarjetas de aviso. Vacio es el estado vacío de una lista ("Todavía no tienes
// rutinas") con un texto y un botón opcional para arrancar; Confirmar es la pregunta en línea
// antes de algo delicado (borrar una rutina, vaciar los datos), con su botón de sí y el de
// cancelar.
// Tócalo cuando: quieras cambiar cómo se ven todos los estados vacíos o todas las confirmaciones
// (colores, botones, alineación).
// No lo toques para: los textos de cada aviso (los pasa cada pantalla) ni para los botones en sí
// (Boton.tsx).
// Depende de: Boton (./Boton), Tarjeta (./Tarjeta) y Txt (./Txt).
// ─────────────────────────────────────────────────────────────────────────────
import { View } from 'react-native';
import { Boton } from './Boton';
import { Tarjeta } from './Tarjeta';
import { Txt } from './Txt';

// ── Estado vacío ─────────────────────────────────────────────────────────────
/**
 * Tarjeta centrada para cuando una lista no tiene nada que mostrar.
 * Recibe `titulo`, `texto` opcional que explica qué va a aparecer ahí, y `accion` con `onAccion`
 * para ofrecer un botón; el botón solo se muestra si vienen los dos.
 */
export function Vacio({
  titulo,
  texto,
  accion,
  onAccion,
}: {
  titulo: string;
  texto?: string;
  accion?: string;
  onAccion?: () => void;
}) {
  return (
    <Tarjeta className="items-center gap-2 py-8">
      <Txt v="h3" className="text-center">{titulo}</Txt>
      {texto ? <Txt v="secundario" className="text-center">{texto}</Txt> : null}
      {accion && onAccion ? <Boton titulo={accion} variante="secundario" chico className="mt-2" onPress={onAccion} /> : null}
    </Tarjeta>
  );
}

// ── Confirmación en línea ────────────────────────────────────────────────────
/**
 * Confirmación en línea: sirve igual en Android y en web, sin diálogos nativos.
 * Recibe `pregunta`, `si` (el texto del botón que confirma, en verbo: "Borrar", "Vaciar"), `onSi`,
 * `onNo` (el botón dice siempre "Cancelar") y `peligro`, que por defecto es true y la pinta en
 * rojo; en false va en violeta, para acciones que no destruyen nada.
 * La pantalla decide cuándo mostrarla: normalmente con un useState que la cambia por el botón.
 */
export function Confirmar({
  pregunta,
  si,
  onSi,
  onNo,
  peligro = true,
}: {
  pregunta: string;
  si: string;
  onSi: () => void;
  onNo: () => void;
  peligro?: boolean;
}) {
  return (
    <Tarjeta tono={peligro ? 'peligro' : 'acento'} className="gap-3">
      <Txt v="cuerpoMedio">{pregunta}</Txt>
      <View className="flex-row gap-2">
        <Boton titulo={si} variante={peligro ? 'peligro' : 'acento'} chico onPress={onSi} className="flex-1" />
        <Boton titulo="Cancelar" variante="fantasma" chico onPress={onNo} className="flex-1" />
      </View>
    </Tarjeta>
  );
}
