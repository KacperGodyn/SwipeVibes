import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

type ContainerProps = {
  children: React.ReactNode;
};

export default function ContainerFlexColumn({ children }: ContainerProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 shrink-0 items-center justify-center bg-white">
        <LinearGradient
          className="items-center justify-center"
          colors={['#0000FF', '#2323D5', '#3838AB', '#404080', '#393955', '#2B2B33']}
          style={styles.gradientCard}>
          {children}
        </LinearGradient>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gradientCard: {
    borderRadius: 30,
    width: '85%',
    height: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
});
