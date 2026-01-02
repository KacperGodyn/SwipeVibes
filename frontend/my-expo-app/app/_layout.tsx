import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '../services/auth/ctx';
import { RecommendationProvider } from '../services/recommendation/RecommendationContext';
import { ThemeProvider } from '../services/theme/ThemeContext';
import GeneralNavigationContainer from '../components/containers/GeneralNavigationContainer';
import CookieConsentModal from '../components/CookieConsentModal';
import { AudioPrefsProvider } from '../services/audio/useAudioPrefs';

WebBrowser.maybeCompleteAuthSession();

export default function Root() {
  return (
    <ThemeProvider>
      <AudioPrefsProvider>
        <SessionProvider>
          <RecommendationProvider>
            <RootLayoutNav />
          </RecommendationProvider>
        </SessionProvider>
      </AudioPrefsProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { session, role, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments as string[]).length === 0 || segments[0] === 'index';
    const inRedirectPage = segments[0] === 'oauth2redirect';
    const isAuthenticated = !!session;

    if (!isAuthenticated) {
      if (!inAuthGroup && !inRedirectPage) {
        router.replace('/');
      }
    } else {
      if (inAuthGroup) {
        router.replace('/home');
      }

      const inAdminPage = segments[0] === 'admin';
      const { role } = (session as any) || {};
    }
  }, [session, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isAuthenticated = !!session;
  const isAuthScreen =
    (segments as string[]).length === 0 ||
    segments[0] === 'index' ||
    segments[0] === 'oauth2redirect';
  const showNavbar = isAuthenticated && !isAuthScreen;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CookieConsentModal />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="oauth2redirect/spotify"
          options={{ headerShown: false, animation: 'none' }}
        />

        <Stack.Screen name="home" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="playlists" />
        <Stack.Screen name="playlist/[id]" />
        <Stack.Screen name="statistics" />
        <Stack.Screen name="admin" />
      </Stack>
      {showNavbar && <GeneralNavigationContainer />}
    </GestureHandlerRootView>
  );
}
