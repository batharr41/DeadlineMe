import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { api } from '../services/api';

function timeLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  if (h >= 24) { const d = Math.floor(h / 24); return `${d}d ${h % 24}h left`; }
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function ChallengeCard({ c, onPress, dimmed }) {
  const tl = timeLeft(c.deadline);
  const expired = tl === 'EXPIRED' || c.status === 'expired';

  // Work out pass/fail counts
  const completed = (c.participants || []).filter(p => p.status === 'completed').length;
  const failed = (c.participants || []).filter(p => p.status === 'failed').length;
  const total = c.participant_count || 0;

  return (
    <TouchableOpacity
      style={[styles.card, dimmed && { opacity: 0.6 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.cardAccent, expired && { backgroundColor: '#555570' }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{c.title}</Text>
          <View style={[
            styles.statusBadge,
            expired && styles.statusExpired,
            c.status === 'completed' && styles.statusCompleted,
          ]}>
            <Text style={[
              styles.statusText,
              expired && { color: '#8888AA' },
              c.status === 'completed' && { color: '#00E676' },
            ]}>
              {expired ? 'EXPIRED' : c.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <Text style={[styles.metaText, expired && { color: '#555570' }]}>
            ⏰ {expired ? 'EXPIRED' : tl}
          </Text>
          <Text style={styles.metaText}>👥 {total} joined</Text>
          <Text style={styles.metaText}>Min ${c.min_stake}</Text>
        </View>

        {/* Pass/fail bar if anyone participated */}
        {total > 0 && (
          <View style={styles.resultRow}>
            {completed > 0 && (
              <View style={styles.resultBadge}>
                <Text style={styles.resultPass}>✓ {completed} passed</Text>
              </View>
            )}
            {failed > 0 && (
              <View style={styles.resultBadge}>
                <Text style={styles.resultFail}>✗ {failed} failed</Text>
              </View>
            )}
            {total - completed - failed > 0 && (
              <View style={styles.resultBadge}>
                <Text style={styles.resultActive}>⏳ {total - completed - failed} active</Text>
              </View>
            )}
          </View>
        )}

        {c.user_joined && !expired && (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedText}>✓ YOU'RE IN</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function GroupChallengesScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getGroupChallenges(groupId);
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [load, navigation]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const active = challenges.filter(c => c.status === 'active' && timeLeft(c.deadline) !== 'EXPIRED');
  const expired = challenges.filter(c => c.status === 'expired' || timeLeft(c.deadline) === 'EXPIRED');

  // Split expired into those with participants (has results) vs empty
  const withResults = expired.filter(c => (c.participant_count || 0) > 0);
  const noResults = expired.filter(c => (c.participant_count || 0) === 0);

  const goToDetail = (c) => navigation.navigate('ChallengeDetail', { challengeId: c.id, groupName });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHALLENGES</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateChallenge', { groupId, groupName })}>
          <Text style={styles.headerAdd}>+ NEW</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
      >
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.subtitle}>GROUP CHALLENGES</Text>

        {challenges.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>NO CHALLENGES YET</Text>
            <Text style={styles.emptyText}>Create one and dare your squad to join.</Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('CreateChallenge', { groupId, groupName })}
            >
              <Text style={styles.btnPrimaryText}>CREATE CHALLENGE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>🔥 ACTIVE ({active.length})</Text>
                {active.map(c => (
                  <ChallengeCard key={c.id} c={c} onPress={() => goToDetail(c)} />
                ))}
              </>
            )}

            {/* Completed with results */}
            {withResults.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>📋 RESULTS ({withResults.length})</Text>
                {withResults.map(c => (
                  <ChallengeCard key={c.id} c={c} onPress={() => goToDetail(c)} dimmed />
                ))}
              </>
            )}

            {/* Expired with no one joined — show collapsed */}
            {noResults.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>💨 EXPIRED — NO TAKERS ({noResults.length})</Text>
                {noResults.map(c => (
                  <ChallengeCard key={c.id} c={c} onPress={() => goToDetail(c)} dimmed />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2A2A3A',
  },
  back: { fontSize: 22, color: '#FF3366' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#FF3366', letterSpacing: 2 },
  headerAdd: { fontSize: 13, fontWeight: '800', color: '#FF3366', letterSpacing: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  groupName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#8888AA', letterSpacing: 2, marginBottom: 24 },

  sectionHeader: {
    fontSize: 12, fontWeight: '800', color: '#8888AA',
    letterSpacing: 1.5, marginBottom: 12, marginTop: 8,
  },

  card: {
    flexDirection: 'row', backgroundColor: '#12121A',
    borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A2A3A', overflow: 'hidden',
  },
  cardAccent: { width: 3, backgroundColor: '#FF3366' },
  cardInner: { flex: 1, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1, marginRight: 8 },
  statusBadge: {
    backgroundColor: 'rgba(255,51,102,0.15)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,51,102,0.3)',
  },
  statusExpired: { backgroundColor: 'rgba(136,136,170,0.1)', borderColor: 'rgba(136,136,170,0.2)' },
  statusCompleted: { backgroundColor: 'rgba(0,230,118,0.1)', borderColor: 'rgba(0,230,118,0.3)' },
  statusText: { fontSize: 10, fontWeight: '800', color: '#FF3366', letterSpacing: 0.5 },

  cardMeta: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginBottom: 8 },
  metaText: { fontSize: 12, color: '#8888AA' },

  resultRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#1C1C28' },
  resultPass: { fontSize: 11, fontWeight: '700', color: '#00E676' },
  resultFail: { fontSize: 11, fontWeight: '700', color: '#FF3366' },
  resultActive: { fontSize: 11, fontWeight: '700', color: '#FFB300' },

  joinedBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,230,118,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)', marginTop: 4,
  },
  joinedText: { fontSize: 10, fontWeight: '800', color: '#00E676', letterSpacing: 0.5 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  emptyText: { fontSize: 14, color: '#8888AA', textAlign: 'center' },
  btnPrimary: {
    backgroundColor: '#FF3366', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});
