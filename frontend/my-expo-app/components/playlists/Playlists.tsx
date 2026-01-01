import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { deletePlaylist, getMyPlaylists } from '../../services/auth/api';
import type { PlaylistReply } from '../../services/auth/gRPC/user/users_pb';
import { useTheme } from '../../services/theme/ThemeContext';
import Animated, { AnimatedProps } from 'react-native-reanimated';

type Props = {
  refreshTrigger?: number;
  onSelect?: (playlistId: string) => void;
  lastActivePlaylistId?: string | null;
  onScroll?: AnimatedProps<any>['onScroll'];
  onContentSizeChange?: (w: number, h: number) => void;
  onLayout?: (e: any) => void;
};

export default function Playlists({
  refreshTrigger = 0,
  onSelect,
  lastActivePlaylistId,
  onScroll,
  onContentSizeChange,
  onLayout,
}: Props) {
  const { colors } = useTheme();
  const [playlists, setPlaylists] = useState<PlaylistReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyPlaylists();
      setPlaylists(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching playlists:', err);
      setError('Failed to fetch playlists.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists, refreshTrigger]);

  const sortedPlaylists = useMemo(() => {
    if (!lastActivePlaylistId || !onSelect) return playlists;

    return [...playlists].sort((a, b) => {
      if (a.id === lastActivePlaylistId) return -1;
      if (b.id === lastActivePlaylistId) return 1;
      return 0;
    });
  }, [playlists, lastActivePlaylistId, onSelect]);

  const handleDelete = async (id: string) => {
    try {
      await deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete playlist.');
    }
  };

  const handlePress = (item: PlaylistReply) => {
    if (onSelect) {
      onSelect(item.id);
    } else {
      router.push({ pathname: `/playlist/${item.id}`, params: { name: item.name } });
    }
  };

  if (loading && playlists.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ marginBottom: 8, textAlign: 'center', color: '#ef4444' }}>{error}</Text>
        <Pressable
          onPress={fetchPlaylists}
          style={{
            marginTop: 8,
            borderRadius: 999,
            backgroundColor: colors.input,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}>
          <Text style={{ color: colors.text, textDecorationLine: 'underline' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (playlists.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textSecondary }}>
          No playlists yet...
        </Text>
        {!onSelect && (
          <Text style={{ marginTop: 8, color: colors.textSecondary }}>
            Click "+" to create one!
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="w-full flex-1 bg-transparent">
      {Platform.OS === 'web' && (
        <style>{`
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.2); }
        `}</style>
      )}

      <Animated.FlatList
        data={sortedPlaylists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 10, gap: 8 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        renderItem={({ item }) => {
          const isSticky = lastActivePlaylistId === item.id && !!onSelect;

          return (
            <Pressable
              onPress={() => handlePress(item)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 12,
                  borderWidth: 1,
                  padding: 16,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  backgroundColor: isSticky ? 'rgba(240, 84, 84, 0.2)' : colors.input,
                  borderColor: isSticky ? colors.accent : colors.inputBorder,
                },
              ]}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: isSticky ? colors.accent : colors.text,
                    }}
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isSticky && (
                    <View
                      style={{
                        backgroundColor: colors.accent,
                        borderRadius: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}>
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          color: '#000',
                        }}>
                        Active
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    fontSize: 10,
                    color: colors.textSecondary,
                  }}>
                  {item.id.substring(0, 8)}...
                </Text>
              </View>

              {!onSelect && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  style={({ pressed }) => ({
                    height: 40,
                    width: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 20,
                    backgroundColor: pressed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)',
                  })}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>✕</Text>
                </Pressable>
              )}
              {onSelect && (
                <View
                  style={{
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    backgroundColor: isSticky ? colors.accent : 'rgba(255,255,255,0.1)',
                  }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: isSticky ? '#000' : colors.text,
                    }}>
                    {isSticky ? 'SAVED' : 'ADD'}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
