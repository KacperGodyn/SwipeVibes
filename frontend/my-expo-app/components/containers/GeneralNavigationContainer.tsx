import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent, Text } from 'react-native';
import { router, usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { createMMKV } from 'react-native-mmkv';
import { useTheme } from '../../services/theme/ThemeContext';
import { useRecommendation } from '../../services/recommendation/RecommendationContext';

import MusicIcon from '../../assets/VibeNavigation/music.svg';
import MoviesIcon from '../../assets/VibeNavigation/movies.svg';
import BooksIcon from '../../assets/VibeNavigation/books.svg';
import GamesIcon from '../../assets/VibeNavigation/games.svg';

import ProfileIcon from '../../assets/Navigation/profile.svg';
import SettingsIcon from '../../assets/Navigation/settings.svg';

export const storage = createMMKV();

type CurrentVibe = 'music' | 'movies' | 'books' | 'games';

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

type NavItem = 'home' | 'profile' | 'settings';

const INDICATOR_SIZE = 48;

export default function GeneralNavigationContainer() {
  const pathname = usePathname();
  const { colors } = useTheme();
  const { refetch } = useRecommendation();

  const [buttonPositions, setButtonPositions] = useState<number[]>([0, 0, 0]);
  const indicatorLeft = useSharedValue(0);
  const hasInitialized = useRef(false);

  const [currentVibe, setCurrentVibe] = useState<CurrentVibe>(() => {
    if (typeof window === 'undefined') return 'music';
    const raw = storage.getString(KEY_CURRENT);
    return isVibe(raw) ? raw : 'music';
  });

  function isVibe(x: unknown): x is CurrentVibe {
    return x === 'music' || x === 'movies' || x === 'books' || x === 'games';
  }

  const getActiveIndex = (): number => {
    if (pathname.includes('/profile')) return 1;
    if (pathname.includes('/playlists')) return 1;
    if (pathname.includes('/playlist/')) return 1;
    if (pathname.includes('/statistics')) return 1;
    if (pathname.includes('/settings')) return 2;
    if (pathname.includes('/admin')) return 2;
    return 0;
  };

  const activeIndex = getActiveIndex();
  const Vibe = VIBES[currentVibe] ?? MusicIcon;

  const handleButtonLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    const centerX = x + width / 2;
    setButtonPositions((prev) => {
      const next = [...prev];
      next[index] = centerX;
      return next;
    });
  };

  useEffect(() => {
    const targetCenter = buttonPositions[activeIndex];
    if (targetCenter > 0) {
      const targetLeft = targetCenter - INDICATOR_SIZE / 2;

      if (!hasInitialized.current) {
        indicatorLeft.value = targetLeft;
        hasInitialized.current = true;
      } else {
        indicatorLeft.value = withTiming(targetLeft, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
      }
    }
  }, [activeIndex, buttonPositions]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
  }));

  const handlePress = (item: NavItem) => {
    if (item === 'home' && (pathname === '/home' || pathname === '/')) {
      refetch();
    }
    router.push(`/${item === 'home' ? 'home' : item}`);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Sliding Indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {/* Nav Buttons - onLayout measures their actual positions */}
      <Pressable
        style={styles.navButton}
        onLayout={handleButtonLayout(0)}
        onPress={() => handlePress('home')}>
        <View style={styles.iconWrapper}>
          <Vibe width={24} height={24} color={activeIndex === 0 ? colors.text : '#888'} />
        </View>
        <Text style={[styles.label, { color: activeIndex === 0 ? colors.text : '#888' }]}>
          Discover
        </Text>
      </Pressable>

      <Pressable
        style={styles.navButton}
        onLayout={handleButtonLayout(1)}
        onPress={() => handlePress('profile')}>
        <View style={styles.iconWrapper}>
          <ProfileIcon width={24} height={24} color={activeIndex === 1 ? colors.text : '#888'} />
        </View>
        <Text style={[styles.label, { color: activeIndex === 1 ? colors.text : '#888' }]}>
          Profile
        </Text>
      </Pressable>

      <Pressable
        style={styles.navButton}
        onLayout={handleButtonLayout(2)}
        onPress={() => handlePress('settings')}>
        <View style={styles.iconWrapper}>
          <SettingsIcon width={24} height={24} color={activeIndex === 2 ? colors.text : '#888'} />
        </View>
        <Text style={[styles.label, { color: activeIndex === 2 ? colors.text : '#888' }]}>
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    width: '90%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 28,
    borderWidth: 1,
  },
  indicator: {
    position: 'absolute',
    top: 12,
    left: 0,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#F05454',
  },

  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
