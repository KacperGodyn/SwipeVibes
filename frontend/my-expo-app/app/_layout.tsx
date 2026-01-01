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

WebBrowser.maybeCompleteAuthSession();

export default function Root() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <RecommendationProvider>
          <RootLayoutNav />
        </RecommendationProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments as string[]).length === 0 || segments[0] === 'index';
    const inRedirectPage = segments[0] === 'oauth2redirect';
    const isAuthenticated = !!session;

    console.log('[LAYOUT CHECK] Auth:', isAuthenticated, 'Path:', segments);

    if (!isAuthenticated) {
      if (!inAuthGroup && !inRedirectPage) {
        router.replace('/');
      }
    } else {
      if (inAuthGroup) {
        router.replace('/home');
      }
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
      </Stack>
      {showNavbar && <GeneralNavigationContainer />}
    </GestureHandlerRootView>
  );
}
