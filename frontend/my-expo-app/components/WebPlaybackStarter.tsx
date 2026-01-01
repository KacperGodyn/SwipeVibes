import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useTheme } from '../services/theme/ThemeContext';
import { useAudioPrefs } from '../services/audio/useAudioPrefs';

let hasInteracted = false;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const registerInteraction = () => {
    hasInteracted = true;
    window.removeEventListener('click', registerInteraction);
    window.removeEventListener('keydown', registerInteraction);
    window.removeEventListener('touchstart', registerInteraction);
  };

  window.addEventListener('click', registerInteraction);
  window.addEventListener('keydown', registerInteraction);
  window.addEventListener('touchstart', registerInteraction);
}

export default function WebPlaybackStarter() {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  const { muted, ready } = useAudioPrefs();

  useEffect(() => {
    if (Platform.OS === 'web' && ready) {
      if (hasInteracted) return;

      if (!muted) {
        setVisible(true);
      }
    }
  }, [ready, muted]);

  const handleStart = () => {
    hasInteracted = true;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(500)}
      style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.emoji]}>🎵</Text>
        <Text style={[styles.title, { color: colors.text }]}>Start the Vibe</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Browser policies require interaction to play audio. Tap below to start!
        </Text>

        <Pressable
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleStart}>
          <Text style={styles.buttonText}>Let's Go!</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  } as any,
  card: {
    padding: 32,
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
