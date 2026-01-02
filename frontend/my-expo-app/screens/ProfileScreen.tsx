import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import ScreenLayout from 'components/ScreenLayout';
import { useTheme } from '../services/theme/ThemeContext';
import { useSession } from '../services/auth/ctx';
import { loadAccessToken, setAccessToken } from '../services/auth/token';
import { refreshAccess } from '../services/auth/api';
import { getSavedUsername, getSavedAvatar } from '../services/auth/userInfo';
import { SpotifyConnectButton } from 'components/buttons/SpotifyConnectButton';

const CARD_PADDING_HORIZONTAL = 16;
const CARD_BORDER_RADIUS = 24;

type JwtPayload = {
  name?: string;
  unique_name?: string;
  role?: string | string[];
  exp?: number;
  [k: string]: any;
};

function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '==='.slice((b64.length + 3) % 4);

  try {
    const bin =
      Platform.OS === 'web' && typeof atob === 'function'
        ? atob(pad)
        : String.fromCharCode(...Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));

    let json: string;
    try {
      json = decodeURIComponent(
        bin
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
    } catch {
      json = bin;
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const { signOut } = useSession();

  const [working, setWorking] = useState(false);
  const token = loadAccessToken();
  const payload = useMemo(() => decodeJwt(token), [token]);

  const savedUsername = getSavedUsername();
  const savedAvatar = getSavedAvatar();
  const username = savedUsername ?? payload?.name ?? payload?.unique_name ?? '(unknown)';

  const cardHeight = screenHeight - 240;

  const onLogout = async () => {
    setWorking(true);
    try {
      await signOut();
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            {
              height: cardHeight,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentContainer}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarWrapper, { borderColor: colors.accent }]}>
                  {savedAvatar ? (
                    <Image source={{ uri: savedAvatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.placeholderAvatar}>
                      <Text style={styles.placeholderText}>
                        {String(username ?? '?')
                          .slice(0, 1)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusBadge, { borderColor: colors.card }]} />
              </View>

              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
                <Text style={[styles.planBadge, { color: colors.textSecondary }]}>FREE PLAN</Text>
              </View>

              <View style={styles.actionsSection}>
                <View style={styles.integrationBlock}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Integration
                  </Text>
                  <View style={{ alignItems: 'center' }}>
                    <SpotifyConnectButton />
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <View style={styles.buttonContainer}>
                  <Pressable
                    onPress={() => router.push('/statistics')}
                    disabled={working}
                    style={({ pressed }) => [
                      styles.actionButton,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.inputBorder,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}>
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>
                      View Statistics
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push('/playlists')}
                    disabled={working}
                    style={({ pressed }) => [
                      styles.actionButton,
                      {
                        backgroundColor: colors.input,
                        borderColor: colors.inputBorder,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}>
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>
                      My Playlists
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={onLogout}
                    disabled={working}
                    style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.8 : 1 }]}>
                    <Text style={styles.logoutText}>Log Out</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    paddingTop: 70,
    alignItems: 'center',
  },
  card: {
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 500,
  },
  cardHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  contentContainer: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#F05454',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    borderWidth: 3,
  },
  userInfo: {
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planBadge: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  actionsSection: {
    width: '100%',
    gap: 8,
  },
  integrationBlock: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  spotifyWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 8,
    width: '100%',
    maxWidth: 320,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
