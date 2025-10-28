import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, type StyleProp, type ViewStyle, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type ContainerProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
};

  const DEFAULT_COLORS = [
    '#0000FF',
    '#2323D5',
    '#3838AB',
    '#404080',
    '#393955',
    '#2B2B33',
  ] as const;

export default function ContainerFlexColumn({ style, children, colors = DEFAULT_COLORS }: ContainerProps) {

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 shrink-0 items-center justify-center bg-white">
        <LinearGradient
          className="items-center justify-center"
          colors={colors}
          style={[styles.gradientCard, style]}>
          {children}
        </LinearGradient>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gradientCard: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
});
