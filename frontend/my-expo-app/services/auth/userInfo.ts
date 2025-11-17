import { Platform } from "react-native";
import { mmkv } from "../storage/mmkv";

const KEY_USERNAME = "sv:username";
const KEY_ROLE = "sv:role";
const KEY_AVATAR = "sv:avatar";

export function setSavedUser(username: string, role?: string | null) {
  try {
    if (Platform.OS === "web") {
      if (username) localStorage.setItem(KEY_USERNAME, username);
      if (role != null) localStorage.setItem(KEY_ROLE, String(role));
    } else {
      if (username) mmkv.set(KEY_USERNAME, username);
      if (role != null) mmkv.set(KEY_ROLE, String(role));
    }
  } catch {}
}

export function getSavedUsername(): string | null {
  try {
    if (Platform.OS === "web") return localStorage.getItem(KEY_USERNAME);
    return mmkv.contains(KEY_USERNAME) ? mmkv.getString(KEY_USERNAME) ?? null : null;
  } catch {
    return null;
  }
}

export function getSavedRole(): string | null {
  try {
    if (Platform.OS === "web") return localStorage.getItem(KEY_ROLE);
    return mmkv.contains(KEY_ROLE) ? mmkv.getString(KEY_ROLE) ?? null : null;
  } catch {
    return null;
  }
}

export function setSavedAvatar(url: string | null | undefined) {
  try {
    if (!url) {
      if (Platform.OS === "web") localStorage.removeItem(KEY_AVATAR);
      else mmkv.delete(KEY_AVATAR);
      return;
    }
    if (Platform.OS === "web") localStorage.setItem(KEY_AVATAR, url);
    else mmkv.set(KEY_AVATAR, url);
  } catch {}
}

export function getSavedAvatar(): string | null {
  try {
    if (Platform.OS === "web") return localStorage.getItem(KEY_AVATAR);
    return mmkv.contains(KEY_AVATAR) ? mmkv.getString(KEY_AVATAR) ?? null : null;
  } catch {
    return null;
  }
}

export function clearSavedUser() {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(KEY_USERNAME);
      localStorage.removeItem(KEY_ROLE);
      localStorage.removeItem(KEY_AVATAR);
      mmkv.delete(KEY_USERNAME);
      mmkv.delete(KEY_ROLE);
      mmkv.delete(KEY_AVATAR);
    }
  } catch {}
}
