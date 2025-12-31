import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { useAudioPrefs } from '../services/audio/useAudioPrefs';
import { SwipeResetType } from '../services/auth/gRPC/user/users_pb';
import { resetSwipeHistory, deleteAllPlaylists, deleteAccount } from '../services/auth/api';

const AVAILABLE_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'Rap', 'R&B', 
  'Electronic', 'Techno', 'House', 'Jazz', 
  'Classical', 'Metal', 'Indie', 'Reggae', 'Country'
];

const AVAILABLE_LANGUAGES = [
  'English', 'Polish', 'Spanish', 'French', 
  'German', 'Italian', 'Japanese', 'Korean'
];

type DangerActionType = 'reset' | 'playlists' | 'wipe' | null;

export default function SettingsScreen() {
  const { 
    snippetDuration, 
    setSnippetDuration,
    autoExportLikes,
    setAutoExportLikes,
    genreFilters,
    setGenreFilters,
    languageFilters,
    setLanguageFilters
  } = useAudioPrefs();

  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<DangerActionType>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const options = [10, 20, 30] as const;

  const toggleFilter = (item: string, currentList: string[], setList: (l: string[]) => void) => {
    if (currentList.includes(item)) {
      setList(currentList.filter(i => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

  const renderChips = (items: string[], currentList: string[] = [], setList: (l: string[]) => void) => {
    return (
      <View style={styles.chipContainer}>
        {items.map((item) => {
          const isActive = currentList.includes(item);
          return (
            <Pressable
              key={item}
              onPress={() => toggleFilter(item, currentList, setList)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // --- API Executors ---

  const performReset = async (type: SwipeResetType) => {
    try {
      setIsLoading(true);
      await resetSwipeHistory(type);
      setStatusMessage("Swipe history cleared successfully.");
      setActiveAction(null);
    } catch (e) {
      setStatusMessage("Error: Failed to reset history.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const performDeletePlaylists = async (unsubSpotify: boolean) => {
    try {
      setIsLoading(true);
      await deleteAllPlaylists(unsubSpotify);
      setStatusMessage("All playlists deleted.");
      setActiveAction(null);
    } catch (e) {
      setStatusMessage("Error: Failed to delete playlists.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const performWipeAccount = async () => {
    try {
      setIsLoading(true);
      await deleteAccount();
      // User should be logged out automatically by the api function logic if implemented there,
      // otherwise handle redirection here.
    } catch (e) {
      setStatusMessage("Error: Failed to delete account.");
      setIsLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={styles.header}>Settings</Text>
        
        {/* Status Message Toast (Inline) */}
        {statusMessage && (
            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Snippet Duration</Text>
          <View style={styles.row}>
            {options.map((opt) => (
              <Pressable 
                key={opt} 
                onPress={() => setSnippetDuration(opt)}
                style={[
                  styles.optionBtn, 
                  snippetDuration === opt && styles.optionBtnActive
                ]}
              >
                <Text style={[
                  styles.optionText,
                  snippetDuration === opt && styles.optionTextActive
                ]}>{opt}s</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.rowBetween]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.label}>Auto-Export "Likes"</Text>
                <Text style={styles.subLabel}>Instant Sync to Spotify playlist</Text>
            </View>
            <Switch 
              value={autoExportLikes} 
              onValueChange={setAutoExportLikes}
              trackColor={{ false: '#e0e0e0', true: '#000' }}
            />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
            <Text style={styles.label}>Genre Preferences</Text>
            <Text style={styles.subLabel}>Select specific genres to focus on (Optional)</Text>
            {renderChips(AVAILABLE_GENRES, genreFilters || [], setGenreFilters)}
        </View>

        <View style={styles.section}>
            <Text style={styles.label}>Language Preferences</Text>
            <Text style={styles.subLabel}>Select preferred languages (Default: English)</Text>
            {renderChips(AVAILABLE_LANGUAGES, languageFilters || [], setLanguageFilters)}
        </View>

        <View style={styles.divider} />

        {/* DANGER ZONE */}
        <View style={styles.section}>
           <Text style={[styles.label, { color: 'red' }]}>Danger Zone</Text>
           <Text style={styles.subLabel}>Irreversible actions</Text>
           
           {/* 1. RESET HISTORY */}
           {activeAction === 'reset' ? (
             <View style={styles.confirmationBox}>
               <Text style={styles.confirmTitle}>Reset Swipe History</Text>
               <Text style={styles.confirmSub}>Which history to clear?</Text>
               <View style={styles.confirmRow}>
                 <Pressable style={styles.confirmBtn} onPress={() => performReset(SwipeResetType.RESET_LIKES)}>
                    <Text style={styles.confirmBtnText}>Likes Only</Text>
                 </Pressable>
                 <Pressable style={styles.confirmBtn} onPress={() => performReset(SwipeResetType.RESET_DISLIKES)}>
                    <Text style={styles.confirmBtnText}>Dislikes Only</Text>
                 </Pressable>
               </View>
               <Pressable style={[styles.confirmBtn, styles.dangerConfirmBtn]} onPress={() => performReset(SwipeResetType.RESET_ALL)}>
                  <Text style={[styles.confirmBtnText, { color: '#fff' }]}>RESET ALL HISTORY</Text>
               </Pressable>
               <Pressable style={styles.cancelBtn} onPress={() => setActiveAction(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
               </Pressable>
             </View>
           ) : (
             <Pressable style={styles.dangerBtn} onPress={() => setActiveAction('reset')} disabled={isLoading || activeAction !== null}>
               <Text style={styles.dangerBtnText}>Reset Swipe History...</Text>
             </Pressable>
           )}

           {/* 2. DELETE PLAYLISTS */}
           {activeAction === 'playlists' ? (
             <View style={styles.confirmationBox}>
               <Text style={styles.confirmTitle}>Delete All Playlists</Text>
               <Text style={styles.confirmSub}>Also unsubscribe on Spotify?</Text>
               <Pressable style={[styles.confirmBtn, styles.dangerConfirmBtn]} onPress={() => performDeletePlaylists(false)}>
                  <Text style={[styles.confirmBtnText, { color: '#fff' }]}>No, Just Delete Local</Text>
               </Pressable>
               <Pressable style={[styles.confirmBtn, styles.dangerConfirmBtn]} onPress={() => performDeletePlaylists(true)}>
                  <Text style={[styles.confirmBtnText, { color: '#fff' }]}>Yes, Delete & Unsubscribe</Text>
               </Pressable>
               <Pressable style={styles.cancelBtn} onPress={() => setActiveAction(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
               </Pressable>
             </View>
           ) : (
             <Pressable style={styles.dangerBtn} onPress={() => setActiveAction('playlists')} disabled={isLoading || activeAction !== null}>
               <Text style={styles.dangerBtnText}>Delete All Playlists...</Text>
             </Pressable>
           )}

           {/* 3. WIPE ACCOUNT */}
           {activeAction === 'wipe' ? (
             <View style={[styles.confirmationBox, { borderColor: 'red', backgroundColor: '#fff5f5' }]}>
               <Text style={[styles.confirmTitle, { color: 'red' }]}>DELETE ACCOUNT</Text>
               <Text style={[styles.confirmSub, { color: 'red' }]}>WARNING: This is strictly irreversible. All data will be lost.</Text>
               <Pressable style={[styles.confirmBtn, { backgroundColor: 'red' }]} onPress={performWipeAccount}>
                  <Text style={[styles.confirmBtnText, { color: '#fff', fontWeight: 'bold' }]}>CONFIRM PERMANENT DELETE</Text>
               </Pressable>
               <Pressable style={styles.cancelBtn} onPress={() => setActiveAction(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
               </Pressable>
             </View>
           ) : (
             <Pressable style={[styles.dangerBtn, { backgroundColor: '#ffebee', borderColor: '#ffcdd2' }]} onPress={() => setActiveAction('wipe')} disabled={isLoading || activeAction !== null}>
               <Text style={[styles.dangerBtnText, { color: 'red', fontWeight: 'bold' }]}>Delete Account (Wipe)</Text>
             </Pressable>
           )}

        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, marginTop: 10 },
  section: { marginBottom: 24 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10, marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#333' },
  subLabel: { fontSize: 12, color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  optionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionBtnActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  optionText: { fontSize: 14, color: '#333' },
  optionTextActive: { color: '#fff', fontWeight: 'bold' },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  chipText: { fontSize: 13, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Default Danger Button
  dangerBtn: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  dangerBtnText: {
    color: '#333',
    fontWeight: '500'
  },

  // Inline Confirmation Styles
  confirmationBox: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  confirmSub: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerConfirmBtn: {
    backgroundColor: '#000',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#007AFF',
    fontSize: 14,
  },

  // Status Toast
  statusContainer: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  loadingOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});