import http from "./api/http";

export type UserPrefs = { 
  audioMuted: boolean;
  snippetDuration: 10 | 20 | 30;
  autoExportLikes?: boolean;
  defaultPlaylistId?: string | null;
  genres?: string[];
  languages?: string[];
  instrumentalMode?: 'vocal' | 'instrumental' | 'any';
  bpmRange?: { min: number; max: number } | null;
  genreFilters?: string[];
  languageFilters?: string[];
};

export async function getPrefs(): Promise<UserPrefs> {
  const { data } = await http.get("/api/prefs");
  return data;
}

export async function setPrefs(patch: Partial<UserPrefs>): Promise<void> {
  await http.put("/api/prefs", patch);
}