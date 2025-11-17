import { useEffect, useState } from "react";
import { setAccessToken } from "./token";
import { refreshAccess } from "./api";

export function useBootstrapAuth() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      console.log("[AuthBootstrap] Uruchamiam hook...");
      try {
        console.log("[AuthBootstrap] Próba odświeżenia tokenu...");
        const { token } = await refreshAccess();

        console.log("[AuthBootstrap] SUKCES. Pobrany token:", token ? token.substring(0, 10) + "..." : "PUSTY");
        setAccessToken(token);
        setIsAuthenticated(true);
      } catch (e: any) {
        console.error("[AuthBootstrap] BŁĄD. Odświeżenie nie powiodło się.", e.message || e);
        setAccessToken(null);
        setIsAuthenticated(false);
      } finally {
        console.log("[AuthBootstrap] Gotowy (ready = true).");
        setReady(true);
      }
    })();
  }, []);

  return { ready, isAuthenticated };
}