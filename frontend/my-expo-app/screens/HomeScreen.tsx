import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  useWindowDimensions,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import ScreenLayout from 'components/ScreenLayout';
import MainCardDisplayedContent from 'components/MainCardDisplayedContent';
import WebPlaybackStarter from '../components/WebPlaybackStarter';

import { useRecommendation } from '../services/recommendation/RecommendationContext';
import { RandomTrackResponse } from '../services/recommendation/provideRecommendation';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useAudioPrefs } from '../services/audio/useAudioPrefs';
import { logInteraction } from '../services/interactions';
import ActivityIndicatorIcon from '../assets/HomeCard/activity_indicator.svg';

import { addTrackToPlaylist, getMyPlaylists, createPlaylist } from '../services/auth/api';
import { getString, setString } from '../services/storage/mmkv';
import { useTheme } from '../services/theme/ThemeContext';

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 800;
const DEFAULT_PLAYLIST_NAME = 'SwipeVibes Liked';

export default function HomeScreen() {
  const { track, loading, error, refetch, undo, canUndo, player, positionInSession } =
    useRecommendation();
  const { muted, ready, autoExportLikes } = useAudioPrefs();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isFocused = useIsFocused();
  const { colors } = useTheme();

  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const loaderAnim = useSharedValue(0);

  const [showPlaylistCreatedModal, setShowPlaylistCreatedModal] = useState(false);

  useEffect(() => {
    loaderAnim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, []);

  const loaderTranslateStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(loaderAnim.value, [0, 1], [-20, 20]),
      },
    ],
  }));

  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          player.pause();
        } catch {}
      };
    }, [player])
  );

  useEffect(() => {
    if (!loading && track) {
      translateX.value = 0;
      rotation.value = 0;
    }
  }, [loading, track, translateX, rotation]);

  const send = async (t: RandomTrackResponse, decision: 'like' | 'dislike' | 'skip') => {
    if (!t.isrc) return;

    await logInteraction({
      isrc: t.isrc,
      decision,
      deezerTrackId: t.id,
      source: 'gemini/recommendation',
      previewUrl: t.preview ?? undefined,
      artist: t.artists?.[0]?.name,
      title: t.title,
      album: t.album?.title,
      bpm: t.bpm ?? null,
      gain: t.gain ?? null,
      autoExport: decision === 'like' ? autoExportLikes : false,
      position: positionInSession,
    });
  };

  const nextAndPause = async (decision: 'like' | 'dislike' | 'skip') => {
    if (!track) return;
    try {
      player.pause();
    } catch {}

    await send(track, decision);
    await refetch();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      translateX.value,
      [-screenWidth / 2, screenWidth / 2],
      [-15, 15],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX: translateX.value }, { rotateZ: `${rotateZ}deg` }],
    };
  });

  const ensurePlaylistExists = async (): Promise<string | null> => {
    const lastActivePlaylistId = getString('last_active_playlist_id');

    if (lastActivePlaylistId) {
      // Check if playlist still exists
      try {
        const playlists = await getMyPlaylists();
        const exists = playlists.some((p) => p.id === lastActivePlaylistId);
        if (exists) {
          return lastActivePlaylistId;
        }
      } catch (err) {
        console.error('Failed to check playlists:', err);
      }
    }

    // No valid playlist - create default one
    try {
      const playlists = await getMyPlaylists();

      // Check if any playlist exists
      if (playlists.length > 0) {
        // Use first available playlist
        const firstPlaylist = playlists[0];
        setString('last_active_playlist_id', firstPlaylist.id);
        return firstPlaylist.id;
      }

      // No playlists at all - create SwipeVibes Liked
      const newPlaylist = await createPlaylist(DEFAULT_PLAYLIST_NAME);
      setString('last_active_playlist_id', newPlaylist.id);
      setShowPlaylistCreatedModal(true);
      return newPlaylist.id;
    } catch (err) {
      console.error('Failed to create default playlist:', err);
      return null;
    }
  };

  const handleSwipeAction = (decision: 'like' | 'dislike', skipAutoAdd = false) => {
    if (loading || !track) return;

    if (decision === 'like' && !skipAutoAdd) {
      // Run playlist logic in background
      (async () => {
        const playlistId = await ensurePlaylistExists();
        if (playlistId) {
          try {
            await addTrackToPlaylist(playlistId, {
              id: track.id,
              title: track.title,
              isrc: track.isrc || '',
              artistId: track.artists?.[0]?.id || 0,
              artistName: track.artists?.[0]?.name || 'Unknown',
              albumCover: track.album?.coverMedium || '',
            });
          } catch (err) {
            console.error('Failed to add to playlist:', err);
          }
        }
      })();
    }

    const swipeOutDuration = 300;
    const targetX = (decision === 'like' ? 1 : -1) * screenWidth * 1.5;

    translateX.value = withTiming(targetX, { duration: swipeOutDuration });
    rotation.value = withTiming(targetX / 20, { duration: swipeOutDuration }, () => {});

    nextAndPause(decision);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      rotation.value = interpolate(
        e.translationX,
        [-screenWidth / 2, screenWidth / 2],
        [-15, 15],
        Extrapolate.CLAMP
      );
    })
    .onEnd((e) => {
      const shouldSwipe =
        Math.abs(e.translationX) > SWIPE_THRESHOLD ||
        Math.abs(e.velocityX) > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipe) {
        const direction = e.translationX > 0 ? 'like' : 'dislike';
        runOnJS(handleSwipeAction)(direction as 'like' | 'dislike');
      } else {
        translateX.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    });

  const onLike = (skipAutoAdd?: boolean) => handleSwipeAction('like', skipAutoAdd);
  const onDislike = () => handleSwipeAction('dislike');

  return (
    <ScreenLayout
      className="items-center px-4"
      style={{ paddingTop: 70 }}
      testID="home-screen-layout">
      <WebPlaybackStarter />

      {/* Playlist Created Modal */}
      <Modal
        visible={showPlaylistCreatedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlaylistCreatedModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { backgroundColor: colors.card }]}>
            <Text style={[modalStyles.title, { color: colors.text }]}>🎵 Playlist Created!</Text>
            <Text style={[modalStyles.message, { color: colors.textSecondary }]}>
              Your liked songs will be saved to "{DEFAULT_PLAYLIST_NAME}" playlist.
            </Text>
            <Pressable
              onPress={() => setShowPlaylistCreatedModal(false)}
              style={[modalStyles.button, { backgroundColor: colors.accent }]}>
              <Text style={modalStyles.buttonText}>Got it!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View className="w-full flex-1 items-center">
        {error && <Text style={{ color: 'red', marginTop: 50 }}>Error: {String(error)}</Text>}

        {(!track || !ready || loading) && !error && (
          <View
            style={{
              height: screenHeight - 240,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Animated.View style={loaderTranslateStyle}>
              <ActivityIndicatorIcon width={120} height={120} color="#F05454" />
            </Animated.View>
          </View>
        )}

        {!loading && track && ready && !error && (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[{ width: '100%', alignItems: 'center' }, animatedStyle]}>
              <MainCardDisplayedContent
                track={track}
                player={player}
                muted={muted}
                onUndo={() => {
                  undo?.();
                }}
                undoDisabled={!canUndo}
                onDislike={onDislike}
                onLike={onLike}
                cardHeight={screenHeight - 240}
                cardWidth={Math.min(screenWidth - 32, 500)}
                isFocused={isFocused}
              />
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </ScreenLayout>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
