import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type UseGoogleLoginOptions = {
  onSuccess?: (idToken: string) => void | Promise<void>;
  onError?: (e: unknown) => void;
};

WebBrowser.maybeCompleteAuthSession();

export function useGoogleLogin({ onSuccess, onError }: UseGoogleLoginOptions = {}) {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  const google = extra.google ?? {};
  const androidClientId: string | undefined = google.androidClientId;
  const webClientId: string | undefined = google.webClientId;
  const iosClientId: string | undefined = google.iosClientId;

  const config =
    Platform.OS === 'android'
      ? ({
          androidClientId,
          scopes: ['openid', 'email', 'profile'],
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
      const idToken = (response.params as any)?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        console.error('[useGoogleLogin] No id_token found in response');
        return onError?.(new Error('No id_token in response'));
      }
      void onSuccess?.(idToken);
    } else if (response.type === 'error') {
      console.error('[useGoogleLogin] Error response:', response.error);
      onError?.(response.error);
    } else {
    }
  }, [response, onSuccess, onError]);

  const readyState = { ready: !!request, loading: !request && !response };

  return { ...readyState, promptAsync };
}
