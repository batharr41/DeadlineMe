import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { api } from '../services/api';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}S AGO`;
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function getAvatarColor(name = '') {
  const colors = ['#FF3366', '#FF6B35', '#9B59B6', '#3498DB', '#2ECC71'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [groupData, feedData] = await Promise.all([
        api.getGroup(groupId),
        api.getGroupFeed(groupId),
      ]);
      setGroup(groupData);
      setFeed(feedData.events || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load group');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleShare = async () => {
    if (!group) return;
    await Share.share({
      message: `Join my accountability squad "${group.name}" on DeadlineMe!\nInvite code: ${group.invite_code}\n\nNo excuses. No extensions. No mercy.`,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!group) return null;

  const members = group.members || [];
  const totalCompleted = members.reduce((s, m) => s + (m.stakes_completed || 0), 0);
  const totalFailed = members.reduce((s, m) => s + (m.stakes_failed || 0), 0);
  const squadIntegrity = totalCompleted + totalFailed > 0
    ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100)
    : 100;
  const activeStakesDollars = feed
    .filter(e => e.event_type === 'stake_created')
    .reduce((s, e) => s + (e.payload?.stake_amount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MISSION CONTROL</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.headerIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* Hero */}
        <Text style={styles.squadLabel}>SQUAD ALPHA</Text>
        <Text style={styles.groupName}>{group.name.toUpperCase()}</Text>

        <TouchableOpacity style={styles.inviteCodeBadge} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.inviteCodeText}>INVITE CODE: {group.invite_code}</Text>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SQUAD INTEGRITY</Text>
            <Text style={[styles.statValue, { color: squadIntegrity >= 50 ? theme.colors.success : theme.colors.accent }]}>
              {squadIntegrity}%
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ACTIVE STAKES</Text>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              ${activeStakesDollars.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SQUAD MEMBERS</Text>
          <Text style={styles.sectionCount}>{members.length} ACTIVE</Text>
        </View>

        {members.map((member) => (
          <View key={member.user_id} style={styles.memberCard}>
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(member.display_name) }]}>
              <Text style={styles.avatarText}>{getInitials(member.display_name)}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.display_name.toUpperCase()}</Text>
              <Text style={styles.memberStreak}>
                {member.streak > 0 ? '🔥' : '○'} {member.streak} DAY STREAK
              </Text>
            </View>
            <View style={styles.memberPerf}>
              <Text style={styles.perfLabel}>PERFORMANCE</Text>
              <Text style={styles.perfValue}>
                <Text style={styles.hitText}>{member.stakes_completed} HIT</Text>
                <Text style={styles.dividerText}> / </Text>
                <Text style={member.stakes_failed > 0 ? styles.missText : styles.missZeroText}>
                  {member.stakes_failed} MISS
                </Text>
              </Text>
            </View>
          </View>
        ))}

        {/* Operational Log */}
        <Text style={styles.logTitle}>OPERATIONAL LOG</Text>

        {feed.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyFeedText}>No activity yet. Create a stake to kick things off.</Text>
          </View>
        ) : (
          feed.map((event) => {
            const isSuccess = event.event_type === 'stake_completed';
            const isFailure = event.event_type === 'stake_failed';
            const isCreated = event.event_type === 'stake_created';

            let iconBg = '#2A2A3A';
            let icon = '👤';
            let titleText = 'NEW OPERATIVE';
            let titleColor = '#FFFFFF';

            if (isSuccess) { iconBg = theme.colors.success; icon = '✓'; titleText = 'MISSION SUCCESS'; titleColor = theme.colors.success; }
            if (isFailure) { iconBg = theme.colors.accent;  icon = '✕'; titleText = 'MISSION FAILURE'; titleColor = theme.colors.accent; }
            if (isCreated) { iconBg = theme.colors.warning; icon = '🔥'; titleText = 'STAKE LOCKED IN'; titleColor = theme.colors.warning; }

            const name = event.profiles?.display_name || 'Someone';
            const p = event.payload || {};

            let body = '';
            if (isSuccess) body = `${name} completed "${p.title}". No penalty incurred.`;
            if (isFailure) body = `${name} missed "${p.title}". $${p.stake_amount}.00 liquidated.`;
            if (isCreated) body = `${name} staked $${p.stake_amount} on "${p.title}".`;
            if (event.event_type === 'member_joined') body = `${name} joined ${group.name} via invitation.`;

            return (
              <View key={event.id} style={styles.logRow}>
                <View style={[styles.logIconCircle, { backgroundColor: iconBg }]}>
                  <Text style={styles.logIcon}>{icon}</Text>
                </View>
                <View style={styles.logContent}>
                  <View style={styles.logHeader}>
                    <Text style={[styles.logEventTitle, { color: titleColor }]}>{titleText}</Text>
                    <Text style={styles.logTime}>{timeAgo(event.created_at)}</Text>
                  </View>
                  <Text style={styles.logBody}>{body}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewStake')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backArrow: { fontSize: 22, color: theme.colors.accent },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.accent, letterSpacing: 1.5 },
  headerIcon: { fontSize: 20 },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },

  squadLabel: { fontSize: 11, color: '#8888AA', letterSpacing: 2, marginBottom: 4 },
  groupName: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', lineHeight: 40, marginBottom: 14 },

  inviteCodeBadge: {
    alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: '#1A1A25', marginBottom: 24,
  },
  inviteCodeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 2 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1, backgroundColor: '#12121A', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: theme.colors.border,
  },
  statLabel: { fontSize: 10, color: '#8888AA', letterSpacing: 1, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  sectionCount: { fontSize: 11, color: '#8888AA', letterSpacing: 1 },

  memberCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#12121A',
    borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A3A',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  memberStreak: { fontSize: 11, color: '#8888AA' },
  memberPerf: { alignItems: 'flex-end' },
  perfLabel: { fontSize: 9, color: '#555570', letterSpacing: 0.5, marginBottom: 4 },
  perfValue: { fontSize: 13, fontWeight: '700' },
  hitText: { color: '#00E676' },
  dividerText: { color: '#555570' },
  missText: { color: '#FF3366' },
  missZeroText: { color: '#8888AA' },

  logTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 32, marginBottom: 16 },

  logRow: { flexDirection: 'row', marginBottom: 20 },
  logIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0,
  },
  logIcon: { fontSize: 16, color: '#fff', fontWeight: '700' },
  logContent: { flex: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logEventTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  logTime: { fontSize: 11, color: '#555570' },
  logBody: { fontSize: 13, color: '#C0C0D0', lineHeight: 18 },

  emptyFeed: { paddingVertical: 24, alignItems: 'center' },
  emptyFeedText: { color: '#555570', fontSize: 13, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 30, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
