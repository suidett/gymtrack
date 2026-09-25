import { colors } from '@gymtrack/tokens';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Txt } from './Txt';

export function Campo({
  etiqueta,
  className = '',
  ...p
}: TextInputProps & { etiqueta?: string; className?: string }) {
  return (
    <View className={`gap-1.5 ${className}`}>
      {etiqueta ? <Txt v="etiqueta">{etiqueta}</Txt> : null}
      <TextInput
        placeholderTextColor={colors.ink.faint}
        className="rounded-field border border-line bg-surface px-4 py-3.5 font-sans text-base text-ink"
        {...p}
      />
    </View>
  );
}

/**
 * TextInput que confirma al perder el foco, al enviar o al desmontarse, en vez de
 * escribir en el store persistido con cada tecla.
 */
export function EntradaDiferida({
  valor,
  onConfirmar,
  className = '',
  ...p
}: Omit<TextInputProps, 'value' | 'onChangeText'> & {
  valor: string;
  onConfirmar: (texto: string) => void;
  className?: string;
}) {
  const [texto, setTexto] = useState(valor);
  const ultimo = useRef(valor);
  const confirmado = useRef(valor);
  const onConfirmarRef = useRef(onConfirmar);
  useEffect(() => {
    onConfirmarRef.current = onConfirmar;
  });

  const confirmar = () => {
    if (ultimo.current === confirmado.current) return;
    confirmado.current = ultimo.current;
    onConfirmarRef.current(ultimo.current);
  };

  useEffect(() => {
    return () => {
      if (ultimo.current !== confirmado.current) {
        confirmado.current = ultimo.current;
        onConfirmarRef.current(ultimo.current);
      }
    };
  }, []);

  return (
    <TextInput
      value={texto}
      onChangeText={(t) => {
        ultimo.current = t;
        setTexto(t);
      }}
      onBlur={confirmar}
      onSubmitEditing={confirmar}
      placeholderTextColor={colors.ink.faint}
      className={className}
      {...p}
    />
  );
}

export function CampoDiferido({
  etiqueta,
  className = '',
  ...p
}: Omit<TextInputProps, 'value' | 'onChangeText'> & {
  etiqueta?: string;
  valor: string;
  onConfirmar: (texto: string) => void;
  className?: string;
}) {
  return (
    <View className={`gap-1.5 ${className}`}>
      {etiqueta ? <Txt v="etiqueta">{etiqueta}</Txt> : null}
      <EntradaDiferida className="rounded-field border border-line bg-surface px-4 py-3.5 font-sans text-base text-ink" {...p} />
    </View>
  );
}
