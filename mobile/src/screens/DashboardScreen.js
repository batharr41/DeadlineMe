import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme, getCategoryEmoji, getStatusColor } from '../utils/theme';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const c = theme.colors;

function StakeCard({ stake, onPress }) {
  const isExpired = stake.status !== 'active';

  return (
    <TouchableOpacity
      style={styles.stakeCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.stakeCardInner}>
        {/* Left: emoji + info */}
        <View style={styles.stakeLeft}>
          <View style={styles.emojiWrap}>
            <Text style={styles.stakeEmoji}>{getCategoryEmoji(stake.category)}</Text>
          </View>
          <View style={styles.stakeInfo}>
            <Text style={styles.stakeTitle} numberOfLines={1}>{stake.title}</Text>
            <Text style={styles.stakeDeadline}>{formatDate(stake.deadline || stake.created_at)}</Text>
          </View>
        </View>

        {/* Right: amount + time */}
        <View style={styles.stakeRight}>
          <Text style={styles.stakeAmount}>${stake.stake_amount ?? stake.stake ?? 0}</Text>
          {!isExpired && stake.timeLeft && (
            <Text style={styles.stakeTimeLeft}>{stake.timeLeft}</Text>
          )}
        </View>
      </View>

      {/* Progress bar — active only */}
      {!isExpired && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stake.progress}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function HistoryRow({ stake }) {
  const statusColor = getStatusColor(stake.status, c);
  const amount = stake.stake_amount ?? stake.stake ?? 0;
  const label = stake.status === 'completed'
    ? `+$${amount} back`
    : stake.status === 'cancelled'
      ? 'Cancelled'
      : `-$${amount}`;

  const dateStr = stake.deadline || stake.created_at || '';

  return (
    <View style={styles.historyRow}>
      <View style={styles.stakeLeft}>
        <Text style={styles.historyEmoji}>{getCategoryEmoji(stake.category)}</Text>
        <View>
          <Text style={styles.historyTitle} numberOfLines={1}>{stake.title}</Text>
          <Text style={styles.historyDate}>{formatDate(dateStr)}</Text>
        </View>
      </View>
      <Text style={[styles.historyAmount, { color: statusColor }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [stakes, setStakes] = useState([]);
  const [stats, setStats] = useState({ at_stake: 0, saved: 0, lost: 0, current_streak: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [stakesData, statsData] = await Promise.all([
        api.getMyStakes(),
        api.getStats(),
      ]);
      setStakes(stakesData.stakes || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      // Mock data fallback for dev
      setStakes([
        { id: '1', title: 'Run 3 miles', category: 'fitness', stake: 25, deadline: 'Today, 7:00 PM', status: 'active', timeLeft: '4h 23m', progress: 65 },
        { id: '2', title: 'Finish Python chapter 12', category: 'learning', stake: 10, deadline: 'Tomorrow, 11:59 PM', status: 'active', timeLeft: '1d 8h', progress: 30 },
        { id: '3', title: 'Submit portfolio update', category: 'career', stake: 50, deadline: 'Apr 3', status: 'completed', progress: 100 },
        { id: '4', title: 'Meditate for 20 minutes', category: 'health', stake: 5, deadline: 'Yesterday', status: 'failed', progress: 0 },
      ]);
      setStats({ at_stake: 35, saved: 50, lost: 5, current_streak: 3 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const active = stakes.filter(s => s.status === 'active');
  const past = stakes.filter(s => s.status !== 'active');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>DeadlineMe</Text>
            {stats.current_streak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {stats.current_streak} streak</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'AT STAKE', value: `$${stats.at_stake ?? 0}`, color: c.warning },
            { label: 'SAVED', value: `$${stats.saved ?? 0}`, color: c.success },
            { label: 'LOST', value: `$${stats.lost ?? 0}`, color: c.accent },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Active stakes */}
        {active.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active</Text>
              <Text style={styles.sectionCount}>{active.length}</Text>
            </View>
            {active.map(stake => (
              <StakeCard
                key={stake.id}
                stake={stake}
                onPress={() => navigation.navigate('StakeDetail', { stakeId: stake.id })}
              />
            ))}
          </>
        )}

        {active.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>No active stakes</Text>
            <Text style={styles.emptySubtitle}>Create one to hold yourself accountable</Text>
          </View>
        )}

        {/* History */}
        {past.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>History</Text>
            </View>
            <View style={styles.historyCard}>
              {past.map((stake, i) => (
                <View key={stake.id}>
                  <HistoryRow stake={stake} />
                  {i < past.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewStake')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+ New Stake</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: c.text,
    letterSpacing: -0.6,
  },
  streakBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.2)',
  },
  streakText: { fontSize: 12, color: c.warning, fontWeight: '500' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  statCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: c.textTertiary,
    marginBottom: 6,
  },
  statValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCount: {
    fontSize: 11,
    color: c.textTertiary,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  // Stake cards
  stakeCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  stakeCardInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stakeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  emojiWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stakeEmoji: { fontSize: 18 },
  stakeInfo: { flex: 1 },
  stakeTitle: { fontSize: 15, fontWeight: '600', color: c.text, letterSpacing: -0.2 },
  stakeDeadline: { fontSize: 12, color: c.textTertiary, marginTop: 2 },
  stakeRight: { alignItems: 'flex-end', gap: 3 },
  stakeAmount: { fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  stakeTimeLeft: { fontSize: 11, color: c.warning, fontWeight: '600' },

  progressTrack: {
    height: 2,
    backgroundColor: c.border,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.warning,
    borderRadius: 1,
  },

  // History
  historyCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  historyEmoji: { fontSize: 16, marginRight: 12 },
  historyTitle: { fontSize: 14, fontWeight: '500', color: c.textSecondary, letterSpacing: -0.1 },
  historyDate: { fontSize: 12, color: c.textTertiary, marginTop: 1 },
  historyAmount: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: c.border, marginHorizontal: 14 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: c.textSecondary },
  emptySubtitle: { fontSize: 13, color: c.textTertiary },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  fab: {
    backgroundColor: c.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
});
