import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { createMMKV } from 'react-native-mmkv';

import MusicIcon from '../../assets/VibeNavigation/music.svg';
import MoviesIcon from '../../assets/VibeNavigation/movies.svg';
import BooksIcon from '../../assets/VibeNavigation/books.svg';
import GamesIcon from '../../assets/VibeNavigation/games.svg';

import ProfileIcon from '../../assets/Navigation/profile.svg';
import SettingsIcon from '../../assets/Navigation/settings.svg';

export const storage = createMMKV();

type CurrentVibe = 'music' | 'movies' | 'books' | 'games';

const KEY_SELECTED = 'selectedVibe';
const KEY_CURRENT = 'currentVibe';

const VIBES: Record<
  CurrentVibe,
  React.ComponentType<{ width?: number; height?: number; color?: string }>
> = {
  music: MusicIcon,
  movies: MoviesIcon,
  books: BooksIcon,
  games: GamesIcon,
};

const iconColor = '#F05454';

export default function GeneralNavigationContainer() {
  const [isSelectedVibe, setIsSelectedVibe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return storage.getBoolean(KEY_SELECTED) ?? false;
  });

  const [currentVibe, setCurrentVibe] = useState<CurrentVibe>(() => {
    if (typeof window === 'undefined') return 'music';
    const raw = storage.getString(KEY_CURRENT);
    return isVibe(raw) ? raw : 'music';
  });

  function setSelected(next: boolean) {
    setIsSelectedVibe(next);
    storage.set(KEY_SELECTED, next);
  }

  function setVibe(next: CurrentVibe) {
    setCurrentVibe(next);
    storage.set(KEY_CURRENT, next);
  }

  function onVibeChange() {
    setSelected(false);
  }

  function isVibe(x: unknown): x is CurrentVibe {
    return x === 'music' || x === 'movies' || x === 'books' || x === 'games';
  }

  const Vibe = VIBES[currentVibe] ?? MusicIcon;

  return (
    <View className="mx-auto w-[95%] max-w-[400px] flex-row items-center justify-between self-center rounded-[32px] border border-[#222222] bg-[#0F0F0F] px-8 py-3 shadow-sm shadow-[#F05454]">
      <Pressable
        className="items-center gap-1 active:opacity-70"
        onPress={() => {
          setSelected(!isSelectedVibe);
          router.push('/home');
        }}>
        <View className="rounded-2xl border border-[#333333] bg-[#1A1A1A] p-2">
          <Vibe width={28} height={28} color={iconColor} />
        </View>
        <Text className="text-[10px] font-bold uppercase tracking-widest text-[#E8E8E8]">
          Discover
        </Text>
      </Pressable>

      <Pressable
        className="items-center gap-1 active:opacity-70"
        onPress={() => {
          router.push('/profile');
        }}>
        <View className="p-2">
          <ProfileIcon width={28} height={28} color="#888888" />
        </View>
        <Text className="text-[10px] font-bold uppercase tracking-widest text-[#666666]">
          Profile
        </Text>
      </Pressable>

      <Pressable
        className="items-center gap-1 active:opacity-70"
        onPress={() => {
          router.push('/settings');
        }}>
        <View className="p-2">
          <SettingsIcon width={28} height={28} color="#888888" />
        </View>
        <Text className="text-[10px] font-bold uppercase tracking-widest text-[#666666]">
          Settings
        </Text>
      </Pressable>
    </View>
  );
}
