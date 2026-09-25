import { colors } from '@gymtrack/tokens';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseNumero } from '@/lib/tiempo';

// Texto con variantes. Las clases de fuente llevan el peso en el nombre
// porque en React Native cada peso cargado es una familia distinta.
const VARIANTES = {
  titulo: 'font-sans-extrabold text-2xl text-ink',
  h2: 'font-sans-bold text-lg text-ink',
  h3: 'font-sans-bold text-base text-ink',
  cuerpo: 'font-sans text-base text-ink',
  cuerpoMedio: 'font-sans-semibold text-base text-ink',
  secundario: 'font-sans text-sm text-ink-muted',
  pequeno: 'font-sans text-xs text-ink-faint',
  etiqueta: 'font-mono text-[11px] uppercase tracking-widest text-ink-muted',
  etiquetaPrimaria: 'font-mono text-[11px] uppercase tracking-widest text-primary',
  cifra: 'font-mono-semibold text-2xl text-ink',
  cifraGrande: 'font-mono-semibold text-4xl text-ink',
  mono: 'font-mono text-sm text-ink',
  monoSecundario: 'font-mono text-xs text-ink-muted',
  enlace: 'font-sans-bold text-sm text-primary-deep',
} as const;

export type VarianteTxt = keyof typeof VARIANTES;

export function Txt({ v = 'cuerpo', className = '', ...p }: TextProps & { v?: VarianteTxt; className?: string }) {
  return <Text className={`${VARIANTES[v]} ${className}`} {...p} />;
}

const BOTONES = {
  primario: { caja: 'bg-primary', texto: 'text-white' },
  secundario: { caja: 'bg-primary-soft', texto: 'text-primary-deep' },
  fantasma: { caja: 'bg-transparent border border-line', texto: 'text-ink' },
  peligro: { caja: 'bg-danger-soft', texto: 'text-danger' },
  acento: { caja: 'bg-accent', texto: 'text-white' },
  acentoSuave: { caja: 'bg-accent-soft', texto: 'text-accent-deep' },
} as const;

export type VarianteBoton = keyof typeof BOTONES;

export function Boton({
  titulo,
  variante = 'primario',
  chico = false,
  className = '',
  disabled,
  ...p
}: PressableProps & { titulo: string; variante?: VarianteBoton; chico?: boolean; className?: string }) {
  const e = BOTONES[variante];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`items-center justify-center rounded-button ${chico ? 'px-4 py-2.5' : 'px-5 py-4'} ${e.caja} ${
        disabled ? 'opacity-40' : 'active:opacity-80'
      } ${className}`}
      {...p}
    >
      <Text className={`font-sans-bold ${chico ? 'text-sm' : 'text-base'} ${e.texto}`}>{titulo}</Text>
    </Pressable>
  );
}

// El tono es un prop y no una clase que compite: en NativeWind dos bg-* en el mismo
// className se resuelven por el orden del CSS generado, no por el orden escrito.
const TONOS = {
  normal: 'border-line bg-surface',
  primario: 'border-primary-soft bg-primary-soft',
  acento: 'border-accent bg-accent-soft',
  peligro: 'border-danger bg-danger-soft',
} as const;

export type TonoTarjeta = keyof typeof TONOS;

export function Tarjeta({ tono = 'normal', className = '', ...p }: ViewProps & { tono?: TonoTarjeta; className?: string }) {
  return <View className={`rounded-card border p-4 ${TONOS[tono]} ${className}`} {...p} />;
}

export function Chip({ titulo, activo, onPress }: { titulo: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className={`rounded-full px-3.5 py-2 ${activo ? 'bg-primary' : 'border border-line bg-surface'}`}
    >
      <Text className={`font-sans-semibold text-[13px] ${activo ? 'text-white' : 'text-ink-muted'}`}>{titulo}</Text>
    </Pressable>
  );
}

export function Chips<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: readonly { id: T; nombre: string }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {opciones.map((o) => (
        <Chip key={o.id} titulo={o.nombre} activo={o.id === valor} onPress={() => onCambio(o.id)} />
      ))}
    </View>
  );
}

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

