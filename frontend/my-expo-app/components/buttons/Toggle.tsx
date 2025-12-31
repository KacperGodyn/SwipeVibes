import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';

const COLORS = {
  white: '#000000ff',
  active: '#F05454',
  inactive: '#ddddddff',
  inactiveBorder: '#D1D1D6',
};

const CONFIG = {
  trackWidth: 52,
  trackHeight: 32,
  thumbSize: 28,
  padding: 2,
};

type ToggleProps = {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  style?: ViewStyle;
  disabled?: boolean;
};

function Toggle({ value = false, onValueChange, style, disabled = false }: ToggleProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CONFIG.padding, CONFIG.trackWidth - CONFIG.thumbSize - CONFIG.padding],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.inactive, COLORS.active],
  });

  const handlePress = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[style, { opacity: disabled ? 0.5 : 1 }]}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor,
            borderColor: value ? 'transparent' : COLORS.inactiveBorder,
          },
        ]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: CONFIG.trackWidth,
    height: CONFIG.trackHeight,
    borderRadius: CONFIG.trackHeight / 2,
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  thumb: {
    width: CONFIG.thumbSize,
    height: CONFIG.thumbSize,
    borderRadius: CONFIG.thumbSize / 2,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    elevation: 2,
  },
});

export { Toggle };