import { useCallback, useEffect, useRef, useState } from 'react';
import http from '../api/http';
import axios from 'axios';
import { useBootstrapAuth } from '../auth/useBootstrapAuth';
import { getAccessToken } from '../auth/token';

export type ArtistDto = {
  id: number;
  name: string;
  link: string;
  picture: string;
  pictureSmall?: string;
  pictureMedium?: string;
  pictureBig?: string;
  pictureXl?: string;
  tracklist: string;
};
export type AlbumDto = {
  id: number;
  title: string;
  cover: string;
  coverSmall?: string;
  coverMedium?: string;
  coverBig?: string;
  coverXl?: string;
  tracklist: string;
};
export type RandomTrackResponse = {
  id: number;
  title: string;
  titleShort?: string | null;
  isrc?: string | null;
  link?: string | null;
  share?: string | null;
  trackPosition: number;
  diskNumber: number;
  rank: number;
  releaseDate?: string | null;
  explicitLyrics: boolean;
  explicitContentLyrics: 'Unspecified' | 'Clean' | 'Explicit';
  explicitCover: 'Unspecified' | 'Clean' | 'Explicit';
  preview?: string | null;
  bpm?: number | null;
  gain?: number | null;
  countryCodes: string[];
  artists: ArtistDto[];
  album: AlbumDto;
};

export default function provideRecommendation() {
  const [track, setTrack] = useState<RandomTrackResponse | null>(null);
  const [history, setHistory] = useState<RandomTrackResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { ready, isAuthenticated } = useBootstrapAuth();

  const currentRef = useRef<RandomTrackResponse | null>(null);
  useEffect(() => { currentRef.current = track; }, [track]);

  const firstLoad = useRef(true);

  const fetchRecommendation = useCallback(async (signal?: AbortSignal, retryCount = 0) => {
    try {
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
              setTimeout(() => {
                  fetchRecommendation(signal, retryCount + 1);
              }, 500);
              return;
          } else {
              throw new Error("Timed out waiting for access token.");
          }
      }

      
      const { data } = await http.get<RandomTrackResponse>("/api/deezer/recommendation", { 
        signal,
        headers: {
            Authorization: `Bearer ${token}`
        }
      });
      
      setTrack(data);
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED") return;
      
      console.error("[Fetch Error]", err);

      if (axios.isAxiosError(err)) {
        const serverMsg =
          (err.response?.data as any)?.message ??
          (typeof err.response?.data === "string" ? err.response?.data : null);
        setError(serverMsg ?? err.message);
      } else {
        setError(err.message || "Unknown error occurred");
      }
    } finally {
      const token = getAccessToken();
      if (token || retryCount >= 5) {
          firstLoad.current = false;
          setLoading(false);
      }
    }
  }, [isAuthenticated]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setTrack(last);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    
    if (ready) {
        if (isAuthenticated) {
            fetchRecommendation(controller.signal);
        } else {
            console.log("User not authenticated, stopping.");
            setLoading(false);
        }
    }
    
    return () => controller.abort();
  }, [fetchRecommendation, ready, isAuthenticated]);

  return {
    track,
    loading,
    error,
    refetch: () => fetchRecommendation(undefined, 0),
    undo,
    canUndo: history.length > 0,
  };
}