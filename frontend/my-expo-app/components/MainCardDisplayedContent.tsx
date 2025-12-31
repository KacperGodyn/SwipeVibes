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

type Props = {
  track: RandomTrackResponse;
  player: AudioPlayer;
  muted: boolean;
  onUndo: () => void;
  undoDisabled: boolean;
  onDislike: () => void;
  onLike: (skipAutoAdd?: boolean) => void;
};

export default function MainCardDisplayedContent({
  track,
  player,
  muted,
  onUndo,
  undoDisabled,
  onDislike,
  onLike,
}: Props) {
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

  const source = useMemo(() => track?.preview ?? null, [track?.preview]);

  const tryPlay = () => {
    if (!source) return;
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
    if (source) tryPlay();
  }, [player, localMuted, source]);

  useEffect(() => {
    if (!source) return;
    const interval = setInterval(() => {
      if (player.playing && player.currentTime >= snippetDuration) {
        player.pause();
        player.seekTo(0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [player, snippetDuration, source]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const resumeFromGesture = () => {
      if (!source) return;
      tryPlay();
    };
    window.addEventListener('pointerdown', resumeFromGesture, { passive: true, once: true });
    window.addEventListener('keydown', resumeFromGesture, { passive: true, once: true });
    window.addEventListener('touchstart', resumeFromGesture, { passive: true, once: true });
    const onVis = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    document.addEventListener('visibilitychange', onVis);
    let tries = 0;
    const id = setInterval(() => {
      if (!source || localMuted) return;
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
  }, [source, localMuted, player]);

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
          style={[
            styles.square,
            { backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, minHeight: 500 },
          ]}
          className="items-center">
          <Text className="mb-2 text-center text-lg font-bold text-white">
            Where do you want to save?
          </Text>
          <Text className="mb-4 text-center text-xs text-gray-200">
            The track will be added & liked
          </Text>

          <View style={{ flex: 1, width: '100%' }}>
            <Playlists onSelect={handleAddToPlaylist} lastActivePlaylistId={lastPlaylistId} />
          </View>

          <Pressable
            onPress={() => setIsSelectingPlaylist(false)}
            className="my-4 w-24 items-center rounded-full border border-white/20 bg-white/30 py-2 shadow-md backdrop-blur-xl active:bg-white/40">
            <Text className="font-bold text-white">Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View className="items-center gap-2 p-6">
        <Toggle value={localMuted} onValueChange={toggleMute} />

        {localMuted ? (
          <Text className="text-[12px] font-bold uppercase tracking-widest text-[#F05454]">
            Muted
          </Text>
        ) : (
          <Text className="text-[12px] font-bold uppercase tracking-widest text-[#666666]">
            Unmuted
          </Text>
        )}
      </View>

      <View style={styles.square}>
        {artistPic ? (
          <Image source={{ uri: artistPic }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.fallback]}>
            <Text style={styles.fallbackText}>{track.title ?? 'No Art'}</Text>
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
          {artistNames}
        </Text>
      </View>

      <CardNavigationContainer
        onUndo={onUndo}
        undoDisabled={undoDisabled}
        onDislike={onDislike}
        onSuper={() => setIsSelectingPlaylist(true)}
        onLike={() => onLike(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    width: 320,
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderRadius: 16,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'transparent',
  },
  fallbackText: { color: '#fff', textAlign: 'center' },

  meta: { width: 302, alignItems: 'center', gap: 2 },
  title: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  artist: { fontSize: 13, fontWeight: '500', color: '#ddd', textAlign: 'center' },

  muteText: { color: '#000', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  Icon: { height: 30, width: 30 },
});
