import React, { useEffect, useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import ContainerFlexColumn from 'components/containers/ContainerFlexColumn';
import SubContainerFlexRow from 'components/containers/SubContainerFlexRow';
import GeneralNavigationContainer from 'components/containers/GeneralNavigationContainer';
import MainCardDisplayedContent from 'components/MainCardDisplayedContent';
import provideRecommendation, {
  RandomTrackResponse,
} from '../services/recommendation/provideRecommendation';
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
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useAudioPrefs } from '../services/audio/useAudioPrefs';
import { logInteraction } from '../services/interactions';
import ActivityIndicatorIcon from '../assets/HomeCard/activity_indicator.svg';

import { addTrackToPlaylist } from '../services/auth/api';
import { getString } from '../services/storage/mmkv';

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 800;

export default function HomeScreen() {
  const { track, loading, error, refetch, undo, canUndo } = provideRecommendation();
  const { muted, ready, autoExportLikes } = useAudioPrefs();
  const { width: screenWidth } = useWindowDimensions();

  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const loaderAnim = useSharedValue(0);

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

  const source = useMemo(() => track?.preview ?? null, [track?.preview]);
  const player = useAudioPlayer(source);
  useAudioPlayerStatus(player);

  useEffect(() => {
    player.loop = true;
  }, [player]);

  useEffect(() => {
    const old = player;
    return () => {
      try {
        old.pause();
      } catch {}
    };
  }, [source]);

  useEffect(() => {
    if (!loading && track) {
      translateX.value = 0;
      rotation.value = 0;
    }
  }, [loading, track, translateX, rotation]);

  const send = async (t: RandomTrackResponse, decision: 'like' | 'dislike' | 'skip') => {
    if (!t.isrc) return;
    console.log(`Sending interaction: ${decision} for ${t.title}`);

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

  const handleSwipeAction = (decision: 'like' | 'dislike', skipAutoAdd = false) => {
    if (loading || !track) return;

    if (decision === 'like' && !skipAutoAdd) {
      const lastActivePlaylistId = getString('last_active_playlist_id');

      if (lastActivePlaylistId) {
        addTrackToPlaylist(lastActivePlaylistId, {
          id: track.id,
          title: track.title,
          isrc: track.isrc || '',
          artistId: track.artists?.[0]?.id || 0,
          artistName: track.artists?.[0]?.name || 'Unknown',
          albumCover: track.album?.coverMedium || '',
        }).catch((err) => console.error('Failed to add to sticky playlist in bg:', err));
      }
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
      const { translationX, velocityX } = e;

      if (
        Math.abs(translationX) > SWIPE_THRESHOLD ||
        Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD
      ) {
        const decision = translationX > 0 ? 'like' : 'dislike';

        runOnJS(handleSwipeAction)(decision);
      } else {
        translateX.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    });

  const onLike = (skipAutoAdd?: boolean) => handleSwipeAction('like', skipAutoAdd);
  const onDislike = () => handleSwipeAction('dislike');

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <View style={{ flex: 8, justifyContent: 'center', alignItems: 'center' }}>
        {error && <Text style={{ color: 'black' }}>Error: {String(error)}</Text>}

        {(!track || !ready || loading) && !error && (
          <Animated.View style={loaderTranslateStyle}>
            <ActivityIndicatorIcon width={120} height={120} color="#F05454" />
          </Animated.View>
        )}

        {!loading && track && ready && !error && (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[{ width: '95%', height: '90%' }, animatedStyle]}>
              <ContainerFlexColumn
                style={{ width: '100%', height: '100%', borderRadius: 40, boxShadow: '0 1px 2px 0 #F05454', maxWidth: 600 }}
                colors={cardGradient}
                >
                <SubContainerFlexRow style={{ width: '95%', alignSelf: 'center', height: '82%' }}>
                  <View>
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
                    />
                  </View>
                </SubContainerFlexRow>
              </ContainerFlexColumn>
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      <View style={{ flex: 1.5 }}>
        <GeneralNavigationContainer />
      </View>
    </View>
  );
}

const cardGradient = ['#222831', '#222831', '#222831', '#222831', '#222831', '#222831'] as const;
