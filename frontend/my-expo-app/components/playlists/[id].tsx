import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Alert,
  Linking,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import ScreenLayout from 'components/ScreenLayout';
import { getPlaylistTracks, removeTrackFromPlaylist } from '../../services/auth/api';
import { userClient } from '../../services/auth/gRPC/user/connectClient';
import { ExportPlaylistRequest, type PlaylistTrack } from '../../services/auth/gRPC/user/users_pb';
import { useTheme } from '../../services/theme/ThemeContext';
import Svg, { Path } from 'react-native-svg';

// Icons
import ReturnIcon from '../../assets/HomeCard/undo.svg';
import ExportIcon from '../../assets/PlaylistsCard/export.svg';
import TrashIcon from '../../assets/HomeCard/dislike.svg';

const CheckIcon = ({ width = 24, height = 24, color = '#000' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CARD_PADDING_HORIZONTAL = 16;
const CARD_BORDER_RADIUS = 24;

export default function PlaylistDetailsScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getPlaylistTracks(id.toString());
      setTracks(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to fetch tracks.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const exportPlaylist = async () => {
    if (!id) return;
    if (tracks.length === 0) {
      Alert.alert('Empty Playlist', 'Add some tracks before exporting.');
      return;
    }

    setExporting(true);
    try {
      const request = new ExportPlaylistRequest({ playlistId: id.toString() });
      const response = await userClient.exportPlaylist(request, {});

      if (response.success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000); // Reset after 3s

        // Optional: still show alert or just let the animation be the feedback?
        // User asked for animation, I will skip the generic 'Success' alert if the animation is clear,
        // OR show a less intrusive one, OR just rely on the button state.
        // But user might want to open Spotify. I'll keep the Alert but maybe delay it or rely on the button.
        // Actually, the Alert has "Open Spotify" action, which is useful. I will keep it but maybe show it slightly after or simultaneously.
        // The user request "dodaj jakąś małą animację fajki ... i otrzymaniu 200" implies visual feedback on the button.

        Alert.alert('Success', 'Playlist exported to Spotify!', [
          { text: 'OK' },
          {
            text: 'Open Spotify',
            onPress: () => {
              if (response.spotifyPlaylistUrl) {
                Linking.openURL(response.spotifyPlaylistUrl);
              }
            },
          },
        ]);
      } else {
        Alert.alert('Export Failed', response.message);
      }
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Error', 'Failed to connect to server.');
    } finally {
      setExporting(false);
    }
  };

  const handleRemoveTrack = async (trackId: bigint) => {
    const trackIdNum = Number(trackId);
    try {
      await removeTrackFromPlaylist(id!.toString(), trackIdNum);
      setTracks((prev) => prev.filter((t) => t.deezerTrackId !== trackId));
    } catch (err) {
      console.log('Error', 'Couldnt remove track from playlist.');
    }
  };

  const renderTrackItem = ({ item }: { item: PlaylistTrack }) => (
    <View
      style={[
        styles.trackItem,
        { backgroundColor: colors.input, borderColor: colors.inputBorder },
      ]}>
      <View style={styles.trackInfo}>
        {item.albumCover ? (
          <Image source={{ uri: item.albumCover }} style={styles.albumCover} />
        ) : (
          <View style={[styles.placeholderCover, { backgroundColor: colors.cardBorder }]}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>No Art</Text>
          </View>
        )}

        <View style={styles.textContainer}>
          <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.artistName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.artistName}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => handleRemoveTrack(item.deezerTrackId)}
        style={({ pressed }) => [
          styles.deleteButton,
          {
            backgroundColor: pressed ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
          },
        ]}>
        <TrashIcon width={20} height={20} color="#ef4444" />
      </Pressable>
    </View>
  );

  const cardHeight = screenHeight - 240;

  return (
    <ScreenLayout>
      <Stack.Screen options={{ headerShown: false }} />
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
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {name || 'Playlist'}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : error ? (
              <View style={styles.centerContent}>
                <Text style={{ color: '#ef4444', marginBottom: 8 }}>{error}</Text>
                <Pressable
                  onPress={fetchTracks}
                  style={[styles.retryButton, { backgroundColor: colors.input }]}>
                  <Text style={{ color: colors.text }}>Try again</Text>
                </Pressable>
              </View>
            ) : tracks.length === 0 ? (
              <View style={styles.centerContent}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No tracks yet...
                </Text>
              </View>
            ) : (
              <FlatList
                data={tracks}
                keyExtractor={(item) => item.deezerTrackId.toString()}
                renderItem={renderTrackItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              onPress={exportPlaylist}
              disabled={exporting || loading || tracks.length === 0 || exportSuccess}
              style={({ pressed }) => [
                styles.navButton,
                {
                  borderColor: exportSuccess ? '#1DB954' : colors.accent,
                  backgroundColor: exportSuccess
                    ? '#1DB954'
                    : exporting
                      ? colors.input
                      : colors.accent,
                  opacity: pressed || exporting ? 0.8 : 1,
                  minWidth: exportSuccess ? 140 : 120, // Expand slightly for "Exported!"
                },
              ]}>
              {exporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : exportSuccess ? (
                <Animated.View
                  entering={ZoomIn}
                  exiting={ZoomOut}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckIcon width={20} height={20} color="#000" />
                  <Text style={[styles.navText, { color: '#000' }]}>Exported!</Text>
                </Animated.View>
              ) : (
                <>
                  <ExportIcon width={24} height={24} />
                  <Text style={[styles.navText, { color: '#000' }]}>Export</Text>
                </>
              )}
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
    paddingTop: 60,
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  albumCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  placeholderCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginLeft: 8,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    minWidth: 64,
  },
  navText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
