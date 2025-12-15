import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { getUserStatistics } from '../services/auth/api';
import type { UserStatsReply } from '../services/auth/gRPC/user/users_pb';
import { getSavedUserId } from '../services/auth/userInfo';
import ContainerFlexColumn from '../components/containers/ContainerFlexColumn';

const StatCard = ({ label, value, subValue, color }: { label: string, value: string | number, subValue?: string, color?: string }) => (
  <View 
    className="rounded-3xl border border-white/20 bg-white/10 shadow-md backdrop-blur-xl mb-4 p-5 flex-row items-center justify-between"
    style={{ borderLeftColor: color || 'rgba(255,255,255,0.5)', borderLeftWidth: 4 }}
  >
    <View>
      <Text className="text-white text-2xl font-bold shadow-sm">{value}</Text>
      {subValue && <Text className="text-white/50 text-xs">{subValue}</Text>}
    </View>
    <Text className="text-white/70 text-sm font-medium uppercase tracking-wider">{label}</Text>
  </View>
);

export default function StatisticsScreen() {
  const [stats, setStats] = useState<UserStatsReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const userId = getSavedUserId(); 

  const fetchStats = async () => {
    if (!userId) {
        console.warn("User ID not found in storage.");
        setLoading(false);
        return;
    }
    try {
      const data = await getUserStatistics(userId);
      setStats(data);
    } catch (error) {
      console.error("Failed to load statistics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const totalInteractions = (stats?.likes || 0) + (stats?.dislikes || 0);
  const likeRatio = totalInteractions > 0 ? Math.round(((stats?.likes || 0) / totalInteractions) * 100) : 0;

  return (
    <ContainerFlexColumn style={{ width: '100%', height: '100%' }}>
      <View style={{ marginTop: 20, marginBottom: 15, width: '85%' }}>
         <Text className="text-white text-2xl font-bold text-center drop-shadow-md">Your Vibe Check</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <ScrollView 
            style={{ width: '85%', flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            showsVerticalScrollIndicator={false}
        >
            <View className="mb-3 mt-2 border-b border-white/20 pb-2">
                <Text className="text-white/80 text-xs font-bold uppercase tracking-widest">Music Taste</Text>
            </View>
            
            <StatCard 
                label="Favorite Artist" 
                value={stats?.favoriteArtist || "N/A"} 
                color="#1DB954" 
            />
            <StatCard 
                label="Average BPM" 
                value={stats?.averageBpm ? Math.round(stats.averageBpm) : 0} 
                subValue="Beats per minute"
                color="#00D2FF" 
            />

            <View className="mb-3 mt-4 border-b border-white/20 pb-2">
                <Text className="text-white/80 text-xs font-bold uppercase tracking-widest">Swipe Activity</Text>
            </View>

            <View className="flex-row justify-between gap-3">
                <View className="flex-1">
                    <StatCard 
                        label="Liked" 
                        value={stats?.likes || 0} 
                        color="#4CAF50"
                    />
                </View>
                <View className="flex-1">
                    <StatCard 
                        label="Disliked" 
                        value={stats?.dislikes || 0} 
                        color="#F44336"
                    />
                </View>
            </View>

            <View className="rounded-3xl border border-white/20 bg-white/10 shadow-md backdrop-blur-xl mt-2 p-6 items-center">
                <Text className="text-white/90 text-sm font-bold mb-3 uppercase tracking-wide">Like Ratio</Text>
                
                <View className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3 border border-white/5">
                    <View 
                        className="h-full bg-green-500 rounded-full shadow-[0_0_10px_rgba(76,175,80,0.5)]" 
                        style={{ width: `${likeRatio}%` }} 
                    />
                </View>
                
                <Text className="text-white/70 text-xs font-medium">{likeRatio}% positive vibes</Text>
            </View>

        </ScrollView>
      )}
    </ContainerFlexColumn>
  );
}