import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
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

  if (false) { //isSelectedVibe
    return (
      <View className="flex-row items-center justify-around gap-6">
        <Pressable
          className="rounded-full p-2 active:bg-white/40"
          onPress={() => {
            onVibeChange();
            setVibe('music');
          }}>
          <MusicIcon width={40} height={40} color={iconColor} />
        </Pressable>
        <Pressable
          className="rounded-full p-2 active:bg-white/40"
          onPress={() => {
            onVibeChange();
            setVibe('movies');
          }}>
          <MoviesIcon width={40} height={40} color={iconColor} />
        </Pressable>
        <Pressable
          className="rounded-full p-2 active:bg-white/40"
          onPress={() => {
            onVibeChange();
            setVibe('books');
          }}>
          <BooksIcon width={40} height={40} color={iconColor} />
        </Pressable>
        <Pressable
          className="rounded-full p-2 active:bg-white/40"
          onPress={() => {
            onVibeChange();
            setVibe('games');
          }}>
          <GamesIcon width={40} height={40} color={iconColor} />
        </Pressable>
      </View>
    );
  } else {
    return (
      <View className="flex-row items-center justify-around gap-10">
        <Pressable
          className="rounded-full p-2 active:bg-white/40"
          onPress={() => {
            setSelected(!isSelectedVibe);
            router.push("/home")
          }}>
          <Vibe width={40} height={40} color={iconColor} />
        </Pressable>

        <Pressable
          className="rounded-full p-2 active:bg-white/40"
          onPress={() => {
            router.push('/profile');
          }}>
          <ProfileIcon width={40} height={40} color={iconColor} />
        </Pressable>
        <Pressable
          className="rounded-full p-2 active:bg-white/40"
          onPress={() => {
            router.push('/settings');
          }}>
          <SettingsIcon width={40} height={40} color={iconColor} />
        </Pressable>
      </View>
    );
  }
}

const iconColor = '#f0f0f0ff';
