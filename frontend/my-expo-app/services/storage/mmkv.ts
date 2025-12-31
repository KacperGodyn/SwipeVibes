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

export function getNumber(key: string, fallback = 0): number {
  if (mmkv) {
    return mmkv.contains(key) ? (mmkv.getNumber(key) ?? fallback) : fallback;
  }
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (v !== null) {
      const parsed = Number(v);
      return isNaN(parsed) ? fallback : parsed;
    }
  } catch {}
  return fallback;
}

export function setNumber(key: string, value: number) {
  if (mmkv) {
    mmkv.set(key, value);
    return;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, String(value));
    }
  } catch {}
}

export function getString(key: string, fallback = ""): string {
  if (mmkv) {
    return mmkv.getString(key) ?? fallback;
  }
  try {
    if (typeof localStorage !== "undefined") {
       return localStorage.getItem(key) ?? fallback;
    }
  } catch {}
  return fallback;
}

export function setString(key: string, value: string) {
  if (mmkv) {
    mmkv.set(key, value);
    return;
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {}
}