import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from './Txt';

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
