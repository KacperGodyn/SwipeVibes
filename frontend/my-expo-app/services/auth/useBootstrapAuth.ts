import { useEffect, useState } from "react";
import { setAccessToken } from "./token";
import { refreshAccess } from "./api";

export function useBootstrapAuth() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { token } = await refreshAccess();

        setAccessToken(token);
        setIsAuthenticated(true);
      } catch (e: any) {
        setAccessToken(null);
        setIsAuthenticated(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  return { ready, isAuthenticated };
}