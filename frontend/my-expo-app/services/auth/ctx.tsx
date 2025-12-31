import React, { useContext, createContext, type PropsWithChildren } from 'react';
import { logout as apiLogout } from './api';
import { setAccessToken } from './token';
import { useBootstrapAuth } from './useBootstrapAuth';

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
  const { ready, isAuthenticated } = useBootstrapAuth();

  return (
    <AuthContext.Provider
      value={{
        signIn: (token) => {
          setAccessToken(token);
        },
        signOut: async () => {
          await apiLogout();
        },
        session: isAuthenticated ? 'active_session' : null,
        isLoading: !ready,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}