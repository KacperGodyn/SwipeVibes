import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Platform, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { useRecommendation } from '../services/recommendation/RecommendationContext';
import { useTheme } from '../services/theme/ThemeContext';
import { setNumber, getNumber } from '../services/storage/mmkv';

export default function VolumeSlider() {
  const { player } = useRecommendation();
  const { colors } = useTheme();

  const [width, setWidth] = useState(0);
  const THUMB_SIZE = 24;
  const [displayVol, setDisplayVol] = useState(100);

  const x = useSharedValue(0);

  useEffect(() => {
    if (player && width > 0) {
      const savedVol = getNumber('user_volume', player.volume ?? 1);
      x.value = savedVol * width;
      setDisplayVol(Math.round(savedVol * 100));
    }
  }, [width, player]);

  const updateVolume = (newX: number) => {
    if (!player || width === 0) return;
    const clampedX = Math.max(0, Math.min(newX, width));
    const newVol = clampedX / width;

    player.volume = newVol;
    player.muted = newVol === 0;
    setDisplayVol(Math.round(newVol * 100));

    setNumber('user_volume', newVol);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {})
    .onBegin(() => {})
    .onChange((e) => {
      x.value = Math.max(0, Math.min(x.value + e.changeX, width));
      runOnJS(updateVolume)(x.value);
    });

  const context = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = x.value;
    })
    .onUpdate((e) => {
      const newVal = Math.max(0, Math.min(context.value + e.translationX, width));
      x.value = newVal;
      runOnJS(updateVolume)(newVal);
    });

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - THUMB_SIZE / 2 }],
  }));

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: x.value,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  if (Platform.OS !== 'web') return null;

  if (!player) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.volText, { color: colors.textSecondary }]}>{displayVol}%</Text>
      <View style={styles.container}>
        <GestureDetector gesture={gesture}>
          <View style={styles.touchArea} onLayout={onLayout}>
            <View style={[styles.track, { backgroundColor: colors.inputBorder }]}>
              <Animated.View
                style={[styles.fill, { backgroundColor: colors.accent }, animatedFillStyle]}
              />
            </View>

            <Animated.View
              style={[
                styles.thumb,
                { backgroundColor: colors.text, borderColor: colors.card },
                animatedThumbStyle,
              ]}
            />
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  volText: {
    fontSize: 12,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  container: {
    width: 130,
    height: 40,
    justifyContent: 'center',
  },
  touchArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  track: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
