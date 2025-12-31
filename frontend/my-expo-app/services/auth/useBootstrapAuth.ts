import { useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { setAccessToken, getRefreshToken, loadAccessToken } from "./token";
import { refreshAccess } from "./api";

export const AUTH_EVENT = "auth.state_change";

export function useBootstrapAuth() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        loadAccessToken();

        const existingRefreshToken = getRefreshToken();

        if (!existingRefreshToken) {
          setIsAuthenticated(false);
          setReady(true);
          return; 
        }
        const { token } = await refreshAccess();

        setAccessToken(token);
        setIsAuthenticated(true);
      } catch (e: any) {
        console.log("Bootstrap failed, logging out", e);
        setAccessToken(null);
        setIsAuthenticated(false);
      } finally {
        setReady(true);
      }
    })();

    const subscription = DeviceEventEmitter.addListener(AUTH_EVENT, (isAuth: boolean) => {
      setIsAuthenticated(isAuth);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { ready, isAuthenticated };
}