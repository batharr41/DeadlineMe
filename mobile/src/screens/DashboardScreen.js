import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Share,
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
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function LiveCountdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) { setTimeLeft('EXPIRED'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const days = Math.floor(h / 24);
      setIsUrgent(h < 24);
      if (days > 0) setTimeLeft(`${days}D ${h % 24}H ${m}M`);
      else setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <View style={styles.countdownRow}>
      <Text style={styles.countdownIcon}>⏱</Text>
      <Text style={[styles.countdownText, isUrgent && styles.countdownUrgent]}>{timeLeft}</Text>
      <Text style={styles.countdownLabel}>REMAINING</Text>
    </View>
  );
}

function ActiveContractCard({ stake, onPress }) {
  const amount = stake.stake_amount ?? stake.stake ?? 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I just committed to "${stake.title}" with $${amount} on the line. Holding myself accountable. 🔥 DeadlineMe`,
      });
    } catch (e) {}
  };

  return (
    <TouchableOpacity style={styles.contractCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.contractAccent} />
      <View style={styles.contractContent}>
        <View style={styles.contractHeader}>
          <View style={styles.contractTitleWrap}>
            <Text style={styles.contractLabel}>ACTIVE CONTRACT</Text>
            <Text style={styles.contractTitle} numberOfLines={2}>{stake.title}</Text>
          </View>
          <View style={styles.stakeBadge}>
            <Text style={styles.stakeBadgeAmount}>${amount}</Text>
            <Text style={styles.stakeBadgeLabel}>STAKE</Text>
          </View>
        </View>

        {stake.deadline && <LiveCountdown deadline={stake.deadline} />}

        <View style={styles.contractActions}>
          <TouchableOpacity style={styles.proveBtn} onPress={onPress}>
            <Text style={styles.proveBtnText}>Upload Proof →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HistoryRow({ stake, isLast }) {
  const amount = stake.stake_amount ?? stake.stake ?? 0;
  const isWon = stake.status === 'completed';
  const isCancelled = stake.status === 'cancelled';
  const statusColor = getStatusColor(stake.status, c);
  const label = isWon ? `+$${amount}` : isCancelled ? '—' : `-$${amount}`;

  const handleShare = async () => {
    if (!isWon) return;
    try {
      await Share.share({
        message: `Just completed "${stake.title}" and got my $${amount} back. Follow through is everything. 🔥 DeadlineMe`,
      });
    } catch (e) {}
  };

  return (
    <View style={[styles.historyRow, !isLast && styles.historyRowBorder]}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyEmoji}>{getCategoryEmoji(stake.category)}</Text>
        <View>
          <Text style={styles.historyTitle} numberOfLines={1}>{stake.title}</Text>
          <Text style={styles.historyDate}>{formatDate(stake.deadline || stake.created_at)}</Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <Text style={[styles.historyAmount, { color: statusColor }]}>{label}</Text>
        {isWon && (
          <TouchableOpacity onPress={handleShare}>
            <Text style={styles.historyShare}>↑</Text>
          </TouchableOpacity>
        )}
      </View>
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
      const [stakesData, statsData] = await Promise.all([api.getMyStakes(), api.getStats()]);
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
    return <View style={styles.loadingContainer}><ActivityIndicator color={c.accent} /></View>;
  }

  const exposure = active.reduce((sum, s) => sum + (s.stake_amount ?? s.stake ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.bolt}>⚡</Text>
            <Text style={styles.wordmark}>DEADLINEME</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewStake')}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Exposure bar */}
        <View style={styles.exposureCard}>
          <View style={styles.exposureLeft}>
            <Text style={styles.exposureLabel}>CURRENT EXPOSURE</Text>
            <Text style={styles.exposureAmount}>${exposure.toFixed(2)}</Text>
          </View>
          <Text style={styles.exposureTag}>Potential Loss</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SAVED</Text>
            <Text style={[styles.statValue, { color: c.success }]}>↑ ${stats.saved ?? 0}</Text>
          </View>
          <View style={[styles.statCard, { marginLeft: 8 }]}>
            <Text style={styles.statLabel}>LOST</Text>
            <Text style={[styles.statValue, { color: c.accent }]}>↓ ${stats.lost ?? 0}</Text>
          </View>
        </View>

        {/* Active contracts */}
        {active.length > 0 ? (
          active.map(stake => (
            <ActiveContractCard
              key={stake.id}
              stake={stake}
              onPress={() => navigation.navigate('StakeDetail', { stakeId: stake.id, stake })}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>Nothing on the line.</Text>
            <Text style={styles.emptySubtitle}>Commit to something today.</Text>
          </View>
        )}

        {/* Commit history */}
        {past.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>COMMIT HISTORY</Text>
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
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewStake')} activeOpacity={0.85}>
          <Text style={styles.fabText}>+ COMMIT TO SOMETHING</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bolt: { fontSize: 18, color: c.accent },
  wordmark: { fontSize: 18, fontWeight: '700', color: c.accent, letterSpacing: 2 },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: c.textSecondary, fontSize: 20, lineHeight: 22 },

  // Exposure
  exposureCard: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: c.border, marginBottom: 8,
  },
  exposureLeft: { gap: 4 },
  exposureLabel: { fontSize: 10, fontWeight: '700', color: c.textTertiary, letterSpacing: 1 },
  exposureAmount: { fontSize: 24, fontWeight: '700', color: c.success, letterSpacing: -0.5 },
  exposureTag: { fontSize: 12, color: c.textTertiary, borderBottomWidth: 1, borderBottomColor: c.accent, paddingBottom: 2 },

  // Stats
  statsRow: { flexDirection: 'row', marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border,
  },
  statLabel: { fontSize: 10, fontWeight: '700', color: c.textTertiary, letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },

  // Contract card
  contractCard: {
    backgroundColor: c.card, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,45,85,0.25)',
    flexDirection: 'row', overflow: 'hidden',
  },
  contractAccent: { width: 4, backgroundColor: c.accent },
  contractContent: { flex: 1, padding: 16, gap: 12 },
  contractHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contractTitleWrap: { flex: 1, marginRight: 12 },
  contractLabel: { fontSize: 10, fontWeight: '700', color: c.accent, letterSpacing: 1, marginBottom: 4 },
  contractTitle: { fontSize: 16, fontWeight: '700', color: c.text, letterSpacing: -0.3, lineHeight: 22 },
  stakeBadge: {
    backgroundColor: c.accent, borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 60,
  },
  stakeBadgeAmount: { fontSize: 16, fontWeight: '700', color: '#fff' },
  stakeBadgeLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },

  // Countdown
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countdownIcon: { fontSize: 14 },
  countdownText: { fontSize: 20, fontWeight: '700', color: c.warning, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  countdownUrgent: { color: c.accent },
  countdownLabel: { fontSize: 10, fontWeight: '600', color: c.textTertiary, letterSpacing: 1 },

  // Contract actions
  contractActions: { flexDirection: 'row', gap: 8 },
  proveBtn: {
    flex: 1, backgroundColor: c.accent, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  proveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  shareBtn: {
    backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.border,
    paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
  },
  shareBtnText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: c.textTertiary, letterSpacing: 1.5 },

  // History
  historyCard: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden', marginBottom: 12 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyEmoji: { fontSize: 16 },
  historyTitle: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
  historyDate: { fontSize: 12, color: c.textTertiary, marginTop: 1 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyAmount: { fontSize: 14, fontWeight: '700' },
  historyShare: { fontSize: 14, color: c.textTertiary, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: c.textSecondary },
  emptySubtitle: { fontSize: 14, color: c.textTertiary },

  // FAB
  fabContainer: { position: 'absolute', bottom: 24, left: 16, right: 16 },
  fab: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
