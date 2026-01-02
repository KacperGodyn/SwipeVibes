import { Platform } from 'react-native';
import {
  getSecureSync,
  setSecureSync,
  loadSecureToCache,
  clearSecureCache,
} from '../storage/secureStorage';

const ACCESS_KEY = 'sv:access';
const REFRESH_KEY = 'sv:refresh';

let ACCESS: string | null = null;

export const getAccessToken = () => ACCESS;

export const setAccessToken = (t: string | null) => {
  ACCESS = t;
  if (Platform.OS !== 'web') {
    setSecureSync(ACCESS_KEY, t);
  }
};

export const loadAccessToken = (): string | null => {
  if (ACCESS) return ACCESS;

  if (Platform.OS !== 'web') {
    ACCESS = getSecureSync(ACCESS_KEY);
    return ACCESS;
  }

  return null;
};

export function setRefreshToken(token: string | null) {
  if (Platform.OS !== 'web') {
    setSecureSync(REFRESH_KEY, token);
  }
}

export function getRefreshToken(): string | null {
  if (Platform.OS !== 'web') {
    return getSecureSync(REFRESH_KEY);
  }
  return null;
}

export async function initializeTokens(): Promise<void> {
  if (Platform.OS !== 'web') {
    await loadSecureToCache([ACCESS_KEY, REFRESH_KEY]);
    ACCESS = getSecureSync(ACCESS_KEY);
  }
}

export function clearTokens(): void {
  ACCESS = null;
  if (Platform.OS !== 'web') {
    setSecureSync(ACCESS_KEY, null);
    setSecureSync(REFRESH_KEY, null);
    clearSecureCache();
  }
}