export function Stepper({
  valor,
  onCambio,
  paso = 1,
  min = 0,
  max = 9999,
  formato,
  grande = false,
  editable = false,
}: {
  valor: number;
  onCambio: (v: number) => void;
  paso?: number;
  min?: number;
  max?: number;
  formato?: (v: number) => string;
  grande?: boolean;
  /** Permite tocar la cifra y escribirla, para no dar 32 toques hasta llegar a 80 kg. */
  editable?: boolean;
}) {
  const redondear = (n: number) => Math.round(n * 100) / 100;
  const borrador = useRef<string | null>(null);
  const confirmar = () => {
    if (borrador.current == null) return;
    const n = parseNumero(borrador.current);
    borrador.current = null;
    if (n != null) onCambio(Math.min(max, Math.max(min, redondear(n))));
  };
  const btn = `items-center justify-center rounded-full bg-primary-soft active:opacity-70 ${grande ? 'h-14 w-14' : 'h-10 w-10'}`;
  const txt = `font-sans-bold text-primary-deep ${grande ? 'text-2xl' : 'text-lg'}`;
  const cifra = `text-center font-mono-semibold text-ink ${grande ? 'min-w-[96px] text-3xl' : 'min-w-[64px] text-lg'}`;
  return (
    <View className="flex-row items-center gap-2">
      <Pressable accessibilityLabel={`bajar ${paso}`} className={btn} onPress={() => onCambio(Math.max(min, redondear(valor - paso)))}>
        <Text className={txt}>−</Text>
      </Pressable>
      {editable ? (
        <TextInput
          key={valor}
          defaultValue={String(valor).replace('.', ',')}
          onChangeText={(t) => {
            borrador.current = t;
          }}
          onBlur={confirmar}
          onSubmitEditing={confirmar}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel="escribir el valor"
          className={`${cifra} rounded-field border border-line bg-surface px-2 py-1`}
        />
      ) : (
        <Text className={cifra}>{formato ? formato(valor) : String(valor).replace('.', ',')}</Text>
      )}
      <Pressable accessibilityLabel={`subir ${paso}`} className={btn} onPress={() => onCambio(Math.min(max, redondear(valor + paso)))}>
        <Text className={txt}>+</Text>
      </Pressable>
    </View>
  );
}

export function Pantalla({
  children,
  scroll = true,
  sinPadding = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  sinPadding?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const padding = sinPadding ? '' : 'px-5';
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={`${padding} pb-12 pt-3`}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${padding} pt-3`}>{children}</View>
      )}
    </View>
  );
}

export function Cabecera({
  titulo,
  subtitulo,
  atras = false,
  derecha,
}: {
  titulo: string;
  subtitulo?: string;
  atras?: boolean;
  derecha?: ReactNode;
}) {
  return (
    <View className="mb-4 flex-row items-center gap-3">
      {atras ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="volver"
          onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface border border-line"
        >
          <Text className="font-sans-bold text-xl text-ink">‹</Text>
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Txt v="titulo">{titulo}</Txt>
        {subtitulo ? <Txt v="secundario" className="mt-0.5">{subtitulo}</Txt> : null}
      </View>
      {derecha}
    </View>
  );
}

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

export function Fila({
  onPress,
  izquierda,
  derecha,
  ultimo = false,
}: {
  onPress?: () => void;
  izquierda: ReactNode;
  derecha?: ReactNode;
  ultimo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 py-3 ${ultimo ? '' : 'border-b border-line'} ${onPress ? 'active:opacity-70' : ''}`}
    >
      <View className="flex-1">{izquierda}</View>
      {derecha}
    </Pressable>
  );
}

export function Separador({ titulo, className = '' }: { titulo: string; className?: string }) {
  return <Txt v="etiqueta" className={`mb-2 mt-5 ${className}`}>{titulo}</Txt>;
}

export function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <Tarjeta className="flex-1 items-center gap-1 px-2 py-3">
      <Txt v="cifra">{valor}</Txt>
      <Txt v="pequeno" className="text-center">{etiqueta}</Txt>
    </Tarjeta>
  );
}

export function BotonRedondo({
  glifo,
  onPress,
  disabled = false,
  etiqueta,
}: {
  glifo: string;
  onPress: () => void;
  disabled?: boolean;
  etiqueta?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? glifo}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      className={`h-10 w-10 items-center justify-center rounded-full border border-line bg-surface ${disabled ? 'opacity-30' : 'active:opacity-70'}`}
    >
      <Text className="font-sans-bold text-lg text-ink">{glifo}</Text>
    </Pressable>
  );
}

export function Etiqueta({ texto, acento = false }: { texto: string; acento?: boolean }) {
  return (
    <View className={`rounded-full px-2.5 py-1 ${acento ? 'bg-accent-soft' : 'bg-field'}`}>
      <Text className={`font-mono text-[11px] ${acento ? 'text-accent-deep' : 'text-ink-muted'}`}>{texto}</Text>
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
