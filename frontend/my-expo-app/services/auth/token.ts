import { Platform } from "react-native";
import { mmkv } from "../storage/mmkv";

const ACCESS_KEY = "sv:access";
const REFRESH_KEY = "sv:refresh";

let ACCESS: string | null = null;

export const getAccessToken = () => ACCESS;

export const setAccessToken = (t: string | null) => {
  ACCESS = t;
  try {
    if (Platform.OS === "web") {
      if (t) localStorage.setItem(ACCESS_KEY, t);
      else localStorage.removeItem(ACCESS_KEY);
    } else {
      if (t) mmkv.set(ACCESS_KEY, t);
      else mmkv.delete(ACCESS_KEY);
    }
  } catch {}
};

export const loadAccessToken = (): string | null => {
  if (ACCESS) return ACCESS;
  try {
    const t =
      Platform.OS === "web"
        ? localStorage.getItem(ACCESS_KEY)
        : mmkv.contains(ACCESS_KEY)
        ? mmkv.getString(ACCESS_KEY) ?? null
        : null;
    ACCESS = t;
    return t;
  } catch {
    return null;
  }
};


export function setRefreshToken(token: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    } else {
      if (token) mmkv.set(REFRESH_KEY, token);
      else mmkv.delete(REFRESH_KEY);
    }
  } catch (e) {
    console.error("Błąd zapisu refresh tokena", e);
  }
}

export function getRefreshToken(): string | null {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(REFRESH_KEY);
    }
    if (mmkv.contains(REFRESH_KEY)) {
        return mmkv.getString(REFRESH_KEY) ?? null;
    }
    return null;
  } catch {
    return null;
  }
}