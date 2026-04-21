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

const formatTimeLeft = (deadline) => {
  if (!deadline) return '';
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
};

const formatDeadline = (deadline) => {
  if (!deadline) return '';
  const d = new Date(deadline);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const calcProgress = (createdAt, deadline) => {
  if (!createdAt || !deadline) return 0;
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
};

export default function DashboardScreen({ navigation }) {
  const { signOut } = useAuth();
  const [stakes, setStakes] = useState([]);
  const [stats, setStats] = useState({ at_stake: 0, saved: 0, lost: 0, current_streak: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [stakesData, statsData] = await Promise.all([
        api.getMyStakes(),
        api.getStats(),
      ]);
      setStakes(stakesData?.stakes || []);
      setStats(statsData || { at_stake: 0, saved: 0, lost: 0, current_streak: 0 });
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData])
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const activeStakes = stakes.filter((s) => s.status === 'active' || s.status === 'pending_verification');
  const pastStakes = stakes.filter((s) => s.status === 'completed' || s.status === 'failed' || s.status === 'cancelled');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const streak = stats.current_streak || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>DeadlineMe</Text>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {streak}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>
              {streak > 1
                ? `${streak} in a row — keep it going.`
                : streak === 1
                ? "One down. Stack another."
                : "Don't let yourself down."}
            </Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={signOut}>
            <Text style={{ fontSize: 18 }}>🔥</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'At Stake', value: `$${stats.at_stake || 0}`, color: theme.colors.warning },
            { label: 'Saved', value: `$${stats.saved || 0}`, color: theme.colors.success },
            { label: 'Lost', value: `$${stats.lost || 0}`, color: theme.colors.accent },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Active Stakes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Stakes ({activeStakes.length})</Text>
          {activeStakes.length > 0 && (
            <Text style={styles.sectionHint}>⏰ Ticking...</Text>
          )}
        </View>

        {activeStakes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>No active stakes</Text>
            <Text style={styles.emptyHint}>Tap + New Stake below to commit to a goal.</Text>
          </View>
        ) : (
          activeStakes.map((stake) => {
            const timeLeft = formatTimeLeft(stake.deadline);
            const progress = calcProgress(stake.created_at, stake.deadline);
            const detailStake = {
              ...stake,
              stake: stake.stake_amount,
              deadline: formatDeadline(stake.deadline),
              timeLeft,
              progress,
              antiCharity: stake.anti_charity_name,
              createdAt: stake.created_at,
            };
            return (
              <TouchableOpacity
                key={stake.id}
                style={styles.stakeCard}
                onPress={() => navigation.navigate('StakeDetail', { stake: detailStake })}
                activeOpacity={0.7}
              >
                <View style={styles.stakeTop}>
                  <View style={styles.stakeInfo}>
                    <Text style={styles.stakeEmoji}>{getCategoryEmoji(stake.category)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stakeTitle} numberOfLines={1}>{stake.title}</Text>
                      <Text style={styles.stakeDeadline}>{formatDeadline(stake.deadline)}</Text>
                    </View>
                  </View>
                  <View style={styles.stakeRight}>
                    <Text style={styles.stakeAmount}>${stake.stake_amount}</Text>
                    <Text style={styles.stakeTimeLeft}>{timeLeft}</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* History */}
        {pastStakes.length > 0 && (
          <>
            <Text style={styles.historyTitle}>History</Text>
            {pastStakes.map((stake) => {
              const isCompleted = stake.status === 'completed';
              const isCancelled = stake.status === 'cancelled';
              return (
                <View key={stake.id} style={styles.historyCard}>
                  <View style={styles.stakeInfo}>
                    <Text style={styles.stakeEmoji}>{getCategoryEmoji(stake.category)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyStakeTitle} numberOfLines={1}>{stake.title}</Text>
                      <Text style={styles.stakeDeadline}>{formatDeadline(stake.deadline)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, {
                    backgroundColor: isCompleted
                      ? theme.colors.successDim
                      : isCancelled
                      ? theme.colors.border
                      : theme.colors.accentDim,
                  }]}>
                    <Text style={[styles.statusText, {
                      color: isCompleted
                        ? theme.colors.success
                        : isCancelled
                        ? theme.colors.textMuted
                        : theme.colors.accent,
                    }]}>
                      {isCompleted
                        ? `✓ Saved $${stake.stake_amount}`
                        : isCancelled
                        ? `○ Cancelled`
                        : `✗ Lost $${stake.stake_amount}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewStake')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+ New Stake</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  streakBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: theme.colors.warningDim,
    borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255, 179, 0, 0.4)',
  },
  streakText: {
    fontSize: 13, fontWeight: '700',
    color: theme.colors.warning,
  },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center',
  },
  errorBox: {
    backgroundColor: theme.colors.accentDim, borderRadius: 12,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.accent,
  },
  errorText: { color: theme.colors.accent, fontSize: 13, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: theme.colors.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: theme.colors.border,
  },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  sectionHint: { fontSize: 12, color: theme.colors.textDim },
  emptyCard: {
    backgroundColor: theme.colors.card, borderRadius: 16,
    padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  emptyHint: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  stakeCard: {
    backgroundColor: theme.colors.card, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border,
  },
  stakeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  stakeInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  stakeEmoji: { fontSize: 24 },
  stakeTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  stakeDeadline: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  stakeRight: { alignItems: 'flex-end', marginLeft: 10 },
  stakeAmount: { fontSize: 18, fontWeight: '700', color: theme.colors.accent },
  stakeTimeLeft: { fontSize: 11, color: theme.colors.warning, fontWeight: '600', marginTop: 2 },
  progressBar: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.warning, borderRadius: 2 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 24, marginBottom: 12 },
  historyCard: {
    backgroundColor: theme.colors.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7,
  },
  historyStakeTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fab: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    paddingVertical: 16, paddingHorizontal: 32,
    backgroundColor: theme.colors.accent, borderRadius: 16,
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});