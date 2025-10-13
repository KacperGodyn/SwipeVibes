import React from 'react';
import { View } from 'react-native';

type ContainerProps = {
  children: React.ReactNode;
};

export default function SubContainerFlexRow({ children }: ContainerProps) {
  return <View className={`flex-row items-center justify-center`}>{children}</View>;
}
