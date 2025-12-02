import { View, Text, Pressable, Alert } from 'react-native';
import React, { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import ContainerFlexColumn from 'components/containers/ContainerFlexColumn';
import SubContainerFlexRow from 'components/containers/SubContainerFlexRow';
import ReturnIcon from '../assets/HomeCard/undo.svg';
import CancelIcon from '../assets/HomeCard/dislike.svg';
import ConfirmIcon from '../assets/HomeCard/like.svg';
import NewPlaylistIcon from '../assets/PlaylistsCard/new_playlist.svg';
import Playlists from 'components/playlists/Playlists';
import InputField from 'components/InputField';
import { createPlaylist } from '../services/auth/api';

export default function PlaylistsScreen() {
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
    if (!newPlaylistName.trim()) {
      return;
    }

    try {
      setCreating(true);
      await createPlaylist(newPlaylistName.trim());

      setIsAddingNew(false);
      setNewPlaylistName('');
      triggerRefresh();
    } catch (error: any) {
      console.error('Błąd tworzenia playlisty:', error);
      Alert.alert('Błąd', 'Nie udało się utworzyć playlisty.');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setNewPlaylistName('');
  };

  return (
    <ContainerFlexColumn style={{ width: '85%', height: '90%' }}>
      <SubContainerFlexRow
        style={{
          position: 'relative',
          flex: 0.15,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {!isAddingNew ? (
          <Pressable
            onPress={() => setIsAddingNew(true)}
            className="mx-2 my-2 h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40">
            <NewPlaylistIcon width={40} height={40} />
          </Pressable>
        ) : (
          <View className="w-full flex-row items-center justify-between gap-2 px-2">
            <Pressable
              onPress={handleCancel}
              className="items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40">
              <CancelIcon width={40} height={40} className="px-2" />
            </Pressable>

            <View className="h-12 flex-1">
              <InputField
                placeholder="New playlist name..."
                placeholderTextColor="#e2e2e2ff"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                className="h-12 w-full rounded-full border-white/20 bg-white/10 px-4 py-0 text-base text-white"
                autoFocus={true}
                onSubmitEditing={handleCreatePlaylist}
                returnKeyType="done"
              />
            </View>

            <Pressable
              onPress={handleCreatePlaylist}
              disabled={creating || !newPlaylistName.trim()}
              className={`items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40 ${!newPlaylistName.trim() || creating ? 'opacity-50' : ''}`}>
              {creating ? (
                <Text className="text-xs text-green-200">...</Text>
              ) : (
                <ConfirmIcon width={40} height={40} className="px-2" />
              )}
            </Pressable>
          </View>
        )}
      </SubContainerFlexRow>

      <SubContainerFlexRow
        style={{
          position: 'relative',
          flex: 0.7,
          overflow: 'hidden',
          width: '85%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: 16,
        }}>
        <Playlists refreshTrigger={refreshKey} />
      </SubContainerFlexRow>

      <SubContainerFlexRow style={{ position: 'relative', flex: 0.15 }}>
        <Pressable
          onPress={() => router.replace('/profile')}
          className="h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40">
          <ReturnIcon width={40} height={40} />
        </Pressable>
      </SubContainerFlexRow>
    </ContainerFlexColumn>
  );
}
