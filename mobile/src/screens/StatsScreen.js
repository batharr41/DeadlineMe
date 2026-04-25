import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme, getCategoryEmoji } from '../utils/theme';
import { api } from '../services/api';

const c = theme.colors;

function StatCard({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function CategoryRow({ item }) {
  const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryTop}>
        <View style={styles.categoryLeft}>
          <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
          <View>
            <Text style={styles.categoryName}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
            <Text style={styles.categorySubtext}>{item.completed} of {item.total} hit</Text>
          </View>
        </View>
        <Text style={[styles.categoryPct, { color: pct >= 50 ? c.success : c.accent }]}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {
          width: `${pct}%`,
          backgroundColor: pct >= 50 ? c.success : c.accent,
        }]} />
      </View>
    </View>
  );
}

function RecentRow({ stake, isLast }) {
  const amount = stake.stake_amount ?? stake.stake ?? 0;
  const isWon = stake.status === 'completed';
  const isCancelled = stake.status === 'cancelled';

  return (
    <View style={[styles.recentRow, !isLast && styles.recentRowBorder]}>
      <View style={styles.recentLeft}>
        <View style={[
          styles.recentDot,
          { backgroundColor: isWon ? c.success : isCancelled ? c.surface : c.accent }
        ]}>
          <Text style={styles.recentDotText}>
            {isWon ? '✓' : isCancelled ? '–' : '✗'}
          </Text>
        </View>
        <View>
          <Text style={styles.recentTitle}>{stake.title}</Text>
          <Text style={styles.recentSub}>{getCategoryEmoji(stake.category)}  ·  ${amount}</Text>
        </View>
      </View>
      <Text style={[
        styles.recentStatus,
        { color: isWon ? c.success : isCancelled ? c.textTertiary : c.accent }
      ]}>
        {isWon ? 'WON' : isCancelled ? 'CANCELLED' : 'LOST'}
      </Text>
    </View>
  );
}

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const successRate = stats?.success_rate ?? 0;
  const categoryBreakdown = stats?.category_breakdown ?? [];
  const recentHistory = stats?.recent_history ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Stats</Text>

        {/* Streak hero */}
        <View style={styles.streakCard}>
          <Text style={styles.streakLabel}>CURRENT STREAK</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakNumber}>{stats?.current_streak ?? 0}</Text>
            <Text style={styles.streakFire}>🔥</Text>
          </View>
          <Text style={styles.streakSubtext}>
            {(stats?.current_streak ?? 0) === 0
              ? 'Complete your next stake to start a streak'
              : `${stats.current_streak} consecutive ${stats.current_streak === 1 ? 'stake' : 'stakes'} completed`}
          </Text>
        </View>

        {/* Success rate */}
        <View style={styles.rateCard}>
          <View style={styles.rateHeader}>
            <Text style={styles.rateLabel}>Success Rate</Text>
            <Text style={[styles.rateValue, { color: successRate >= 50 ? c.success : c.accent }]}>
              {successRate}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${successRate}%`,
              backgroundColor: successRate >= 50 ? c.success : c.accent,
            }]} />
          </View>
          <Text style={styles.rateSubtext}>
            {stats?.completed_count ?? 0} of {(stats?.completed_count ?? 0) + (stats?.failed_count ?? 0)} stakes hit
          </Text>
        </View>

        {/* Money grid */}
        <View style={styles.moneyGrid}>
          <StatCard label="SAVED" value={`$${stats?.saved ?? 0}`} color={c.success} />
          <StatCard label="LOST" value={`$${stats?.lost ?? 0}`} color={c.accent} />
          <StatCard label="AT STAKE" value={`$${stats?.at_stake ?? 0}`} color={c.warning} />
        </View>

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>By Category</Text>
            <View style={styles.categoryCard}>
              {categoryBreakdown.map((item, i) => (
                <View key={item.category}>
                  <CategoryRow item={item} />
                  {i < categoryBreakdown.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent history */}
        {recentHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent</Text>
            <View style={styles.recentCard}>
              {recentHistory.map((stake, i) => (
                <RecentRow key={stake.id} stake={stake} isLast={i === recentHistory.length - 1} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  pageTitle: {
    fontSize: 28, fontWeight: '700', color: c.text,
    letterSpacing: -0.8, marginBottom: 20,
  },

  // Streak
  streakCard: {
    backgroundColor: c.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255, 159, 10, 0.2)', marginBottom: 12,
  },
  streakLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: c.warning, marginBottom: 10 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  streakNumber: { fontSize: 48, fontWeight: '700', color: c.text, letterSpacing: -2 },
  streakFire: { fontSize: 32 },
  streakSubtext: { fontSize: 13, color: c.textTertiary },

  // Success rate
  rateCard: {
    backgroundColor: c.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: c.border, marginBottom: 12, gap: 10,
  },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { fontSize: 15, fontWeight: '600', color: c.text },
  rateValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  rateSubtext: { fontSize: 12, color: c.textTertiary },

  progressTrack: { height: 3, backgroundColor: c.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  // Money grid
  moneyGrid: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: c.border,
  },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: c.textTertiary, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },

  // Section title
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },

  // Category
  categoryCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', marginBottom: 24,
  },
  categoryRow: { padding: 16, gap: 10 },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryEmoji: { fontSize: 22 },
  categoryName: { fontSize: 15, fontWeight: '600', color: c.text },
  categorySubtext: { fontSize: 12, color: c.textTertiary, marginTop: 1 },
  categoryPct: { fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: c.border, marginHorizontal: 16 },

  // Recent
  recentCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden',
  },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  recentRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  recentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentDot: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recentDotText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  recentTitle: { fontSize: 14, fontWeight: '500', color: c.text },
  recentSub: { fontSize: 12, color: c.textTertiary, marginTop: 1 },
  recentStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
