import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useAudioPrefs } from '../services/audio/useAudioPrefs';
import { SwipeResetType } from '../services/auth/gRPC/user/users_pb';
import { resetSwipeHistory, deleteAllPlaylists, deleteAccount } from '../services/auth/api';
import ScreenLayout from 'components/ScreenLayout';
import { useTheme } from '../services/theme/ThemeContext';
import { Toggle } from 'components/buttons/Toggle';

const AVAILABLE_GENRES = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'Rap',
  'R&B',
  'Electronic',
  'Techno',
  'House',
  'Jazz',
  'Classical',
  'Metal',
  'Indie',
  'Reggae',
  'Country',
];

const AVAILABLE_LANGUAGES = [
  'English',
  'Polish',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Japanese',
  'Korean',
];

const CARD_PADDING_HORIZONTAL = 16;
const CARD_MARGIN_BOTTOM = 120;
const CARD_BORDER_RADIUS = 24;

type DangerActionType = 'reset' | 'playlists' | 'wipe' | null;

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  const {
    snippetDuration,
    setSnippetDuration,
    autoExportLikes,
    setAutoExportLikes,
    genreFilters,
    setGenreFilters,
    languageFilters,
    setLanguageFilters,
  } = useAudioPrefs();

  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<DangerActionType>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const options = [10, 20, 30] as const;
  const activeOptionIndex = options.indexOf(snippetDuration as 10 | 20 | 30);

  const cardHeight = screenHeight - 240;

  const scrollY = useSharedValue(0);
  const [contentHeight, setContentHeight] = useState(1);
  const [visibleHeight, setVisibleHeight] = useState(1);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollIndicatorStyle = useAnimatedStyle(() => {
    if (contentHeight <= visibleHeight || visibleHeight <= 0) {
      return { opacity: 0 };
    }

    const indicatorHeight = (visibleHeight / contentHeight) * visibleHeight;
    const translateY =
      (scrollY.value / (contentHeight - visibleHeight)) * (visibleHeight - indicatorHeight - 24); // -24 for padding

    // Clamp values to keep inside header/footer bounds if needed, but simplified here
    return {
      height: Math.max(indicatorHeight, 40), // Min height 40
      transform: [
        { translateY: Math.max(0, Math.min(translateY, visibleHeight - indicatorHeight)) },
      ],
      opacity: withTiming(1, { duration: 200 }),
    };
  });

  const [optionWidth, setOptionWidth] = useState(0);
  const indicatorLeft = useSharedValue(0);
  const hasInitialized = useRef(false);
  const handleOptionLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0 && optionWidth === 0) {
      setOptionWidth(width);
    }
  };

  useEffect(() => {
    if (optionWidth > 0 && activeOptionIndex >= 0) {
      const targetLeft = activeOptionIndex * optionWidth + 4;
      if (!hasInitialized.current) {
        indicatorLeft.value = targetLeft;
        hasInitialized.current = true;
      } else {
        indicatorLeft.value = withTiming(targetLeft, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    }
  }, [activeOptionIndex, optionWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
  }));

  const toggleFilter = (item: string, currentList: string[], setList: (l: string[]) => void) => {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const renderChips = (
    items: string[],
    currentList: string[] = [],
    setList: (l: string[]) => void
  ) => (
    <View style={styles.chipsContainer}>
      {items.map((item) => {
        const isActive = currentList.includes(item);
        return (
          <Pressable
            key={item}
            onPress={() => toggleFilter(item, currentList, setList)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.accent : colors.input,
                borderColor: isActive ? colors.accent : colors.inputBorder,
              },
            ]}>
            <Text style={[styles.chipText, { color: isActive ? '#fff' : colors.textSecondary }]}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const performReset = async (type: SwipeResetType) => {
    try {
      setIsLoading(true);
      await resetSwipeHistory(type);
      setStatusMessage('Swipe history cleared successfully.');
      setActiveAction(null);
    } catch {
      setStatusMessage('Error: Failed to reset history.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const performDeletePlaylists = async (unsubSpotify: boolean) => {
    try {
      setIsLoading(true);
      await deleteAllPlaylists(unsubSpotify);
      setStatusMessage('All playlists deleted.');
      setActiveAction(null);
    } catch {
      setStatusMessage('Error: Failed to delete playlists.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const performWipeAccount = async () => {
    try {
      setIsLoading(true);
      await deleteAccount();
    } catch {
      setStatusMessage('Error: Failed to delete account.');
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
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
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          </View>

          {statusMessage && (
            <View style={styles.statusMessage}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onContentSizeChange={(_, height) => setContentHeight(height)}
            onLayout={(e) => setVisibleHeight(e.nativeEvent.layout.height)}>
            {/* Snippet Duration */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Snippet Duration</Text>
              <View
                style={[
                  styles.optionsRow,
                  { borderColor: colors.inputBorder, backgroundColor: colors.input },
                ]}>
                {/* Animated Slide Indicator */}
                {optionWidth > 0 && (
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        top: 4,
                        bottom: 4,
                        width: optionWidth,
                        borderRadius: 8,
                        backgroundColor: colors.accent,
                      },
                      indicatorStyle,
                    ]}
                  />
                )}

                {options.map((opt, index) => (
                  <Pressable
                    key={opt}
                    onLayout={index === 0 ? handleOptionLayout : undefined}
                    onPress={() => setSnippetDuration(opt)}
                    style={styles.optionButton}>
                    <Text
                      style={[
                        styles.optionText,
                        { color: snippetDuration === opt ? '#fff' : colors.textSecondary },
                      ]}>
                      {opt}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Auto Export */}
            <View
              style={[
                styles.switchRow,
                { borderColor: colors.inputBorder, backgroundColor: colors.input },
              ]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Auto-Export "Likes"
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Instant Sync to Spotify
                </Text>
              </View>
              <Toggle value={autoExportLikes} onValueChange={setAutoExportLikes} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Genre Preferences */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Genre Preferences</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select genres to focus on (Optional)
              </Text>
              {renderChips(AVAILABLE_GENRES, genreFilters || [], setGenreFilters)}
            </View>

            {/* Language Preferences */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Language Preferences
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select preferred languages
              </Text>
              {renderChips(AVAILABLE_LANGUAGES, languageFilters || [], setLanguageFilters)}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <Text style={styles.dangerSubtitle}>Irreversible actions</Text>

              {/* Reset History */}
              {activeAction === 'reset' ? (
                <View style={styles.dangerPanel}>
                  <Text style={[styles.dangerPanelTitle, { color: colors.text }]}>
                    Reset Swipe History?
                  </Text>
                  <View style={styles.dangerButtons}>
                    <Pressable
                      style={styles.dangerButton}
                      onPress={() => performReset(SwipeResetType.RESET_LIKES)}>
                      <Text style={styles.dangerButtonText}>Likes Only</Text>
                    </Pressable>
                    <Pressable
                      style={styles.dangerButton}
                      onPress={() => performReset(SwipeResetType.RESET_DISLIKES)}>
                      <Text style={styles.dangerButtonText}>Dislikes Only</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.dangerButtonRed}
                    onPress={() => performReset(SwipeResetType.RESET_ALL)}>
                    <Text style={styles.dangerButtonRedText}>RESET ALL</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={() => setActiveAction(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.dangerTrigger}
                  onPress={() => setActiveAction('reset')}
                  disabled={isLoading || activeAction !== null}>
                  <Text style={styles.dangerTriggerText}>Reset Swipe History...</Text>
                </Pressable>
              )}

              {/* Delete Playlists */}
              {activeAction === 'playlists' ? (
                <View style={styles.dangerPanel}>
                  <Text style={[styles.dangerPanelTitle, { color: colors.text }]}>
                    Delete All Playlists?
                  </Text>
                  <Pressable
                    style={styles.dangerButton}
                    onPress={() => performDeletePlaylists(false)}>
                    <Text style={styles.dangerButtonText}>Delete Local Only</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dangerButtonRed}
                    onPress={() => performDeletePlaylists(true)}>
                    <Text style={styles.dangerButtonRedText}>Delete & Unsubscribe</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={() => setActiveAction(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.dangerTrigger}
                  onPress={() => setActiveAction('playlists')}
                  disabled={isLoading || activeAction !== null}>
                  <Text style={styles.dangerTriggerText}>Delete All Playlists...</Text>
                </Pressable>
              )}

              {/* Wipe Account */}
              {activeAction === 'wipe' ? (
                <View style={[styles.dangerPanel, { borderColor: '#F05454' }]}>
                  <Text style={styles.wipeTitle}>DELETE ACCOUNT</Text>
                  <Text style={styles.wipeSubtitle}>This is strictly irreversible.</Text>
                  <Pressable style={styles.wipeButton} onPress={performWipeAccount}>
                    <Text style={styles.wipeButtonText}>CONFIRM DELETE</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={() => setActiveAction(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.wipeTrigger}
                  onPress={() => setActiveAction('wipe')}
                  disabled={isLoading || activeAction !== null}>
                  <Text style={styles.wipeTriggerText}>Delete Account</Text>
                </Pressable>
              )}
            </View>
          </Animated.ScrollView>

          {/* Custom Scrollbar */}
          <View style={styles.customScrollbarTrack}>
            <Animated.View
              style={[
                styles.customScrollbarThumb,
                { backgroundColor: colors.accent },
                scrollIndicatorStyle,
              ]}
            />
          </View>

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#F05454" />
            </View>
          )}
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    paddingTop: 70, // Space for theme toggle button
    alignItems: 'center', // Center card on web
  },

  card: {
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    overflow: 'hidden', // IMPORTANT: Content must be clipped
    width: '100%',
    maxWidth: 500, // Limit width on web
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
  statusMessage: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  statusText: {
    color: '#22c55e',
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  customScrollbarTrack: {
    position: 'absolute',
    right: 4,
    top: 80, // Skip header
    bottom: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  customScrollbarThumb: {
    width: '100%',
    borderRadius: 99,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  optionText: {
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },

  switchInfo: {
    flex: 1,
    paddingRight: 16,
  },
  divider: {
    height: 1,
    marginBottom: 24,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dangerZone: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 11,
    color: 'rgba(239, 68, 68, 0.7)',
    marginBottom: 20,
  },
  dangerPanel: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 12,
  },
  dangerPanelTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  dangerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dangerButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerButtonRed: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ef4444',
    marginBottom: 8,
  },
  dangerButtonRedText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#888',
    fontSize: 12,
  },
  dangerTrigger: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginBottom: 12,
  },
  dangerTriggerText: {
    color: '#f87171',
    fontWeight: '600',
  },
  wipeTrigger: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.6)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  wipeTriggerText: {
    color: '#ef4444',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  wipeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  wipeSubtitle: {
    fontSize: 11,
    color: '#f87171',
    textAlign: 'center',
    marginBottom: 16,
  },
  wipeButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ef4444',
    marginBottom: 8,
  },
  wipeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CARD_BORDER_RADIUS,
  },
});
