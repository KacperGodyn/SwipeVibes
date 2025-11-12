import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Constants from 'expo-constants';

type ArtistDto = {
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

type AlbumDto = {
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

const api = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiUrl,
  timeout: 7000,
  headers: { Accept: 'application/json' },
});

export default function provideRandomRecommendation() {
  const [track, setTrack] = useState<RandomTrackResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRandom = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<RandomTrackResponse>('/api/deezer/random-track', { signal });
      setTrack(data);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      if (axios.isAxiosError(err)) {
        const serverMsg =
          (err.response?.data as any)?.message ??
          (typeof err.response?.data === 'string' ? err.response?.data : null);
        setError(serverMsg ?? err.message);
      } else {
        setError('Unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRandom(controller.signal);
    return () => controller.abort();
  }, [fetchRandom]);

  return {
    track,
    loading,
    error,
    refetch: () => fetchRandom(),
  };
}