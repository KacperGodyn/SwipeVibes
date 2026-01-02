import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useTheme } from '../services/theme/ThemeContext';
import { getBool, setBool } from '../services/storage/mmkv';
import { userClient } from '../services/auth/gRPC/user/connectClient';
import { getAccessToken } from '../services/auth/token';

export default function CookieConsentModal() {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web') {
      const hasConsent = getBool('cookie_consent_accepted', false);
      if (!hasConsent) {
        setTimeout(() => setVisible(true), 1000);
      }
    }
  }, []);

  const handleAccept = async () => {
    setBool('cookie_consent_accepted', true);
    setVisible(false);

    const token = getAccessToken();
    if (token) {
      try {
        await userClient.setCookiesAccepted({ accepted: true });
      } catch (err) {}
    }
  };

  if (!visible) return null;

  return (
    <Animated.View entering={FadeInUp.delay(500)} exiting={FadeOutDown} style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.content}>
          <Text style={styles.icon}>🍪</Text>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Cookies & Storage</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              We use local storage to save your preferences (theme, volume) and cookies for secure
              authentication.
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleAccept}>
          <Text style={styles.buttonText}>Accept</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    width: 'auto',
    alignItems: 'center',
    zIndex: 10000,
    pointerEvents: 'box-none',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    maxWidth: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    gap: 16,
    flexWrap: 'wrap',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 200,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
