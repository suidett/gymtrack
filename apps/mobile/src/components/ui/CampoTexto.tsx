// ─────────────────────────────────────────────────────────────────────────────
// Campo de texto con etiqueta · Zona: Kit de interfaz
//
// Qué hace: el campo de las pantallas de acceso, encuesta y formularios: etiqueta arriba
// (Archivo 700, 16), caja de 56 dp con borde de 2 dp que cambia al color de edición cuando
// tiene el foco, ayuda o error abajo. El error se lee en voz alta y pinta el borde de peligro.
// Con `multilinea` es el área de texto de 104 dp (sistema.css, .area). `contrasena` agrega el
// botón Mostrar.
// Tócalo cuando: cambie cómo se ve un campo en toda la app.
// No lo toques para: los campos que guardan al perder el foco de la 0.1 (Campo.tsx).
// Depende de: ./Txt y ../../lib/tema (color del texto de ayuda dentro del campo).
// ─────────────────────────────────────────────────────────────────────────────
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTema } from '@/lib/tema';
import { Txt } from './Txt';

export interface PropsCampoTexto extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  etiqueta: string;
  valor: string;
  onCambiar: (v: string) => void;
  /** Texto chico bajo el campo cuando no hay error. */
  ayuda?: string;
  /** Mensaje de error bajo el campo. Si hay, el borde va en peligro. */
  error?: string | null;
  multilinea?: boolean;
  contrasena?: boolean;
}

export const CampoTexto = forwardRef<TextInput, PropsCampoTexto>(function CampoTexto(
  { etiqueta, valor, onCambiar, ayuda, error, multilinea = false, contrasena = false, onFocus, onBlur, editable = true, ...p },
  ref,
) {
  const { c } = useTema();
  const [foco, setFoco] = useState(false);
  const [ver, setVer] = useState(false);
  const borde = error ? 'border-peligro' : foco ? 'border-campo-edicion' : 'border-campo-borde';
  return (
    <View className="gap-2">
      <Txt v="etiquetaCampo">{etiqueta}</Txt>
      <View
        className={`flex-row rounded-control border-2 bg-campo-fondo ${borde} ${multilinea ? 'min-h-[104px] items-start' : 'h-[56px] items-center'} ${
          editable ? '' : 'opacity-60'
        }`}
      >
        <TextInput
          ref={ref}
          value={valor}
          onChangeText={onCambiar}
          editable={editable}
          accessibilityLabel={etiqueta}
          accessibilityHint={error ?? ayuda}
          placeholderTextColor={c['desh-texto']}
          selectionColor={c['campo-edicion']}
          cursorColor={c['campo-edicion']}
          secureTextEntry={contrasena && !ver}
          multiline={multilinea}
          textAlignVertical={multilinea ? 'top' : 'center'}
          onFocus={(e) => {
            setFoco(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur?.(e);
          }}
          className={`flex-1 px-3 font-sans-medium text-[16px] text-texto ${multilinea ? 'py-3' : ''}`}
          {...p}
        />
        {contrasena ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setVer((v) => !v)}
            className="h-12 justify-center px-3"
          >
            <Text className="font-sans-semibold text-[14px] text-texto">{ver ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt v="error" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : ayuda ? (
        <Txt v="sec">{ayuda}</Txt>
      ) : null}
    </View>
  );
});
