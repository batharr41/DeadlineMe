import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme, getCategoryEmoji } from '../utils/theme';
import { api } from '../services/api';

const c = theme.colors;

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
    return <View style={styles.loading}><ActivityIndicator color={c.accent} /></View>;
  }

  const successRate = stats?.success_rate ?? 0;
  const categoryBreakdown = stats?.category_breakdown ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.bolt}>⚡</Text>
          <Text style={styles.wordmark}>DEADLINEME</Text>
        </View>

        {/* Top stats grid */}
        <View style={styles.topGrid}>
          {/* Survival rate */}
          <View style={styles.survivalCard}>
            <View style={styles.survivalCircle}>
              <Text style={styles.survivalPct}>{Math.round(successRate)}%</Text>
              <Text style={styles.survivalLabel}>SUCCESS</Text>
            </View>
            <Text style={styles.survivalTitle}>SURVIVAL{'\n'}RATE</Text>
          </View>

          {/* Streak */}
          <View style={styles.streakCard}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakNumber}>{stats?.current_streak ?? 0}</Text>
            <Text style={styles.streakLabel}>DAY STREAK</Text>
          </View>
        </View>

        {/* Money grid */}
        <View style={styles.moneyGrid}>
          {[
            { label: 'SAVED', value: stats?.saved ?? 0, color: c.success, border: c.success },
            { label: 'LOST', value: stats?.lost ?? 0, color: c.accent, border: c.accent },
            { label: 'AT STAKE', value: stats?.at_stake ?? 0, color: c.warning, border: c.warning },
          ].map((s, i) => (
            <View key={i} style={[styles.moneyCard, { borderBottomColor: s.border }]}>
              <Text style={styles.moneyLabel}>{s.label}</Text>
              <Text style={[styles.moneyValue, { color: s.color }]}>${s.value}</Text>
            </View>
          ))}
        </View>

        {/* Category performance */}
        {categoryBreakdown.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CATEGORY PERFORMANCE</Text>
              <Text style={styles.sectionSub}>LAST 30 DAYS</Text>
            </View>

            {categoryBreakdown.map((item, i) => {
              const hitPct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
              const missPct = 100 - hitPct;
              return (
                <View key={i} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryLeft}>
                      <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
                      <Text style={styles.categoryName}>{item.category.toUpperCase()}</Text>
                    </View>
                    <View style={styles.categoryStats}>
                      <Text style={styles.hitText}>{hitPct}% HIT</Text>
                      <Text style={styles.missText}>{missPct}% MISS</Text>
                    </View>
                  </View>
                  <View style={styles.splitBar}>
                    <View style={[styles.hitBar, { flex: hitPct }]} />
                    <View style={[styles.missBar, { flex: missPct }]} />
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Warning card if low success rate */}
        {successRate < 50 && successRate > 0 && (
          <View style={styles.warningCard}>
            <View style={styles.warningBadge}>
              <Text style={styles.warningBadgeText}>WARNING</Text>
            </View>
            <Text style={styles.warningText}>
              Your success rate is below 50%. ${stats?.at_stake ?? 0} at risk this week. Step it up.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  bolt: { fontSize: 18, color: c.accent },
  wordmark: { fontSize: 18, fontWeight: '700', color: c.accent, letterSpacing: 2 },

  // Top grid
  topGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },

  survivalCard: {
    flex: 1, backgroundColor: c.card, borderRadius: 16,
    borderWidth: 1, borderColor: c.border, padding: 16,
    alignItems: 'center', gap: 10,
  },
  survivalCircle: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 4, borderColor: c.success,
    alignItems: 'center', justifyContent: 'center',
  },
  survivalPct: { fontSize: 22, fontWeight: '700', color: c.success, letterSpacing: -0.5 },
  survivalLabel: { fontSize: 9, fontWeight: '700', color: c.success, letterSpacing: 1 },
  survivalTitle: { fontSize: 12, fontWeight: '700', color: c.textSecondary, letterSpacing: 1, textAlign: 'center' },

  streakCard: {
    flex: 1, backgroundColor: c.card, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,159,10,0.3)', padding: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  streakFire: { fontSize: 32 },
  streakNumber: { fontSize: 40, fontWeight: '700', color: c.text, letterSpacing: -1 },
  streakLabel: { fontSize: 11, fontWeight: '700', color: c.warning, letterSpacing: 1 },

  // Money grid
  moneyGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  moneyCard: {
    flex: 1, backgroundColor: c.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: c.border, borderBottomWidth: 2,
  },
  moneyLabel: { fontSize: 9, fontWeight: '700', color: c.textTertiary, letterSpacing: 1, marginBottom: 6 },
  moneyValue: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: c.textSecondary, letterSpacing: 1.5 },
  sectionSub: { fontSize: 10, color: c.textTertiary, letterSpacing: 0.5 },

  // Category
  categoryCard: {
    backgroundColor: c.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border, marginBottom: 8, gap: 10,
  },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryEmoji: { fontSize: 18 },
  categoryName: { fontSize: 13, fontWeight: '700', color: c.text, letterSpacing: 0.5 },
  categoryStats: { flexDirection: 'row', gap: 12 },
  hitText: { fontSize: 12, fontWeight: '700', color: c.success },
  missText: { fontSize: 12, fontWeight: '700', color: c.accent },
  splitBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden' },
  hitBar: { backgroundColor: c.success },
  missBar: { backgroundColor: 'rgba(255,45,85,0.3)' },

  // Warning
  warningCard: {
    backgroundColor: 'rgba(255,45,85,0.08)', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,45,85,0.2)', gap: 10, marginTop: 8,
  },
  warningBadge: {
    alignSelf: 'flex-start', backgroundColor: c.accent,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  warningBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  warningText: { fontSize: 13, color: c.textSecondary, lineHeight: 20 },
});
