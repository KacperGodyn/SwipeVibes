import * as RNMMKV from "react-native-mmkv";
import { Platform } from "react-native";

const MMKVCtor = (RNMMKV as any)?.MMKV as (new (opts?: any) => any) | undefined;

export const mmkv =
  Platform.OS !== "web" && MMKVCtor ? new MMKVCtor({ id: "sv" }) : null;

export function getBool(key: string, fallback = false): boolean {
  if (mmkv) {
    return mmkv.contains(key) ? (mmkv.getBoolean(key) ?? fallback) : fallback;
  }
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (v === "1") return true;
    if (v === "0") return false;
  } catch {}
  return fallback;
}

export function setBool(key: string, value: boolean) {
  if (mmkv) {
    mmkv.set(key, value);
    return;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value ? "1" : "0");
    }
  } catch {}
}
