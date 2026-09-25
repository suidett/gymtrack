// ─────────────────────────────────────────────────────────────────────────────
// Campo · Zona: Kit de interfaz
//
// Qué hace: los campos de texto de la app (nombre de la rutina, notas de la sesión, peso
// corporal). Hay dos familias: Campo, un TextInput normal con etiqueta arriba, para texto que vive
// en el estado local de la pantalla; y las diferidas (EntradaDiferida y CampoDiferido), que
// entregan el texto solo al salir del campo, para no escribir en el store persistido con cada
// tecla.
// Tócalo cuando: quieras cambiar cómo se ven todos los campos (borde, relleno, etiqueta) o el
// momento en que un campo diferido confirma su texto.
// No lo toques para: validar o convertir lo escrito (por ejemplo, "70,5" a número: parseNumero en
// src/lib/tiempo.ts) ni para decidir qué hace la pantalla con el texto confirmado.
// Depende de: colors de packages/tokens (el color del placeholder) y Txt (./Txt).
// ─────────────────────────────────────────────────────────────────────────────
import { colors } from '@gymtrack/tokens';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Txt } from './Txt';

// ── Campo simple (estado local) ──────────────────────────────────────────────
/**
 * Campo de texto controlado, con etiqueta opcional arriba.
 * Recibe `etiqueta`, `className` (va al contenedor, no al TextInput) y el resto de props de
 * TextInput (value, onChangeText, placeholder, keyboardType...).
 * Úsalo cuando el texto vive en un useState de la pantalla. Si va directo al store, usa
 * CampoDiferido: con este, cada tecla dispararía un guardado en AsyncStorage.
 */
export function Campo({
  etiqueta,
  className = '',
  ...p
}: TextInputProps & { etiqueta?: string; className?: string }) {
  // El color del placeholder no se puede poner por className; va como prop con el token.
  // Queda antes del {...p} para que quien lo use pueda cambiarlo si hace falta.
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

// ── Entrada diferida ─────────────────────────────────────────────────────────
/**
 * TextInput que confirma al perder el foco, al enviar o al desmontarse, en vez de
 * escribir en el store persistido con cada tecla.
 * Recibe `valor` (el texto inicial, que viene del store), `onConfirmar` (se llama con el texto
 * final, y solo si cambió) y el resto de props de TextInput menos value y onChangeText, que los
 * maneja ella. No trae estilo propio: pásale className o usa CampoDiferido, que ya lo trae.
 * Si `valor` cambia desde afuera mientras el campo está montado, no se refleja: lo que se ve es
 * lo que se escribió. Si necesitas resetearlo, cámbiale la key.
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
  // Tres refs porque el blur y la limpieza del efecto no pueden depender del estado de React:
  // `ultimo` es lo último tecleado, `confirmado` lo último que ya se avisó, y `onConfirmarRef`
  // guarda la función más reciente para no llamar una versión vieja desde el desmontaje.
  const [texto, setTexto] = useState(valor);
  const ultimo = useRef(valor);
  const confirmado = useRef(valor);
  const onConfirmarRef = useRef(onConfirmar);
  useEffect(() => {
    onConfirmarRef.current = onConfirmar;
  });

  // Solo avisa si el texto cambió desde la última confirmación: entrar y salir del campo sin
  // tocar nada no genera guardados repetidos.
  const confirmar = () => {
    if (ultimo.current === confirmado.current) return;
    confirmado.current = ultimo.current;
    onConfirmarRef.current(ultimo.current);
  };

  // Al desmontarse (por ejemplo, el alumno vuelve atrás con el teclado abierto) no siempre llega
  // el blur, así que se confirma acá lo que quedó pendiente. El arreglo vacío es a propósito:
  // corre una sola vez, y por eso todo lo que lee son refs y no estado.
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

// ── Campo diferido (con etiqueta) ────────────────────────────────────────────
/**
 * EntradaDiferida con etiqueta arriba y el mismo estilo de Campo, para que se vean iguales.
 * Recibe `etiqueta`, `className` (va al contenedor) y todo lo de EntradaDiferida: `valor`,
 * `onConfirmar` y las props de TextInput. Es el campo que va con el store.
 */
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
