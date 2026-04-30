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

function getTimeLeft(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function getUrgencyColor(deadline) {
  if (!deadline) return c.warning;
  const diff = new Date(deadline) - new Date();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 2) return c.accent;
  if (hours < 24) return '#FF9F0A';
  return c.warning;
}

function ActiveStakeCard({ stake, onPress }) {
  const amount = stake.stake_amount ?? stake.stake ?? 0;
  const timeLeft = getTimeLeft(stake.deadline);
  const urgencyColor = getUrgencyColor(stake.deadline);
  const isUrgent = new Date(stake.deadline) - new Date() < 24 * 60 * 60 * 1000;

  return (
    <TouchableOpacity
      style={[styles.activeCard, isUrgent && styles.activeCardUrgent]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.activeCardTop}>
        <View style={styles.activeCardLeft}>
          <Text style={styles.activeCardEmoji}>{getCategoryEmoji(stake.category)}</Text>
          <Text style={styles.activeCardTitle} numberOfLines={2}>{stake.title}</Text>
        </View>
        <View style={styles.activeCardAmountWrap}>
          <Text style={styles.activeCardAmount}>${amount}</Text>
          <Text style={styles.activeCardAmountLabel}>on the line</Text>
        </View>
      </View>

      <View style={styles.deadlineRow}>
        <View style={[styles.deadlineBadge, { backgroundColor: `${urgencyColor}18`, borderColor: `${urgencyColor}30` }]}>
          <Text style={[styles.deadlineText, { color: urgencyColor }]}>
            ⏰  {timeLeft || formatDate(stake.deadline)}
          </Text>
        </View>
        <Text style={styles.proofCta}>Prove it →</Text>
      </View>
    </TouchableOpacity>
  );
}

function HistoryRow({ stake, isLast }) {
  const amount = stake.stake_amount ?? stake.stake ?? 0;
  const isWon = stake.status === 'completed';
  const isCancelled = stake.status === 'cancelled';
  const statusColor = getStatusColor(stake.status, c);
  const label = isWon ? `+$${amount} back` : isCancelled ? 'Cancelled' : `-$${amount}`;

  return (
    <View style={[styles.historyRow, !isLast && styles.historyRowBorder]}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyEmoji}>{getCategoryEmoji(stake.category)}</Text>
        <View>
          <Text style={styles.historyTitle} numberOfLines={1}>{stake.title}</Text>
          <Text style={styles.historyDate}>{formatDate(stake.deadline || stake.created_at)}</Text>
        </View>
      </View>
      <Text style={[styles.historyAmount, { color: statusColor }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const active = stakes.filter(s => s.status === 'active');
  const past = stakes.filter(s => s.status !== 'active').slice(0, 8);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>DeadlineMe</Text>
          {stats.current_streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {stats.current_streak} streak</Text>
            </View>
          )}
        </View>

        {/* Stats */}
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
        {active.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ON THE LINE</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{active.length}</Text>
              </View>
            </View>
            {active.map(stake => (
              <ActiveStakeCard
                key={stake.id}
                stake={stake}
                onPress={() => navigation.navigate('StakeDetail', { stakeId: stake.id, stake })}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>Nothing on the line.</Text>
            <Text style={styles.emptySubtitle}>Commit to something today.</Text>
          </View>
        )}

        {/* History */}
        {past.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 32 }]}>
              <Text style={styles.sectionTitle}>HISTORY</Text>
            </View>
            <View style={styles.historyCard}>
              {past.map((stake, i) => (
                <HistoryRow key={stake.id} stake={stake} isLast={i === past.length - 1} />
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
          <Text style={styles.fabText}>+ Commit to Something</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  wordmark: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.6 },
  streakBadge: {
    backgroundColor: 'rgba(255,159,10,0.12)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,159,10,0.2)',
  },
  streakText: { fontSize: 12, color: c.warning, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: c.border,
  },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: c.textTertiary, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: c.textTertiary, letterSpacing: 1 },
  sectionBadge: {
    backgroundColor: c.accentSoft, borderRadius: 6,
    borderWidth: 1, borderColor: c.accentBorder,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, color: c.accent, fontWeight: '700' },

  activeCard: {
    backgroundColor: c.card, borderRadius: 18, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: c.border, gap: 14,
  },
  activeCardUrgent: { borderColor: 'rgba(255,45,85,0.35)' },
  activeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  activeCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  activeCardEmoji: { fontSize: 26, marginTop: 2 },
  activeCardTitle: { fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.4, lineHeight: 22, flex: 1 },
  activeCardAmountWrap: { alignItems: 'flex-end', gap: 2, marginLeft: 12 },
  activeCardAmount: { fontSize: 26, fontWeight: '700', color: c.accent, letterSpacing: -1 },
  activeCardAmountLabel: { fontSize: 10, color: c.textTertiary, fontWeight: '500' },

  deadlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deadlineBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  deadlineText: { fontSize: 12, fontWeight: '700' },
  proofCta: { fontSize: 12, color: c.success, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: c.textSecondary },
  emptySubtitle: { fontSize: 14, color: c.textTertiary },

  historyCard: {
    backgroundColor: c.card, borderRadius: 16,
    borderWidth: 1, borderColor: c.border, overflow: 'hidden',
  },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyEmoji: { fontSize: 16 },
  historyTitle: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
  historyDate: { fontSize: 12, color: c.textTertiary, marginTop: 1 },
  historyAmount: { fontSize: 13, fontWeight: '700' },

  fabContainer: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  fab: { backgroundColor: c.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
});
