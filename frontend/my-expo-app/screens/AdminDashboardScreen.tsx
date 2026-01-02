import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../services/theme/ThemeContext';
import { userClient } from '../services/auth/gRPC/user/connectClient';
import { UserReply } from '../services/auth/gRPC/user/users_pb';
import { getAdminStats, adminDeleteUser } from '../services/auth/api';
import ScreenLayout from '../components/ScreenLayout';

interface Stats {
  totalUsers: number;
  totalSwipes: number;
  geminiPrecision: number;
  geminiLikes: number;
  geminiDislikes: number;
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [users, setUsers] = useState<UserReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([userClient.getUsers({}), getAdminStats()]);
      setUsers(usersRes.users);
      setStats({
        totalUsers: statsRes.totalUsers,
        totalSwipes: statsRes.totalSwipes,
        geminiPrecision: statsRes.geminiPrecision,
        geminiLikes: statsRes.geminiLikes,
        geminiDislikes: statsRes.geminiDislikes,
        precisionAt1: statsRes.precisionAt1,
        precisionAt3: statsRes.precisionAt3,
        precisionAt5: statsRes.precisionAt5,
      });
    } catch (error: any) {
      console.error('Failed to fetch data', error);

      const msg = error.message || '';
      if (msg.includes('permission_denied') || msg.includes('Admin access required')) {
        router.replace('/home');
        return;
      }

      if (Platform.OS === 'web') {
        window.alert('Failed to fetch data: ' + msg);
      } else {
        Alert.alert('Error', 'Failed to fetch data: ' + msg);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleDeleteUser = async (userId: string, username: string) => {
    const confirmDelete =
      Platform.OS === 'web'
        ? window.confirm(`Are you sure you want to delete "${username}"? This cannot be undone.`)
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Delete User',
              `Are you sure you want to delete "${username}"? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });

    if (!confirmDelete) return;

    try {
      await adminDeleteUser(userId);
      if (Platform.OS === 'web') {
        window.alert('User deleted.');
      } else {
        Alert.alert('Success', 'User deleted.');
      }
      fetchData();
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert('Delete failed: ' + e.message);
      } else {
        Alert.alert('Error', e.message);
      }
    }
  };

  const renderStatCard = (label: string, value: string | number, accent?: boolean) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: accent ? colors.accent : colors.card, borderColor: colors.cardBorder },
      ]}>
      <Text style={[styles.statValue, { color: accent ? '#fff' : colors.text }]}>{value}</Text>
      <Text
        style={[
          styles.statLabel,
          { color: accent ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
        ]}>
        {label}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: UserReply }) => (
    <View
      style={[styles.userRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {item.email} • {item.role}
        </Text>
      </View>
      <View style={styles.badges}>
        <View
          style={[
            styles.badge,
            { backgroundColor: item.isSpotifyConnected ? '#1DB954' : 'rgba(255,255,255,0.1)' },
          ]}>
          <Text style={styles.badgeText}>
            {item.isSpotifyConnected ? '✓ Spotify' : 'No Spotify'}
          </Text>
        </View>
        <View
          style={[styles.badge, { backgroundColor: item.cookiesAccepted ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.badgeText}>{item.cookiesAccepted ? '🍪 ✓' : '🍪 ✗'}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => handleDeleteUser(item.id, item.username)}
        style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={{ color: '#F05454', fontWeight: 'bold' }}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenLayout showVolumeControl={false}>
      <View style={styles.container}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Admin Dashboard</Text>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            {renderStatCard('Users', stats.totalUsers)}
            {renderStatCard('Swipes', stats.totalSwipes)}
            {renderStatCard('Precision', `${(stats.geminiPrecision * 100).toFixed(1)}%`, true)}
            {renderStatCard('👍', stats.geminiLikes)}
            {renderStatCard('👎', stats.geminiDislikes)}
            {renderStatCard('P@1', `${(stats.precisionAt1 * 100).toFixed(0)}%`)}
            {renderStatCard('P@3', `${(stats.precisionAt3 * 100).toFixed(0)}%`)}
            {renderStatCard('P@5', `${(stats.precisionAt5 * 100).toFixed(0)}%`)}
          </View>
        )}

        {/* Users List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Users ({users.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : (
          <FlatList
            data={users}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 140 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
          />
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  userRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 11,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
