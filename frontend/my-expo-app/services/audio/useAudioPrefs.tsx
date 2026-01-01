import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  PropsWithChildren,
} from 'react';
import { getBool, setBool, getNumber, setNumber, getString, setString } from '../storage/mmkv';
import { getPrefs, setPrefs } from '../prefs';
import { getAccessToken } from '../auth/token';

const KEY_MUTED = 'sv:audio:muted';
const KEY_DURATION = 'sv:audio:duration';
const KEY_AUTO_EXPORT = 'sv:prefs:auto_export';
const KEY_GENRES = 'sv:prefs:genres';
const KEY_LANGUAGES = 'sv:prefs:languages';

type AudioPrefsType = {
  muted: boolean;
  snippetDuration: number;
  autoExportLikes: boolean;
  genreFilters: string[];
  languageFilters: string[];
  setMuted: (next: boolean) => void;
  setSnippetDuration: (next: 10 | 20 | 30) => void;
  setAutoExportLikes: (next: boolean) => void;
  setGenreFilters: (next: string[]) => void;
  setLanguageFilters: (next: string[]) => void;
  ready: boolean;
};

const AudioPrefsContext = createContext<AudioPrefsType | null>(null);

export function useAudioPrefs() {
  const ctx = useContext(AudioPrefsContext);
  if (!ctx) throw new Error('useAudioPrefs must be used within AudioPrefsProvider');
  return ctx;
}

export function AudioPrefsProvider({ children }: PropsWithChildren) {
  const [muted, setMutedState] = useState<boolean>(true);
  const [snippetDuration, setDurationState] = useState<number>(30);
  const [autoExportLikes, setAutoExportState] = useState<boolean>(false);
  const [genreFilters, setGenreFiltersState] = useState<string[]>([]);
  const [languageFilters, setLanguageFiltersState] = useState<string[]>([]);

  const mutedRef = useRef(muted);
  const autoExportRef = useRef(autoExportLikes);
  const genreRef = useRef(genreFilters);
  const languageRef = useRef(languageFilters);

  const [ready, setReady] = useState(false);
  const syncing = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    autoExportRef.current = autoExportLikes;
  }, [autoExportLikes]);
  useEffect(() => {
    genreRef.current = genreFilters;
  }, [genreFilters]);
  useEffect(() => {
    languageRef.current = languageFilters;
  }, [languageFilters]);

  // Initial Load
  useEffect(() => {
    try {
      const storedMuted = getBool(KEY_MUTED);
      setMutedState(storedMuted !== undefined ? storedMuted : true);

      const storedExport = getBool(KEY_AUTO_EXPORT);
      setAutoExportState(storedExport !== undefined ? storedExport : false);

      const storedDuration = getNumber(KEY_DURATION);
      if (storedDuration === 10 || storedDuration === 20 || storedDuration === 30) {
        setDurationState(storedDuration);
      }

      const storedGenres = getString(KEY_GENRES);
      if (storedGenres) {
        setGenreFiltersState(JSON.parse(storedGenres));
      }

      const storedLangs = getString(KEY_LANGUAGES);
      if (storedLangs) {
        setLanguageFiltersState(JSON.parse(storedLangs));
      }
    } catch {}

    (async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const server = await getPrefs();

          if (typeof server.audioMuted === 'boolean') {
            setMutedState(server.audioMuted);
            setBool(KEY_MUTED, server.audioMuted);
          }

          if (server.snippetDuration && [10, 20, 30].includes(server.snippetDuration)) {
            setDurationState(server.snippetDuration);
            setNumber(KEY_DURATION, server.snippetDuration);
          }

          if (typeof server.autoExportLikes === 'boolean') {
            setAutoExportState(server.autoExportLikes);
            setBool(KEY_AUTO_EXPORT, server.autoExportLikes);
          }

          if (Array.isArray(server.genreFilters)) {
            setGenreFiltersState(server.genreFilters);
            setString(KEY_GENRES, JSON.stringify(server.genreFilters));
          }

          if (Array.isArray(server.languageFilters)) {
            setLanguageFiltersState(server.languageFilters);
            setString(KEY_LANGUAGES, JSON.stringify(server.languageFilters));
          }
        } catch {}
      }
      setReady(true);
    })();
  }, []);

  const setMuted = useCallback(async (next: boolean) => {
    setMutedState(next);
    try {
      setBool(KEY_MUTED, next);
    } catch {}

    const token = getAccessToken();
    if (token && !syncing.current) {
      syncing.current = true;
      await setPrefs({
        audioMuted: next,
        autoExportLikes: autoExportRef.current,
        genreFilters: genreRef.current,
        languageFilters: languageRef.current,
      }).finally(() => (syncing.current = false));
    }
  }, []);

  const setSnippetDuration = useCallback(async (next: 10 | 20 | 30) => {
    setDurationState(next);
    try {
      setNumber(KEY_DURATION, next);
    } catch {}
  }, []);

  const setAutoExportLikes = useCallback(async (next: boolean) => {
    setAutoExportState(next);
    try {
      setBool(KEY_AUTO_EXPORT, next);
    } catch {}

    const token = getAccessToken();
    if (token && !syncing.current) {
      syncing.current = true;
      await setPrefs({
        audioMuted: mutedRef.current,
        autoExportLikes: next,
        genreFilters: genreRef.current,
        languageFilters: languageRef.current,
      }).finally(() => (syncing.current = false));
    }
  }, []);

  const setGenreFilters = useCallback(async (next: string[]) => {
    setGenreFiltersState(next);
    try {
      setString(KEY_GENRES, JSON.stringify(next));
    } catch {}

    const token = getAccessToken();
    if (token && !syncing.current) {
      syncing.current = true;
      await setPrefs({
        audioMuted: mutedRef.current,
        autoExportLikes: autoExportRef.current,
        genreFilters: next,
        languageFilters: languageRef.current,
      }).finally(() => (syncing.current = false));
    }
  }, []);

  const setLanguageFilters = useCallback(async (next: string[]) => {
    setLanguageFiltersState(next);
    try {
      setString(KEY_LANGUAGES, JSON.stringify(next));
    } catch {}

    const token = getAccessToken();
    if (token && !syncing.current) {
      syncing.current = true;
      await setPrefs({
        audioMuted: mutedRef.current,
        autoExportLikes: autoExportRef.current,
        genreFilters: genreRef.current,
        languageFilters: next,
      }).finally(() => (syncing.current = false));
    }
  }, []);

  return (
    <AudioPrefsContext.Provider
      value={{
        muted,
        snippetDuration,
        autoExportLikes,
        genreFilters,
        languageFilters,
        setMuted,
        setSnippetDuration,
        setAutoExportLikes,
        setGenreFilters,
        setLanguageFilters,
        ready,
      }}>
      {children}
    </AudioPrefsContext.Provider>
  );
}
