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

  const isWeb = Platform.OS === 'web';

  const redirectUri = makeRedirectUri({
    scheme: 'swipevibes',
    path: 'oauth2redirect/spotify',
    preferLocalhost: true,
  });

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

  const handleCodeExchange = async (code: string, codeVerifier: string) => {
      try {
        setLoading(true);
        const token = await exchangeCodeAsync(
          {
            clientId: clientId!,
            code: code,
            redirectUri,
            extraParams: { code_verifier: codeVerifier },
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
  };

  React.useEffect(() => {
    if (response?.type === 'success' && response.params.code && request?.codeVerifier) {
        handleCodeExchange(response.params.code, request.codeVerifier);
    } else if (response?.type === 'error') {
        setLastError(response.error);
        onError?.(response.error);
    }
  }, [response]);

  React.useEffect(() => {
    if (!isWeb || !request?.codeVerifier) return;

    const checkStorage = () => {
        const signal = localStorage.getItem('spotify-auth-signal');
        if (signal) {
            try {
                const { url, timestamp } = JSON.parse(signal);
                if (Date.now() - timestamp < 10000) {
                    localStorage.removeItem('spotify-auth-signal');
                    
                    const params = new URL(url).searchParams;
                    const code = params.get('code');
                    
                    if (code) {
                        console.log("MOBILE BRIDGE: Znaleziono kod w LocalStorage!", code);
                        handleCodeExchange(code, request.codeVerifier!);
                    }
                }
            } catch (e) {
                console.error("Błąd parsowania sygnału auth:", e);
            }
        }
    };

    const interval = setInterval(checkStorage, 1000);
    
    window.addEventListener('storage', checkStorage);

    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', checkStorage);
    };
  }, [request]);

  return {
    ready: !!request,
    loading,
    error: lastError,
    promptAsync: (opts?: AuthSession.AuthRequestPromptOptions) => promptAsync(opts),
  };
}