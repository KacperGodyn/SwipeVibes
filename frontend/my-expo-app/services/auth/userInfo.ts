import { Platform } from "react-native";
import { mmkv } from "../storage/mmkv";

const KEY_USERNAME = "sv:username";
const KEY_ROLE = "sv:role";
const KEY_AVATAR = "sv:avatar";
const KEY_USER_ID = "sv:userId";

export function setSavedUser(username: string, role?: string | null, id?: string | null) {
  try {
    if (Platform.OS === "web") {
      if (username) localStorage.setItem(KEY_USERNAME, username);
      if (role != null) localStorage.setItem(KEY_ROLE, String(role));
      if (id) localStorage.setItem(KEY_USER_ID, id);
    } else {
      if (username) mmkv.set(KEY_USERNAME, username);
      if (role != null) mmkv.set(KEY_ROLE, String(role));
      if (id) mmkv.set(KEY_USER_ID, id);
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

export function getSavedUserId(): string | null {
  try {
    if (Platform.OS === "web") return localStorage.getItem(KEY_USER_ID);
    return mmkv.contains(KEY_USER_ID) ? mmkv.getString(KEY_USER_ID) ?? null : null;
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
      localStorage.removeItem(KEY_USER_ID);
    } else {
      mmkv.delete(KEY_USERNAME);
      mmkv.delete(KEY_ROLE);
      mmkv.delete(KEY_AVATAR);
      mmkv.delete(KEY_USER_ID);
    }
  } catch {}
}