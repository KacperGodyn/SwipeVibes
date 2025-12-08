import React, { useContext, createContext, type PropsWithChildren, useState, useEffect } from 'react';
import { loadAccessToken, getRefreshToken, setAccessToken } from './token';
import { refreshAccess, logout as apiLogout } from './api';

const AuthContext = createContext<{
  signIn: (token: string) => void;
  signOut: () => void;
  session: string | null;
  isLoading: boolean;
}>({
  signIn: () => null,
  signOut: () => null,
  session: null,
  isLoading: false,
});

export function useSession() {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useSession must be wrapped in a <SessionProvider />');
    }
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        loadAccessToken();
        const existingRefreshToken = getRefreshToken();

        if (!existingRefreshToken) {
          setSession(null);
          setIsLoading(false);
          return;
        }

        const { token } = await refreshAccess();
        setAccessToken(token);
        setSession(token);
      } catch (e) {
        console.log("Bootstrap failed, user is logged out");
        setSession(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signIn: (token) => {
          setAccessToken(token);
          setSession(token);
        },
        signOut: async () => {
          setIsLoading(true);
          try {
            await apiLogout();
          } catch (e) {
            console.error("Logout error", e);
          } finally {
            setAccessToken(null);
            setSession(null);
            setIsLoading(false);
          }
        },
        session,
        isLoading,
      }}>
      {children}
    </AuthContext.Provider>
  );
}