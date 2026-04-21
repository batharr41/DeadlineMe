import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme, CATEGORIES, getCategoryEmoji } from '../utils/theme';
import { api } from '../services/api';

export default function StatsScreen() {
  const [stakes, setStakes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [stakesData, statsData] = await Promise.all([
        api.getMyStakes(),
        api.getStats(),
      ]);
      setStakes(stakesData?.stakes || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Compute category breakdown from stakes
  const categoryBreakdown = CATEGORIES.map((cat) => {
    const catStakes = stakes.filter((s) => s.category === cat.id);
    const decided = catStakes.filter((s) => s.status === 'completed' || s.status === 'failed');
    const completed = catStakes.filter((s) => s.status === 'completed').length;
    const total = decided.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : null;
    return { ...cat, completed, total, rate };
  }).filter((c) => c.total > 0);

  // Sort: highest success rate first, then by total count
  categoryBreakdown.sort((a, b) => (b.rate || 0) - (a.rate || 0) || b.total - a.total);

  const recentDecided = stakes
    .filter((s) => s.status === 'completed' || s.status === 'failed' || s.status === 'cancelled')
    .slice(0, 10);

  const streak = stats?.current_streak || 0;
  const successRate = stats?.success_rate || 0;
  const totalDecided = (stats?.completed_count || 0) + (stats?.failed_count || 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        <Text style={styles.title}>Stats</Text>

        {/* Hero: streak */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Current Streak</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroNumber}>{streak}</Text>
            <Text style={styles.heroEmoji}>🔥</Text>
          </View>
          <Text style={styles.heroHint}>
            {streak === 0
              ? 'Complete your next stake to start a streak.'
              : streak === 1
              ? 'One down. Keep it rolling.'
              : `${streak} completed stakes in a row.`}
          </Text>
        </View>

        {/* Success rate */}
        <View style={styles.rateCard}>
          <View style={styles.rateHeader}>
            <Text style={styles.rateLabel}>Success Rate</Text>
            <Text style={styles.ratePct}>{successRate}%</Text>
          </View>
          <View style={styles.rateBar}>
            <View style={[styles.rateFill, { width: `${successRate}%` }]} />
          </View>
          <Text style={styles.rateSub}>
            {totalDecided === 0
              ? 'No completed stakes yet.'
              : `${stats.completed_count} of ${totalDecided} stakes hit.`}
          </Text>
        </View>

        {/* Money summary */}
        <View style={styles.moneyRow}>
          <View style={styles.moneyCard}>
            <Text style={styles.moneyLabel}>Saved</Text>
            <Text style={[styles.moneyValue, { color: theme.colors.success }]}>
              ${stats?.saved || 0}
            </Text>
          </View>
          <View style={styles.moneyCard}>
            <Text style={styles.moneyLabel}>Lost</Text>
            <Text style={[styles.moneyValue, { color: theme.colors.accent }]}>
              ${stats?.lost || 0}
            </Text>
          </View>
          <View style={styles.moneyCard}>
            <Text style={styles.moneyLabel}>At Stake</Text>
            <Text style={[styles.moneyValue, { color: theme.colors.warning }]}>
              ${stats?.at_stake || 0}
            </Text>
          </View>
        </View>

        {/* Category breakdown */}
        <Text style={styles.sectionTitle}>By Category</Text>
        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Complete some stakes to see which categories you win most.
            </Text>
          </View>
        ) : (
          categoryBreakdown.map((cat) => (
            <View key={cat.id} style={styles.catCard}>
              <View style={styles.catRow}>
                <View style={styles.catLeft}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <View>
                    <Text style={styles.catLabel}>{cat.label}</Text>
                    <Text style={styles.catSub}>{cat.completed} of {cat.total} hit</Text>
                  </View>
                </View>
                <Text style={[
                  styles.catRate,
                  {
                    color:
                      cat.rate >= 75 ? theme.colors.success
                      : cat.rate >= 40 ? theme.colors.warning
                      : theme.colors.accent,
                  },
                ]}>
                  {cat.rate}%
                </Text>
              </View>
              <View style={styles.catBar}>
                <View style={[
                  styles.catFill,
                  {
                    width: `${cat.rate}%`,
                    backgroundColor:
                      cat.rate >= 75 ? theme.colors.success
                      : cat.rate >= 40 ? theme.colors.warning
                      : theme.colors.accent,
                  },
                ]} />
              </View>
            </View>
          ))
        )}

        {/* Recent history */}
        <Text style={styles.sectionTitle}>Recent</Text>
        {recentDecided.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Your history will show up here.</Text>
          </View>
        ) : (
          recentDecided.map((stake) => {
            const isCompleted = stake.status === 'completed';
            const isCancelled = stake.status === 'cancelled';
            return (
              <View key={stake.id} style={styles.recentCard}>
                <View style={styles.recentLeft}>
                  <Text style={styles.recentEmoji}>
                    {isCompleted ? '✅' : isCancelled ? '○' : '❌'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTitle} numberOfLines={1}>{stake.title}</Text>
                    <Text style={styles.recentMeta}>
                      {getCategoryEmoji(stake.category)} · ${stake.stake_amount}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.recentStatus,
                  {
                    color: isCompleted
                      ? theme.colors.success
                      : isCancelled
                      ? theme.colors.textMuted
                      : theme.colors.accent,
                  },
                ]}>
                  {isCompleted ? 'Won' : isCancelled ? 'Cancelled' : 'Lost'}
                </Text>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },

  heroCard: {
    backgroundColor: theme.colors.warningDim, borderRadius: 20,
    padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,179,0,0.4)',
  },
  heroLabel: {
    fontSize: 11, color: theme.colors.warning,
    letterSpacing: 1.5, fontWeight: '700', marginBottom: 8,
  },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroNumber: {
    fontSize: 64, fontWeight: '800', color: theme.colors.warning,
    lineHeight: 70,
  },
  heroEmoji: { fontSize: 40 },
  heroHint: { fontSize: 13, color: theme.colors.textMuted, marginTop: 8 },

  rateCard: {
    backgroundColor: theme.colors.card, borderRadius: 16,
    padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  rateLabel: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '600' },
  ratePct: { fontSize: 22, fontWeight: '700', color: theme.colors.success },
  rateBar: {
    height: 8, backgroundColor: theme.colors.border,
    borderRadius: 4, overflow: 'hidden', marginBottom: 10,
  },
  rateFill: { height: '100%', backgroundColor: theme.colors.success, borderRadius: 4 },
  rateSub: { fontSize: 12, color: theme.colors.textMuted },

  moneyRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  moneyCard: {
    flex: 1, backgroundColor: theme.colors.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: theme.colors.border,
  },
  moneyLabel: {
    fontSize: 11, color: theme.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  moneyValue: { fontSize: 20, fontWeight: '700' },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: theme.colors.text,
    marginBottom: 12, marginTop: 8,
  },

  emptyCard: {
    backgroundColor: theme.colors.card, borderRadius: 14,
    padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },

  catCard: {
    backgroundColor: theme.colors.card, borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  catSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  catRate: { fontSize: 18, fontWeight: '700' },
  catBar: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 3 },

  recentCard: {
    backgroundColor: theme.colors.card, borderRadius: 12,
    padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: theme.colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  recentLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  recentEmoji: { fontSize: 18 },
  recentTitle: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  recentMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  recentStatus: {
    fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginLeft: 10,
  },
});
