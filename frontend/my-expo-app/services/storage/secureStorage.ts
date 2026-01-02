import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function getSecure(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecure(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch {}
}

export async function deleteSecure(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {}
}

let tokenCache: Record<string, string | null> = {};

export function getSecureSync(key: string): string | null {
  if (Platform.OS === 'web') return null;
  return tokenCache[key] ?? null;
}

export function setSecureSync(key: string, value: string | null): void {
  if (Platform.OS === 'web') return;
  tokenCache[key] = value;
  if (value) {
    setSecure(key, value);
  } else {
    deleteSecure(key);
  }
}

export async function loadSecureToCache(keys: string[]): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const key of keys) {
    tokenCache[key] = await getSecure(key);
  }
}

export function clearSecureCache(): void {
  tokenCache = {};
}
