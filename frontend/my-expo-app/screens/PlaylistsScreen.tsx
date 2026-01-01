import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  useWindowDimensions,
  ActivityIndicator, // Added ActivityIndicator
  LayoutChangeEvent, // Added LayoutChangeEvent
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; // Added useRouter
import Animated, {
  FadeInDown,
  FadeOutUp, // Added FadeOutUp
  useSharedValue, // Added useSharedValue
  useAnimatedScrollHandler, // Added useAnimatedScrollHandler
  useAnimatedStyle, // Added useAnimatedStyle
  withTiming, // Added withTiming
} from 'react-native-reanimated';
import ScreenLayout from 'components/ScreenLayout';
import { useTheme } from '../services/theme/ThemeContext';
import Playlists from 'components/playlists/Playlists';
import { createPlaylist } from '../services/auth/api';

// Icons
import ReturnIcon from '../assets/HomeCard/undo.svg';
import CancelIcon from '../assets/HomeCard/dislike.svg';
import ConfirmIcon from '../assets/HomeCard/like.svg';
import NewPlaylistIcon from '../assets/PlaylistsCard/new_playlist.svg';

// Custom Card Constants
const CARD_PADDING_HORIZONTAL = 16;
const CARD_BORDER_RADIUS = 24;

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const router = useRouter(); // Initialized useRouter
  const [refreshKey, setRefreshKey] = useState(0);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  useFocusEffect(
    useCallback(() => {
      triggerRefresh();
    }, [])
  );

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      setCreating(true);
      await createPlaylist(newPlaylistName.trim());
      setIsAddingNew(false);
      setNewPlaylistName('');
      triggerRefresh();
    } catch (error: any) {
      console.error('Couldnt create a playlist:', error);
      Alert.alert('Error', 'Couldnt create a playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setNewPlaylistName('');
  };

  // Card dimensions
  const cardHeight = screenHeight - 240;

  // Scrollbar Logic
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
      (scrollY.value / (contentHeight - visibleHeight)) * (visibleHeight - indicatorHeight - 24);

    return {
      height: Math.max(indicatorHeight, 40),
      transform: [
        { translateY: Math.max(0, Math.min(translateY, visibleHeight - indicatorHeight)) },
      ],
      opacity: withTiming(1, { duration: 200 }),
    };
  });

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
          {/* Header Section */}
          <View style={styles.cardHeader}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]}>Playlists</Text>
              {!isAddingNew && (
                <Pressable
                  onPress={() => setIsAddingNew(true)}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      borderColor: colors.accent,
                      backgroundColor: colors.accent,
                      opacity: pressed ? 0.8 : 1,
                      shadowColor: colors.accent,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                    },
                  ]}>
                  <NewPlaylistIcon width={24} height={24} color="#000" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Add Playlist Input Section */}
            {isAddingNew && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={[
                  styles.addSection,
                  { backgroundColor: colors.input, borderColor: colors.inputBorder },
                ]}>
                <TextInput
                  placeholder="Playlist Name..."
                  placeholderTextColor={colors.textSecondary}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  style={[styles.textInput, { color: colors.text }]}
                  autoFocus={true}
                  onSubmitEditing={handleCreatePlaylist}
                  returnKeyType="done"
                />

                <View style={styles.addActions}>
                  <Pressable onPress={handleCancel} style={styles.actionButtonSmall}>
                    <CancelIcon width={20} height={20} />
                  </Pressable>

                  <Pressable
                    onPress={handleCreatePlaylist}
                    disabled={creating || !newPlaylistName.trim()}
                    style={[
                      styles.actionButtonSmall,
                      { backgroundColor: colors.accent },
                      (!newPlaylistName.trim() || creating) && styles.disabledButton,
                    ]}>
                    {creating ? (
                      <Text style={styles.loadingDots}>...</Text>
                    ) : (
                      <ConfirmIcon width={20} height={20} />
                    )}
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {/* Content with Custom Scrollbar */}
            <View style={styles.contentWrapper}>
              <Playlists
                refreshTrigger={refreshKey} // Changed from refreshKey to refreshTrigger to match existing prop name
                onScroll={scrollHandler}
                onContentSizeChange={(_, h) => setContentHeight(h)}
                onLayout={(e) => setVisibleHeight(e.nativeEvent.layout.height)}
              />
              {/* Custom Scrollbar */}
              <View style={styles.scrollTrack}>
                <Animated.View
                  style={[
                    styles.scrollThumb,
                    { backgroundColor: colors.accent },
                    scrollIndicatorStyle,
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Footer with Return Button */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.returnButton,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <ReturnIcon width={20} height={20} color={colors.text} />
              <Text style={[styles.returnText, { color: colors.text }]}>Return to Profile</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    paddingTop: 60, // Consistent with others
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
    padding: 24,
    paddingBottom: 16,
    zIndex: 10, // Ensure header is above scroll content if needed
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingLeft: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  addActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonSmall: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    height: 40,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingDots: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Content Wrapper ensuring correct layout for scrollbar
  contentWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  scrollTrack: {
    position: 'absolute',
    right: 4,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  scrollThumb: {
    width: '100%',
    borderRadius: 2,
  },
  footer: {
    padding: 16,
    paddingTop: 0,
    alignItems: 'center',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  returnText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
