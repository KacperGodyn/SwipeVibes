import { useCallback, useEffect, useRef, useState } from "react";
import { getBool, setBool } from "../storage/mmkv";
import { getPrefs, setPrefs } from "../prefs";
import { getAccessToken } from "../auth/token";

const KEY = "sv:audio:muted";

export function useAudioPrefs() {
  const [muted, setMutedState] = useState<boolean>(true);
  const [ready, setReady] = useState(false);
  const syncing = useRef(false);

  useEffect(() => {
    try {
      setMutedState(getBool(KEY, true));
    } catch {}

    (async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const server = await getPrefs();
          if (typeof server.audioMuted === "boolean") {
            setMutedState(server.audioMuted);
            setBool(KEY, server.audioMuted);
          }
        } catch {
        }
      }
      setReady(true);
    })();
  }, []);

  const setMuted = useCallback(async (next: boolean) => {
    setMutedState(next);
    try { setBool(KEY, next); } catch {}

    const token = getAccessToken();
    if (token && !syncing.current) {
      syncing.current = true;
      setPrefs({ audioMuted: next }).finally(() => (syncing.current = false));
    }
  }, []);

  return { muted, setMuted, ready };
}
