import http from "./api/http";

export type UserPrefs = { audioMuted: boolean };

export async function getPrefs(): Promise<UserPrefs> {
  const { data } = await http.get("/api/prefs");
  return data;
}

export async function setPrefs(patch: Partial<UserPrefs>): Promise<void> {
  await http.put("/api/prefs", patch);
}
