import { Stack } from 'expo-router';
import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useBootstrapAuth } from '../services/auth/useBootstrapAuth';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const { ready } = useBootstrapAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  } else {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="playlists" />
          <Stack.Screen name="playlist/[id]" />
        </Stack>
      </GestureHandlerRootView>
    );
  }
}