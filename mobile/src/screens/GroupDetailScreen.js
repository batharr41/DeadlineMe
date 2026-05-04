import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function getAvatarColor(name = '') {
  const colors = ['#FF3366', '#FF6B35', '#9B59B6', '#3498DB', '#2ECC71'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}

function eventIcon(type) {
  if (type === 'stake_completed') return { icon: '✓', bg: '#00E676' };
  if (type === 'stake_failed') return { icon: '✗', bg: '#FF3366' };
  if (type === 'member_joined') return { icon: '👋', bg: '#3498DB' };
  return { icon: '🔥', bg: '#FF6B35' };
}

function eventText(e) {
  const name = e.display_name || 'Someone';
  const payload = e.payload || {};
  if (e.event_type === 'stake_completed') return `${name} completed "${payload.title}". No penalty incurred.`;
  if (e.event_type === 'stake_failed') return `${name} failed "${payload.title}". $${payload.stake_amount} forfeited.`;
  if (e.event_type === 'member_joined') return `${name} joined the squad.`;
  return `${name} staked $${payload.stake_amount || '?'} on "${payload.title}".`;
}

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(null); // member object

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

  const isAdmin = group?.user_role === 'admin';

  const handleLeave = () => {
    Alert.alert(
      'Leave Group',
      isAdmin && (group?.members || []).filter(m => m.role !== 'admin').length > 0
        ? 'Transfer admin to another member before leaving.'
        : 'Are you sure you want to leave this group?',
      isAdmin && (group?.members || []).filter(m => m.role !== 'admin').length > 0
        ? [{ text: 'OK' }]
        : [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave', style: 'destructive',
              onPress: async () => {
                try {
                  await api.leaveGroup(groupId);
                  navigation.navigate('MainTabs');
                } catch (err) {
                  Alert.alert('Error', err.message);
                }
              }
            }
          ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      '⚠️ Delete Group',
      `This will permanently delete "${group?.name}" and all its challenges and history. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE FOREVER', style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGroup(groupId);
              navigation.navigate('MainTabs');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleRemoveMember = (member) => {
    Alert.alert(
      'Remove Member',
      `Remove @${member.display_name} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api.removeMember(groupId, member.user_id);
              setShowMemberMenu(null);
              load();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleTransferAdmin = (member) => {
    Alert.alert(
      'Transfer Admin',
      `Make @${member.display_name} the new admin? You'll become a regular member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer', style: 'destructive',
          onPress: async () => {
            try {
              await api.transferAdmin(groupId, member.user_id);
              setShowMemberMenu(null);
              load();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const members = group?.members || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MISSION CONTROL</Text>
        <TouchableOpacity onPress={() => setShowAdminMenu(true)}>
          <Text style={styles.headerMenu}>⋯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
      >
        {/* Group header */}
        <Text style={styles.groupName}>{group?.name}</Text>
        {group?.description ? <Text style={styles.groupDesc}>{group.description}</Text> : null}

        <View style={styles.inviteRow}>
          <View style={styles.inviteCard}>
            <Text style={styles.inviteLabel}>INVITE CODE: </Text>
            <Text style={styles.inviteCode}>{group?.invite_code}</Text>
          </View>
          {isAdmin && <Text style={styles.adminBadge}>👑 ADMIN</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SQUAD INTEGRITY</Text>
            <Text style={[styles.statValue, { color: '#FF3366' }]}>
              {members.length > 0
                ? Math.round(members.reduce((acc, m) => acc + (m.total > 0 ? m.hit / m.total * 100 : 0), 0) / members.length)
                : 0}%
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>MEMBERS</Text>
            <Text style={styles.statValue}>{members.length}</Text>
          </View>
        </View>

        {/* Group Challenges button */}
        <TouchableOpacity
          style={styles.challengesBtn}
          onPress={() => navigation.navigate('GroupChallenges', { groupId, groupName: group?.name })}
          activeOpacity={0.8}
        >
          <Text style={styles.challengesBtnIcon}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengesBtnTitle}>GROUP CHALLENGES</Text>
            <Text style={styles.challengesBtnSub}>Dare your squad to compete</Text>
          </View>
          <Text style={styles.challengesBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* Squad Members */}
        <Text style={styles.sectionTitle}>SQUAD MEMBERS <Text style={styles.sectionCount}>{members.length} ACTIVE</Text></Text>

        {members.map((m) => (
          <TouchableOpacity
            key={m.user_id}
            style={styles.memberRow}
            onPress={() => isAdmin && m.user_id !== user?.id ? setShowMemberMenu(m) : null}
            activeOpacity={isAdmin && m.user_id !== user?.id ? 0.7 : 1}
          >
            <View style={[styles.memberAvatar, { backgroundColor: getAvatarColor(m.display_name) }]}>
              <Text style={styles.memberAvatarText}>{getInitials(m.display_name)}</Text>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.memberName}>
                  {m.user_id === user?.id ? `${m.display_name} (you)` : m.display_name}
                </Text>
                {m.role === 'admin' && <Text style={styles.crownBadge}>👑</Text>}
              </View>
              <Text style={styles.memberStreak}>○ {m.streak} DAY STREAK</Text>
            </View>
            <View style={styles.memberPerf}>
              <Text style={styles.memberPerfText}>
                <Text style={{ color: '#00E676' }}>{m.hit} HIT</Text>
                <Text style={{ color: '#555570' }}> / </Text>
                <Text style={{ color: '#FF3366' }}>{m.miss} MISS</Text>
              </Text>
              {isAdmin && m.user_id !== user?.id && (
                <Text style={styles.memberMenuDot}>›</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Operational Log */}
        <Text style={styles.sectionTitle}>OPERATIONAL LOG</Text>

        {feed.length === 0 ? (
          <Text style={styles.emptyFeed}>No activity yet. Create a stake to get started.</Text>
        ) : (
          feed.map((e) => {
            const { icon, bg } = eventIcon(e.event_type);
            return (
              <View key={e.id} style={styles.eventRow}>
                <View style={[styles.eventIcon, { backgroundColor: bg }]}>
                  <Text style={styles.eventIconText}>{icon}</Text>
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventType}>
                    {e.event_type === 'stake_completed' ? 'MISSION SUCCESS' :
                     e.event_type === 'stake_failed' ? 'MISSION FAILED' :
                     e.event_type === 'member_joined' ? 'NEW RECRUIT' : 'STAKE LOCKED IN'}
                  </Text>
                  <Text style={styles.eventText}>{eventText(e)}</Text>
                </View>
                <Text style={styles.eventTime}>{timeAgo(e.created_at)}</Text>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — anyone can create a stake */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewStake')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Admin/member options menu */}
      <Modal visible={showAdminMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setShowAdminMenu(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{group?.name}</Text>

            {isAdmin && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setShowAdminMenu(false); handleDeleteGroup(); }}>
                  <Text style={[styles.menuItemText, { color: '#FF3366' }]}>🗑 Delete Group</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowAdminMenu(false); handleLeave(); }}>
              <Text style={[styles.menuItemText, { color: '#FF3366' }]}>
                {isAdmin ? '👑 Leave Group (transfer admin first)' : '🚪 Leave Group'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemCancel]} onPress={() => setShowAdminMenu(false)}>
              <Text style={[styles.menuItemText, { color: '#8888AA' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Member action menu (admin only) */}
      <Modal visible={!!showMemberMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setShowMemberMenu(null)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>@{showMemberMenu?.display_name}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { handleTransferAdmin(showMemberMenu); }}
            >
              <Text style={styles.menuItemText}>👑 Make Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { handleRemoveMember(showMemberMenu); }}
            >
              <Text style={[styles.menuItemText, { color: '#FF3366' }]}>🚫 Remove from Group</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemCancel]} onPress={() => setShowMemberMenu(null)}>
              <Text style={[styles.menuItemText, { color: '#8888AA' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerMenu: { fontSize: 24, color: '#FF3366', fontWeight: '700' },

  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  groupName: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  groupDesc: { fontSize: 14, color: '#8888AA', marginBottom: 16 },

  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  inviteCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1C1C28', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2A2A3A',
  },
  inviteLabel: { fontSize: 11, color: '#8888AA', fontWeight: '700', letterSpacing: 1 },
  inviteCode: { fontSize: 13, color: '#FFFFFF', fontWeight: '800', letterSpacing: 2 },
  adminBadge: { fontSize: 12, fontWeight: '800', color: '#FFB300', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#12121A', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2A2A3A',
  },
  statLabel: { fontSize: 10, color: '#8888AA', letterSpacing: 1, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },

  challengesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#12121A', borderRadius: 16, padding: 18, marginBottom: 28,
    borderWidth: 1, borderColor: '#FF3366',
  },
  challengesBtnIcon: { fontSize: 28 },
  challengesBtnTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  challengesBtnSub: { fontSize: 12, color: '#8888AA', marginTop: 2 },
  challengesBtnArrow: { fontSize: 22, color: '#FF3366' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  sectionCount: { fontSize: 12, color: '#8888AA', fontWeight: '600' },

  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#12121A', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#2A2A3A', gap: 12,
  },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  memberName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  crownBadge: { fontSize: 14 },
  memberStreak: { fontSize: 11, color: '#8888AA', letterSpacing: 0.5 },
  memberPerf: { alignItems: 'flex-end', gap: 4 },
  memberPerfText: { fontSize: 12, fontWeight: '600' },
  memberMenuDot: { fontSize: 18, color: '#8888AA' },

  emptyFeed: { color: '#555570', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  eventRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  eventIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  eventIconText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  eventContent: { flex: 1 },
  eventType: { fontSize: 11, fontWeight: '800', color: '#FF3366', letterSpacing: 1, marginBottom: 3 },
  eventText: { fontSize: 13, color: '#C0C0D0', lineHeight: 18 },
  eventTime: { fontSize: 10, color: '#555570', marginTop: 2 },

  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF3366', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF3366', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },

  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  menuCard: {
    backgroundColor: '#12121A', borderRadius: 20, padding: 8,
    borderWidth: 1, borderColor: '#2A2A3A', width: '100%',
  },
  menuTitle: {
    fontSize: 15, fontWeight: '800', color: '#8888AA',
    paddingHorizontal: 16, paddingVertical: 12, letterSpacing: 0.5,
  },
  menuItem: {
    paddingHorizontal: 16, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#2A2A3A',
  },
  menuItemCancel: { borderTopWidth: 2, borderTopColor: '#2A2A3A' },
  menuItemText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
