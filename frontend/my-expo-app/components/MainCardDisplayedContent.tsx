import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import provideRandomRecommendation from '../services/recommendation/provideRandomRecommendation';
import MutedIcon from '../assets/HomeCard/muted.svg'
import UnMutedIcon from '../assets/HomeCard/unmuted.svg'

export default function MainCardDisplayedContent() {
  const userLoggedInWithDeezer = false;
  const { track, loading, error /*, refetch */ } = provideRandomRecommendation();

  const source = useMemo(() => track?.preview ?? null, [track?.preview]);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  const [isMuted, setIsMuted] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    player.loop = true;
    player.muted = true;
    setIsMuted(true);
    setHasStarted(false);
  }, [player, source]);

  const toggleMute = async () => {
    try {
      if (!hasStarted) {
        await player.play();
        setHasStarted(true);
      }
      const next = !isMuted;
      player.muted = next;
      setIsMuted(next);

      if (!next && status && !status.playing) {
        await player.play();
      }
    } catch (e) {
      console.warn('toggle mute error', e);
    }
  };

  if (error) return <Text>Error: {error}</Text>;
  if (loading || !track) return <ActivityIndicator />;

  if (!userLoggedInWithDeezer) {
    const artistPic =
      track.album?.coverXl ??
      track.album?.coverBig ??
      track.artists?.[0]?.pictureXl ??
      track.artists?.[0]?.pictureBig;

    return (
      <View style={styles.wrapper}>
        <View style={styles.square}>
          {artistPic ? (
            <Image source={{ uri: artistPic }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.fallback]}>
              <Text style={styles.fallbackText}>{track.title ?? 'No Art'}</Text>
            </View>
          )}

          <Pressable onPress={toggleMute} style={styles.muteBtn}>
            <View style={styles.muteBtnInner}>
              <Text style={styles.muteText}>{isMuted ? <MutedIcon width={40} height={40} className='rounded-3xl px-2 shadow-md justify-around border border-white/20 bg-white/30 backdrop-blur-xl'/> : <UnMutedIcon width={40} height={40} className='rounded-3xl px-2 shadow-md justify-around border border-white/20 bg-white/30 backdrop-blur-xl' /> }</Text>
            </View>
          </Pressable>
        </View>
        <View className="rounded-3xl bg-white py-2 px-2 shadow-md flex-row items-center justify-around gap-5 border border-white/20 bg-white/30 backdrop-blur-xl">
          <Text style={styles.caption} numberOfLines={3}>
            {track.title} — {track.artists?.[0]?.name ?? 'Unknown'}
          </Text>
        </View>
      </View>
    );
  }

  return <View />;
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  square: {
    width: 302,
    borderRadius: 24,
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { width: '100%', height: '100%', borderRadius: 24 },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { color: '#fff', textAlign: 'center' },
  muteBtn: { position: 'absolute', top: 10, right: 10 },
  muteBtnInner: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    opacity: 0.95,
  },
  muteText: { color: '#000', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  caption: { color: '#000', fontSize: 14, width: 286, textAlign: 'center' },
});
