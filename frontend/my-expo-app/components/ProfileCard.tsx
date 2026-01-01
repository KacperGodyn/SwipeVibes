import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { refreshAccess, logout } from '../services/auth/api';
import { loadAccessToken, setAccessToken } from '../services/auth/token';
import { Text, View, Pressable, StyleSheet, Platform, Image } from 'react-native';
import { getSavedUsername, getSavedAvatar } from '../services/auth/userInfo';
import { useSession } from '../services/auth/ctx';
import { SpotifyConnectButton } from './buttons/SpotifyConnectButton';

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
  const { signOut } = useSession();
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
      await signOut();
    } finally {
      setWorking(false);
    }
  };

  return (
    <View className="w-full items-center gap-8 py-8">
      {/* Avatar Section */}
      <View className="relative">
        <View className="border-vibe-accent h-32 w-32 overflow-hidden rounded-full border-2 shadow-[0_0_20px_rgba(240,84,84,0.4)]">
          {savedAvatar ? (
            <Image source={{ uri: savedAvatar }} className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-white/10">
              <Text className="text-4xl font-bold text-white">
                {String(username ?? '?')
                  .slice(0, 1)
                  .toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-black bg-green-500" />
      </View>

      {/* User Info */}
      <View className="items-center">
        <Text className="text-2xl font-bold text-white shadow-md">{username}</Text>
        <Text className="mt-1 text-xs uppercase tracking-widest text-gray-500">Free Plan</Text>
      </View>

      {/* Actions */}
      <View className="w-full gap-4 px-8">
        <View className="gap-2">
          <Text className="text-center text-sm font-semibold text-gray-400">Integration</Text>
          <View className="overflow-hidden rounded-2xl border border-green-500/30 bg-green-500/10">
            <SpotifyConnectButton />
          </View>
        </View>

        <View className="my-2 h-[1px] w-full bg-white/10" />

        <Pressable
          onPress={() => router.push('/statistics')}
          disabled={working}
          className="flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4 active:bg-white/10">
          <Text className="font-bold text-white">View Statistics</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/playlists')}
          disabled={working}
          className="flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4 active:bg-white/10">
          <Text className="font-bold text-white">My Playlists</Text>
        </Pressable>

        <Pressable
          onPress={onLogout}
          disabled={working}
          className="mt-4 flex-row items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 py-4 active:bg-red-500/20">
          <Text className="font-bold text-red-400">Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});
