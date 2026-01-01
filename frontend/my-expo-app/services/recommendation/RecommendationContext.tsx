import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  PropsWithChildren,
  useMemo,
} from 'react';
import { useBootstrapAuth } from '../auth/useBootstrapAuth';
import { useAudioPrefs } from '../audio/useAudioPrefs';
import { getAccessToken } from '../auth/token';
import http from '../api/http';
import axios from 'axios';
import { RandomTrackResponse } from './provideRecommendation';
import { useAudioPlayer, useAudioPlayerStatus, AudioPlayer } from 'expo-audio';
import { getNumber } from '../storage/mmkv';

type RecommendationContextType = {
  track: RandomTrackResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  undo: () => void;
  canUndo: boolean;
  player: AudioPlayer;
  positionInSession: number;
};

const RecommendationContext = createContext<RecommendationContextType | null>(null);

export function useRecommendation() {
  const ctx = useContext(RecommendationContext);
  if (!ctx) throw new Error('useRecommendation must be used within RecommendationProvider');
  return ctx;
}

export function RecommendationProvider({ children }: PropsWithChildren) {
  const [track, setTrack] = useState<RandomTrackResponse | null>(null);
  const [history, setHistory] = useState<RandomTrackResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [positionInSession, setPositionInSession] = useState<number>(0);

  const { ready: authReady, isAuthenticated } = useBootstrapAuth();
  const { genreFilters, languageFilters, ready: prefsReady } = useAudioPrefs();

  const source = useMemo(() => track?.preview ?? null, [track?.preview]);
  const player = useAudioPlayer(source);
  useAudioPlayerStatus(player);

  useEffect(() => {
    player.loop = true;
    const vol = getNumber('user_volume', 1.0);
    player.volume = vol;
    if (vol === 0) player.muted = true;
  }, [player]);

  useEffect(() => {
    const p = player;
    return () => {
      try {
        p.pause();
      } catch {}
    };
  }, [source]);

  const currentRef = useRef<RandomTrackResponse | null>(null);
  useEffect(() => {
    currentRef.current = track;
  }, [track]);

  const firstLoad = useRef(true);

  const fetchRecommendation = useCallback(
    async (signal?: AbortSignal, retryCount = 0) => {
      try {
        try {
          player.pause();
        } catch {}

        if (retryCount === 0) {
          setLoading(true);
          setError(null);
        }

        const prev = currentRef.current;
        if (prev && !firstLoad.current && retryCount === 0) {
          setHistory((h) => [...h, prev]);
        }

        const token = getAccessToken();
        if (!token) {
          if (retryCount < 5) {
            setTimeout(() => fetchRecommendation(signal, retryCount + 1), 500);
            return;
          } else {
            throw new Error('Timed out waiting for access token.');
          }
        }

        const params = new URLSearchParams();
        if (genreFilters && genreFilters.length > 0) {
          genreFilters.forEach((g) => params.append('genres', g));
        }
        if (languageFilters && languageFilters.length > 0) {
          languageFilters.forEach((l) => params.append('languages', l));
        }

        const { data } = await http.get<RandomTrackResponse>('/api/deezer/recommendation', {
          signal,
          params,
          headers: { Authorization: `Bearer ${token}` },
        });

        setTrack(data);
        setPositionInSession((prev) => prev + 1);
      } catch (err: any) {
        if (err?.code === 'ERR_CANCELED') return;
        console.error('[Fetch Error]', err);
        if (axios.isAxiosError(err)) {
          const serverMsg =
            (err.response?.data as any)?.message ??
            (typeof err.response?.data === 'string' ? err.response?.data : null);
          setError(serverMsg ?? err.message);
        } else {
          setError(err.message || 'Unknown error occurred');
        }
      } finally {
        const token = getAccessToken();
        if (token || retryCount >= 5) {
          firstLoad.current = false;
          setLoading(false);
        }
      }
    },
    [genreFilters, languageFilters, player]
  );

  useEffect(() => {
    const controller = new AbortController();
    if (authReady && prefsReady && isAuthenticated && !track && firstLoad.current) {
      fetchRecommendation(controller.signal);
    }
    return () => controller.abort();
  }, [fetchRecommendation, authReady, isAuthenticated, prefsReady, track]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setTrack(last);
      return prev.slice(0, -1);
    });
  }, []);

  return (
    <RecommendationContext.Provider
      value={{
        track,
        loading,
        error,
        refetch: () => fetchRecommendation(undefined, 0),
        undo,
        canUndo: history.length > 0,
        player,
        positionInSession,
      }}>
      {children}
    </RecommendationContext.Provider>
  );
}
