// services/auth/gRPC/user/services/useGoogleLogin.ts
import * as React from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type UseGoogleLoginOptions = {
  onSuccess?: (idToken: string) => void | Promise<void>;
  onError?: (e: unknown) => void;
};

export function useGoogleLogin({ onSuccess, onError }: UseGoogleLoginOptions = {}) {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  const google = extra.google ?? {};
  const androidClientId: string | undefined = google.androidClientId;
  const webClientId: string | undefined = google.webClientId;
  const iosClientId: string | undefined = google.iosClientId;

  const androidReversed =
    androidClientId
      ? `com.googleusercontent.apps.${androidClientId.replace('.apps.googleusercontent.com', '')}`
      : undefined;

  const androidRedirect =
    Platform.OS === 'android' && androidReversed
      ? makeRedirectUri({ scheme: androidReversed, path: 'oauth2redirect/google' })
      : undefined;

  const config =
    Platform.OS === 'android'
      ? ({
          androidClientId,
          scopes: ['openid', 'email', 'profile'],
          ...(androidRedirect ? { redirectUri: androidRedirect } : {}),
        } as const)
      : Platform.OS === 'ios'
      ? ({
          iosClientId,
          scopes: ['openid', 'email', 'profile'],
        } as const)
      : ({
          clientId: webClientId,
          scopes: ['openid', 'email', 'profile'],
        } as const);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(config as any);

  React.useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken =
        (response.params as any)?.id_token ?? response.authentication?.idToken;
      if (!idToken) return onError?.(new Error('No id_token in response'));
      void onSuccess?.(idToken);
    } else if (response.type === 'error') {
      onError?.(response.error);
    }
  }, [response, onSuccess, onError]);

  return { ready: !!request, loading: !request && !response, promptAsync };
}
