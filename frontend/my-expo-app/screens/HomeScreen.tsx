import React, { useEffect, useMemo } from 'react';
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
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

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 800;

export default function HomeScreen() {
  const { track, loading, error, refetch, undo, canUndo } = provideRecommendation();
  const { muted, ready } = useAudioPrefs();
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
        translateX: interpolate(loaderAnim.value, [0, 1], [-20, 20])
      }
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

  const handleSwipeAction = (decision: 'like' | 'dislike') => {
    if (loading || !track) return;

    const swipeOutDuration = 300;
    const targetX = (decision === 'like' ? 1 : -1) * screenWidth * 1.5;

    translateX.value = withTiming(targetX, { duration: swipeOutDuration });
    rotation.value = withTiming(targetX / 20, { duration: swipeOutDuration }, () => {
    });

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

  const onLike = () => handleSwipeAction('like');
  const onDislike = () => handleSwipeAction('dislike');

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffffff' }}>
      <View style={{ flex: 8, justifyContent: 'center', alignItems: 'center' }}>
        
        {error && <Text style={{ color: 'black' }}>Error: {String(error)}</Text>}
        
        {(!track || !ready || loading) && !error && (
          <Animated.View style={loaderTranslateStyle}>
            <ActivityIndicatorIcon width={120} height={120} />
          </Animated.View>
        )}
        
        {!loading && track && ready && !error && (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[{ width: '85%', height: '85%' }, animatedStyle]}>
              <ContainerFlexColumn style={{ width: '100%', height: '100%' }} colors={cardGradient}>
                <SubContainerFlexRow style={{ width: '85%', alignSelf: 'center', height: '82%' }}>
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
        <ContainerFlexColumn
          style={{ width: '85%', alignSelf: 'center', height: '60%', marginBottom: 60 }}>
          <SubContainerFlexRow>
            <GeneralNavigationContainer />
          </SubContainerFlexRow>
        </ContainerFlexColumn>
      </View>
    </View>
  );
}

const cardGradient = ['#00F539', '#22CA49', '#35A04E', '#3B7548', '#324B38', '#2B332C'] as const;