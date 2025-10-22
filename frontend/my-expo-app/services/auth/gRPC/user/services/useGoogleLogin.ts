import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import * as Google from 'expo-auth-session/providers/google';
// import { makeRedirectUri } from 'expo-auth-session';
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

  console.log('[useGoogleLogin] Platform:', Platform.OS);
  console.log('[useGoogleLogin] Client IDs:', { androidClientId, webClientId, iosClientId });

  // const androidReversed = androidClientId
  //   ? `com.googleusercontent.apps.${androidClientId.replace('.apps.googleusercontent.com', '')}`
  //   : undefined;

  // const androidRedirect =
  //   Platform.OS === 'android' && androidReversed
  //     ? makeRedirectUri({ scheme: androidReversed, path: 'oauth2redirect/google' })
  //     : undefined;

  const config =
    Platform.OS === 'android'
      ? ({
          androidClientId,
          scopes: ['openid', 'email', 'profile'],
          // ...(androidRedirect ? { redirectUri: androidRedirect } : {}),
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

  console.log('[useGoogleLogin] Config:', config);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(config as any);

  React.useEffect(() => {
    console.log('[useGoogleLogin] Response changed:', response?.type);
    if (!response) return;
    if (response.type === 'success') {
      console.log('[useGoogleLogin] Success response params:', response.params);
      console.log('[useGoogleLogin] Success response authentication:', response.authentication);
      const idToken = (response.params as any)?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        console.error('[useGoogleLogin] No id_token found in response');
        return onError?.(new Error('No id_token in response'));
      }
      console.log('[useGoogleLogin] ID token obtained, calling onSuccess');
      void onSuccess?.(idToken);
    } else if (response.type === 'error') {
      console.error('[useGoogleLogin] Error response:', response.error);
      onError?.(response.error);
    } else {
      console.log('[useGoogleLogin] Response type:', response.type);
    }
  }, [response, onSuccess, onError]);

  React.useEffect(() => {
    if (request?.redirectUri) console.log('[useGoogleLogin] Auth redirect:', request.redirectUri);
    console.log('[useGoogleLogin] Request state:', request ? 'ready' : 'not ready');
  }, [request]);

  const readyState = { ready: !!request, loading: !request && !response };
  console.log('[useGoogleLogin] Hook state:', readyState);

  return { ...readyState, promptAsync };
}