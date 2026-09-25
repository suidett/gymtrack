import { View } from 'react-native';
import { Boton } from './Boton';
import { Tarjeta } from './Tarjeta';
import { Txt } from './Txt';

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

/** Confirmación en línea: sirve igual en Android y en web, sin diálogos nativos. */
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
