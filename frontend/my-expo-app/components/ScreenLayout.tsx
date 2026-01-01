import React from 'react';
import { View, ViewProps, Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/theme/ThemeContext';

import VolumeSlider from './VolumeSlider';

type Props = ViewProps & {
  children: React.ReactNode;
  className?: string;
  withGradient?: boolean;
  showThemeToggle?: boolean;
  showVolumeControl?: boolean;
};

export default function ScreenLayout({
  children,
  className = '',
  withGradient = true,
  showThemeToggle = true,
  showVolumeControl = true,
  style,
}: Props) {
  const { theme, toggleTheme, colors } = useTheme();

  const HeaderControls = showThemeToggle ? (
    <View
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
      {showVolumeControl && <VolumeSlider />}

      <Pressable
        onPress={toggleTheme}
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </Text>
      </Pressable>
    </View>
  ) : null;

  const Content = (
    <SafeAreaView className={`h-full w-full flex-1 ${className}`} style={style}>
      {HeaderControls}
      {children}
    </SafeAreaView>
  );

  if (withGradient) {
    return (
      <LinearGradient
        colors={colors.backgroundGradient as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}>
        {Content}
      </LinearGradient>
    );
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }}>{Content}</View>;
}
