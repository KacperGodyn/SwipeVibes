import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { deletePlaylist, getMyPlaylists } from '../../services/auth/api';
import type { PlaylistReply } from '../../services/auth/gRPC/user/users_pb';

type Props = {
  refreshTrigger?: number;
  onSelect?: (playlistId: string) => void;
};

export default function Playlists({ refreshTrigger = 0, onSelect }: Props) {
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
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text className="mb-2 text-center text-red-400">{error}</Text>
        <Pressable onPress={fetchPlaylists} className="mt-2 rounded-full bg-white/10 px-4 py-2">
          <Text className="text-white underline">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (playlists.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text className="text-lg font-semibold text-gray-300">No playlists yet...</Text>
        {!onSelect && <Text className="mt-2 text-gray-400">Click "+" to create one!</Text>}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }} className="px-2 py-2">
      {Platform.OS === 'web' && (
        <style>{`
          ::-webkit-scrollbar { width: 8px; background-color: transparent; }
          ::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.4); }
        `}</style>
      )}

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePress(item)}
            className="mb-2 flex-row items-center justify-between rounded-lg border-b border-white/10 bg-black/20 px-3 py-3 active:bg-black/40">
            <View className="flex-1 pr-4">
              <Text className="text-lg font-semibold text-white" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="font-mono text-xs text-gray-400">
                ID: {item.id.substring(0, 6)}...
              </Text>
            </View>

            {!onSelect && (
              <View className="flex-column items-center gap-2">
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="w-24 items-center rounded bg-red-300/20 py-3">
                  <Text className="text-[16px] font-bold uppercase text-red-300">DELETE</Text>
                </Pressable>
              </View>
            )}
            {onSelect && (
              <View className="rounded-full border border-green-500/50 bg-green-500/20 px-3 py-2">
                <Text className="text-xs font-bold text-green-400">ADD</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}
