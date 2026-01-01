import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getUserStatistics } from '../services/auth/api';
import type { UserStatsReply } from '../services/auth/gRPC/user/users_pb';
import { getSavedUserId } from '../services/auth/userInfo';
import ScreenLayout from 'components/ScreenLayout';
import { useTheme } from '../services/theme/ThemeContext';

// Reuse constants for consistency
const CARD_PADDING_HORIZONTAL = 16;
const CARD_BORDER_RADIUS = 24;

const StatCard = ({
  label,
  value,
  subValue,
  color,
  borderColor,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  borderColor?: string;
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.input,
          borderColor: borderColor || colors.inputBorder,
        },
      ]}>
      <View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        {subValue && (
          <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>{subValue}</Text>
        )}
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
};

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  const [stats, setStats] = useState<UserStatsReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = getSavedUserId();

  const fetchStats = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getUserStatistics(userId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
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
  const likeRatio =
    totalInteractions > 0 ? Math.round(((stats?.likes || 0) / totalInteractions) * 100) : 0;

  // Card dimensions
  const cardHeight = screenHeight - 240;

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
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.text }]}>Statistics</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.accent}
                />
              }>
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                {/* Music Taste Section */}
                <View style={[styles.sectionHeader, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Music Taste
                  </Text>
                </View>

                <StatCard
                  label="Favorite Artist"
                  value={stats?.favoriteArtist || 'N/A'}
                  borderColor={colors.inputBorder}
                />
                <StatCard
                  label="Average BPM"
                  value={stats?.averageBpm ? Math.round(stats.averageBpm) : 0}
                  subValue="Beats per minute"
                  borderColor={colors.inputBorder}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(300).duration(400)}
                style={styles.sectionMargin}>
                {/* Activity Section */}
                <View style={[styles.sectionHeader, { borderBottomColor: colors.divider }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Swipe Activity
                  </Text>
                </View>

                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <StatCard
                      label="Liked"
                      value={stats?.likes || 0}
                      borderColor="rgba(34, 197, 94, 0.3)" // Green tint
                    />
                  </View>
                  <View style={styles.gap} />
                  <View style={styles.flex1}>
                    <StatCard
                      label="Disliked"
                      value={stats?.dislikes || 0}
                      borderColor="rgba(239, 68, 68, 0.3)" // Red tint
                    />
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(500).duration(600)}
                style={styles.sectionMargin}>
                {/* Ratio Section */}
                <View
                  style={[
                    styles.ratioCard,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.inputBorder,
                    },
                  ]}>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary, marginBottom: 12 }]}>
                    Like Ratio
                  </Text>

                  <View
                    style={[styles.progressBarInfo, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${likeRatio}%`, backgroundColor: '#22c55e' }, // Green
                      ]}
                    />
                  </View>

                  <Text style={[styles.ratioText, { color: colors.textSecondary }]}>
                    {likeRatio}% positive vibes
                  </Text>
                </View>
              </Animated.View>
            </ScrollView>
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
    paddingTop: 70,
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionMargin: {
    marginTop: 24,
  },
  statCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubValue: {
    fontSize: 12,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  ratioCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  progressBarInfo: {
    height: 12,
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  ratioText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
