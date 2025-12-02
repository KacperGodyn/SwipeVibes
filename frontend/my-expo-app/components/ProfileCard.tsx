import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { refreshAccess, logout } from '../services/auth/api';
import { loadAccessToken, setAccessToken } from '../services/auth/token';
import { Text, View, Pressable, StyleSheet, Platform, Image } from 'react-native'; // ⬅️ dodano Image
import { getSavedUsername, getSavedAvatar } from '../services/auth/userInfo';

type JwtPayload = {
  name?: string;
  unique_name?: string;
  role?: string | string[];
  exp?: number;
  [k: string]: any;
};

function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '==='.slice((b64.length + 3) % 4);

  try {
    const bin =
      Platform.OS === 'web' && typeof atob === 'function'
        ? atob(pad)
        : String.fromCharCode(...Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));

    let json: string;
    try {
      json = decodeURIComponent(
        bin
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
    } catch {
      json = bin;
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function ProfileCard() {
  const [working, setWorking] = useState(false);
  const token = loadAccessToken();
  const payload = useMemo(() => decodeJwt(token), [token]);

  const savedUsername = getSavedUsername();
  const savedAvatar = getSavedAvatar();
  const username = savedUsername ?? payload?.name ?? payload?.unique_name ?? '(unknown)';

  const expText = useMemo(() => {
    if (!payload?.exp) return 'n/a';
    const ms = payload.exp * 1000 - Date.now();
    if (ms <= 0) return 'expired';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }, [payload?.exp]);

  const onRefresh = async () => {
    setWorking(true);
    try {
      const { token } = await refreshAccess();
      setAccessToken(token);
    } finally {
      setWorking(false);
    }
  };

  const onLogout = async () => {
    setWorking(true);
    try {
      await logout();
      router.replace('/');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View className="items-center gap-6">
      {savedAvatar ? (
        <Image source={{ uri: savedAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarFallbackText}>
            {String(username ?? '?')
              .slice(0, 1)
              .toUpperCase()}
          </Text>
        </View>
      )}
      <Text
        className="rounded-3xl border border-white/20 bg-white bg-white/30 text-white shadow-md backdrop-blur-xl"
        style={styles.Text}>
        {username}
      </Text>

      <Pressable
        disabled={working}
        className="rounded-3xl border border-white/20 bg-white bg-white/30 shadow-md backdrop-blur-xl"
        style={styles.Text}>
        <Text className="text-white">Statistics</Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace('/playlists')}
        disabled={working}
        className="rounded-3xl border border-white/20 bg-white bg-white/30 shadow-md backdrop-blur-xl"
        style={styles.Text}>
        <Text className="text-white">Playlists</Text>
      </Pressable>

      <Pressable
        onPress={onLogout}
        disabled={working}
        className="rounded-3xl border border-white/20 bg-white bg-white/30 shadow-md backdrop-blur-xl"
        style={styles.Text}>
        <Text className="text-white">Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  Text: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
