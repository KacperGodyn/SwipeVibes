import React, { useEffect, useState, useCallback, use } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import ContainerFlexColumn from '../../components/containers/ContainerFlexColumn';
import { getPlaylistTracks, removeTrackFromPlaylist } from '../../services/auth/api';
import type { PlaylistTrack } from '../../services/auth/gRPC/user/users_pb';
import SubContainerFlexRow from '../../components/containers/SubContainerFlexRow';
import ReturnIcon from '../../assets/HomeCard/undo.svg';
import ExportIcon from '../../assets/PlaylistsCard/export.svg'

export default function PlaylistDetailsScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getPlaylistTracks(id.toString());
      setTracks(data);
      setError(null);
    } catch (err) {
      console.error('Błąd pobierania utworów:', err);
      setError('Nie udało się pobrać utworów z playlisty.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const exportPlaylist = () => {
    console.log('Not implemented yet...');
  }
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
    <View className="mb-2 flex-row items-center justify-between rounded-lg border-b border-white/10 bg-black/20 px-3 py-3 active:bg-black/40">
      <View className="flex-1 flex-row items-center">
        {item.albumCover ? (
          <Image source={{ uri: item.albumCover }} className="mr-3 h-12 w-12 rounded bg-gray-800" />
        ) : (
          <View className="mr-3 h-12 w-12 items-center justify-center rounded bg-gray-700">
            <Text className="text-xs text-white">No Art</Text>
          </View>
        )}

        <View className="flex-1 pr-2">
          <Text className="text-base font-bold text-white" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-xs text-gray-400" numberOfLines={1}>
            {item.artistName}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => handleRemoveTrack(item.deezerTrackId)}
        className="w-24 items-center rounded bg-red-300/20 py-3">
        <Text className="text-[16px] font-bold uppercase text-red-300">DELETE</Text>
      </Pressable>
    </View>
  );

  return (
    <ContainerFlexColumn style={{ width: '85%', height: '90%' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <SubContainerFlexRow style={{ flex: 0.15 }}>
        <Text className="px-16 text-center text-xl font-bold text-white" numberOfLines={2}>
          {name || 'Playlista'}
        </Text>
      </SubContainerFlexRow>

      <View
        style={{
          flex: 0.7,
          overflow: 'hidden',
          backgroundColor: 'rgba(0,0,0,0.5)',
          width: '85%',
          height: '100%',
          borderRadius: 16,
        }}
        className="px-2 py-2">
        {Platform.OS === 'web' && (
          <style>{`
                  ::-webkit-scrollbar { width: 8px; background-color: transparent; }
                  ::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 10px; }
                  ::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.4); }
                `}</style>
        )}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#00F539" size="large" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text className="mb-4 text-center text-red-400">{error}</Text>
            <Pressable onPress={fetchTracks} className="rounded-full bg-white/10 px-4 py-2">
              <Text className="text-white">Try again</Text>
            </Pressable>
          </View>
        ) : tracks.length === 0 ? (
          <View className="flex-1 items-center justify-center opacity-60">
            <Text className="text-lg font-semibold text-gray-300">
              No tracks in this playlist yet...
            </Text>
            <Text className="mt-2 px-8 text-center text-gray-400">
              Add some tracks to see them here!
            </Text>
          </View>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.deezerTrackId.toString()}
            renderItem={renderTrackItem}
            contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
          />
        )}
      </View>

      <View style={{ flex: 0.15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <Pressable
          onPress={() => router.replace('/playlists')}
          className="h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40">
          <ReturnIcon width={40} height={40} />
        </Pressable>
        <Pressable
          onPress={() => exportPlaylist()}
          className="h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40">
          <ExportIcon width={40} height={40} />
        </Pressable>
      </View>
    </ContainerFlexColumn>
  );
}
