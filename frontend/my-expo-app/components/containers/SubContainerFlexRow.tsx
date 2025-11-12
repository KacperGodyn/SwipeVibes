import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type ContainerProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function SubContainerFlexRow({ style, children }: ContainerProps) {
  return <View className={`flex-row items-center justify-center`} style={style}>{children}</View>;
}
