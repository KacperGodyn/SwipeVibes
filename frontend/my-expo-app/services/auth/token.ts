import { Platform } from "react-native";
import { mmkv } from "../storage/mmkv";
const KEY = "sv:access";

let ACCESS: string | null = null;

export const getAccessToken = () => ACCESS;

export const setAccessToken = (t: string | null) => {
  ACCESS = t;
  try {
    if (Platform.OS === "web") {
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } else {
      if (t) mmkv.set(KEY, t);
      else mmkv.delete(KEY);
    }
  } catch {}
};

export const loadAccessToken = (): string | null => {
  if (ACCESS) return ACCESS;
  try {
    const t =
      Platform.OS === "web"
        ? localStorage.getItem(KEY)
        : mmkv.contains(KEY)
        ? mmkv.getString(KEY) ?? null
        : null;
    ACCESS = t;
    return t;
  } catch {
    return null;
  }
};

export function setRefreshToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) {
      localStorage.setItem('sv_refresh_token', token);
    } else {
      localStorage.removeItem('sv_refresh_token');
    }
  }
}

export function getRefreshToken(): string | null {
  if (Platform.OS === 'web') {
    return localStorage.getItem('sv_refresh_token');
  }
  return null;
}