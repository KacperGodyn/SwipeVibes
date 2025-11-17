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
