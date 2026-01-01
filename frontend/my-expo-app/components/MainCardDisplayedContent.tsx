import React, { useState, useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { AudioPlayer } from 'expo-audio';
import { RandomTrackResponse } from '../services/recommendation/provideRecommendation';
import { useAudioPrefs } from '../services/audio/useAudioPrefs';
import CardNavigationContainer from './containers/CardNavigationContainer';
import MutedIcon from '../assets/HomeCard/muted.svg';
import UnMutedIcon from '../assets/HomeCard/unmuted.svg';
import Playlists from './playlists/Playlists';
import { addTrackToPlaylist } from '../services/auth/api';
import { getString, setString } from '../services/storage/mmkv';
import { Toggle } from '@/components/buttons/Toggle';
import { useTheme } from '../services/theme/ThemeContext';

type Props = {
  track: RandomTrackResponse;
  player: AudioPlayer;
  muted: boolean;
  onUndo: () => void;
  undoDisabled: boolean;
  onDislike: () => void;
  onLike: (skipAutoAdd?: boolean) => void;
  cardHeight: number;
  cardWidth: number;
  isFocused: boolean;
};

export default function MainCardDisplayedContent({
  track,
  player,
  muted,
  onUndo,
  undoDisabled,
  onDislike,
  onLike,
  cardHeight,
  cardWidth,
  isFocused,
}: Props) {
  const { colors } = useTheme();
  const { setMuted, snippetDuration } = useAudioPrefs();
  const [isSelectingPlaylist, setIsSelectingPlaylist] = useState(false);
  const [localMuted, setLocalMuted] = useState(muted);

  const [lastPlaylistId, setLastPlaylistId] = useState<string | null>(() => {
    const val = getString('last_active_playlist_id');
    return val || null;
  });

  useEffect(() => {
    setLocalMuted(muted);
  }, [muted]);

  // Pause if lost focus
  useEffect(() => {
    if (!isFocused) {
      try {
        player.pause();
      } catch {}
    } else if (source && !localMuted) {
      // Resume if regained focus and should be playing
      // tryPlay(); // Optional: do we want auto-resume? User didn't explicitly ask, but typical behavior.
      // User said "problem is timeami leci dalej".
      // Only pause on blur is the critical fix.
    }
  }, [isFocused, player]);

  const source = useMemo(() => track?.preview ?? null, [track?.preview]);

  const tryPlay = () => {
    if (!source || !isFocused) return;
    player.muted = localMuted;
    if (player.currentTime >= snippetDuration) {
      player.seekTo(0);
    }
    const p: any = player.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  };

  useEffect(() => {
    if (source && isFocused) tryPlay();
  }, [player, localMuted, source, isFocused]);

  useEffect(() => {
    if (!source) return;
    const interval = setInterval(() => {
      // Only loop if focused
      if (isFocused && player.playing && player.currentTime >= snippetDuration) {
        player.seekTo(0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [player, snippetDuration, source, isFocused]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const resumeFromGesture = () => {
      if (!source || !isFocused) return;
      tryPlay();
    };
    window.addEventListener('pointerdown', resumeFromGesture, { passive: true, once: true });
    window.addEventListener('keydown', resumeFromGesture, { passive: true, once: true });
    window.addEventListener('touchstart', resumeFromGesture, { passive: true, once: true });
    const onVis = () => {
      if (document.visibilityState === 'visible' && isFocused) tryPlay();
    };
    document.addEventListener('visibilitychange', onVis);
    let tries = 0;
    const id = setInterval(() => {
      if (!source || localMuted || !isFocused) return;
      tries++;
      if (tries > 12) {
        clearInterval(id);
        return;
      }
      tryPlay();
    }, 5000);
    return () => {
      window.removeEventListener('pointerdown', resumeFromGesture as any);
      window.removeEventListener('keydown', resumeFromGesture as any);
      window.removeEventListener('touchstart', resumeFromGesture as any);
      document.removeEventListener('visibilitychange', onVis as any);
      clearInterval(id);
    };
  }, [source, localMuted, player, isFocused]);

  const toggleMute = (val?: boolean) => {
    const next = typeof val === 'boolean' ? val : !localMuted;
    setLocalMuted(next);
    setMuted(next);
    player.muted = next;
    if (!next && source) tryPlay();
    else {
      try {
        player.pause();
      } catch {}
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await addTrackToPlaylist(playlistId, {
        id: track.id,
        title: track.title,
        isrc: track.isrc || '',
        artistId: track.artists?.[0]?.id || 0,
        artistName: track.artists?.[0]?.name || 'Unknown',
        albumCover: track.album?.coverMedium || '',
      });

      setString('last_active_playlist_id', playlistId);
      setLastPlaylistId(playlistId);

      onLike(true);

      setIsSelectingPlaylist(false);
    } catch (error) {
      console.error('Failed to add to playlist:', error);
    }
  };

  const artistPic =
    track?.artists?.[0]?.pictureXl ??
    track?.artists?.[0]?.pictureBig ??
    track?.album?.coverXl ??
    track?.album?.coverBig;

  const artistNames =
    track?.artists
      ?.map((a) => a?.name)
      .filter(Boolean)
      .join(', ') || 'Unknown artist';
  const title = track?.title || 'Unknown title';

  if (isSelectingPlaylist) {
    return (
      <View style={{ alignItems: 'center', width: '100%' }}>
        <View
          className="w-[90%] items-center overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-2xl"
          style={{ minHeight: 400 }}>
          <Text className="mb-2 text-center text-xl font-bold text-white shadow-sm">
            Save to Playlist
          </Text>
          <Text className="mb-6 text-center text-sm font-medium text-gray-400">
            Track will be added & liked
          </Text>

          <View style={{ flex: 1, width: '100%' }}>
            <Playlists onSelect={handleAddToPlaylist} lastActivePlaylistId={lastPlaylistId} />
          </View>

          <Pressable
            onPress={() => setIsSelectingPlaylist(false)}
            className="mt-6 w-32 items-center rounded-full bg-white/10 py-3 active:bg-white/20">
            <Text className="font-bold text-white">Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- Main Card Design ---

  // Calculate dynamic image size based on remaining space
  // Card Height - Padding (32) - Header (36) - Meta (70) - Controls (80) - Gaps (approx 30) - Extra Spacing (70)
  const availableHeight = cardHeight - 320;
  const imageSize = Math.min(availableHeight, 280);

  return (
    <View
      style={[
        styles.card,
        {
          height: cardHeight,
          width: cardWidth,
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}>
      {/* Top Status Bar (Mute) */}
      <View style={styles.header}>
        <Pressable
          onPress={() => toggleMute()}
          style={[
            styles.muteButton,
            { backgroundColor: colors.input, borderColor: colors.inputBorder },
          ]}>
          <Toggle value={localMuted} onValueChange={toggleMute} />
          <Text
            style={[styles.muteText, { color: localMuted ? colors.accent : colors.textSecondary }]}>
            {localMuted ? 'Muted' : 'Sound On'}
          </Text>
        </Pressable>
      </View>

      {/* Album Art Container */}
      <View
        style={[
          styles.imageContainer,
          {
            width: imageSize,
            height: imageSize,
            borderColor: colors.inputBorder,
            backgroundColor: colors.input,
          },
        ]}>
        {artistPic ? (
          <Image source={{ uri: artistPic }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {track.title?.charAt(0) ?? '?'}
            </Text>
          </View>
        )}
      </View>

      {/* Meta Info */}
      <View style={styles.metaContainer}>
        <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.artistName, { color: colors.accent }]} numberOfLines={1}>
          {artistNames}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <CardNavigationContainer
          onUndo={onUndo}
          undoDisabled={undoDisabled}
          onDislike={onDislike}
          onSuper={() => setIsSelectingPlaylist(true)}
          onLike={() => onLike(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  muteText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  imageContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    opacity: 0.5,
  },
  metaContainer: {
    width: '85%',
    alignItems: 'center',
    gap: 2,
    marginBottom: 6, // Reduced from 8 to 6
  },
  trackTitle: {
    fontSize: 18, // Reduced from 22 to 18
    fontWeight: '800',
    textAlign: 'center',
  },
  artistName: {
    fontSize: 12, // Reduced from 14 to 12
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4, // Kept as 4
  },
  controlsContainer: {
    // Removed scale to prevent overflow/crowding
    paddingBottom: 4,
  },
});
