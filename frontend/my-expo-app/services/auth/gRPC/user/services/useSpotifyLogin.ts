import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, exchangeCodeAsync, TokenResponse } from 'expo-auth-session';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

type UseSpotifyLoginOptions = {
  onSuccess?: (accessToken: string, token: TokenResponse) => void | Promise<void>;
  onError?: (e: unknown) => void;
};

export function useSpotifyLogin({ onSuccess, onError }: UseSpotifyLoginOptions = {}) {
  const extra = (Constants.expoConfig?.extra as any) ?? {};
  const spotify = extra.spotify ?? {};
  const clientId: string | undefined = spotify.clientId;
  const scopes: string[] = Array.isArray(spotify.scopes) ? spotify.scopes : ['user-read-email'];

    const redirectUri = 
    Platform.OS === 'web'
    ? 'https://auth.expo.io/@kacgod/swipevibes'
    : makeRedirectUri({ scheme: 'swipevibes', path: 'oauth2redirect/spotify' })

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId!,
      scopes,
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  const [loading, setLoading] = React.useState(false);
  const [lastError, setLastError] = React.useState<unknown>(null);

  React.useEffect(() => {
    (async () => {
      if (!response) return;

      if (response.type === 'success' && response.params.code) {
        try {
          setLoading(true);
          const token = await exchangeCodeAsync(
            {
              clientId: clientId!,
              code: response.params.code,
              redirectUri,
              extraParams: { code_verifier: request!.codeVerifier! },
            },
            { tokenEndpoint: discovery.tokenEndpoint }
          );

          await onSuccess?.(token.accessToken!, token);
        } catch (e) {
          setLastError(e);
          onError?.(e);
        } finally {
          setLoading(false);
        }
      } else if (response.type === 'error') {
        setLastError(response.error);
        onError?.(response.error);
      }
    })();
  }, [response]);

  React.useEffect(() => {
    if (request?.redirectUri) {
      console.log('Spotify redirectUri:', request.redirectUri);
    }
  }, [request]);

  console.log('[useSpotifyLogin] Platform:', Platform.OS);
  console.log('[useSpotifyLogin] Client ID:', clientId);
  console.log('[useSpotifyLogin] Redirect URI:', redirectUri);
  console.log('[useSpotifyLogin] Request:', request);
  console.log('[useSpotifyLogin] Response:', response);
  return {
    ready: !!request,
    loading,
    error: lastError,
    promptAsync: (opts?: AuthSession.AuthRequestPromptOptions) => promptAsync
  };
}
