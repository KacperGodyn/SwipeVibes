import { useEffect, useState } from "react";
import { setAccessToken, getRefreshToken, loadAccessToken } from "./token";
import { refreshAccess } from "./api";

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
  }, []);

  return { ready, isAuthenticated };
}