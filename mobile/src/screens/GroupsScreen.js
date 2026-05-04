import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { api } from '../services/api';

const EVENT_LABELS = {
  stake_created: (p) => `${p?.display_name || 'Someone'} staked $${p?.stake_amount} on ${p?.title}`,
  stake_completed: (p) => `${p?.display_name || 'Someone'} completed ${p?.title}`,
  stake_failed: (p) => `${p?.display_name || 'Someone'} missed ${p?.title}`,
  member_joined: (p) => `${p?.display_name || 'Someone'} joined the group`,
};

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.getMyGroups();
      setGroups(data.groups || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const onRefresh = () => { setRefreshing(true); loadGroups(); };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const result = await api.joinGroup(inviteCode.trim().toUpperCase());
      setShowJoinModal(false);
      setInviteCode('');
      Alert.alert('Joined!', `Welcome to ${result.group.name}`);
      loadGroups();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const isEmpty = groups.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MISSION CONTROL</Text>
        <Text style={styles.headerBell}>&#128276;</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, isEmpty && styles.scrollEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {isEmpty ? (
          /* ---- EMPTY STATE ---- */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIcon}>&#128101;</Text>
            </View>
            <Text style={styles.emptyTitle}>NO GROUPS YET</Text>
            <Text style={styles.emptySubtitle}>Create one or join with an invite code</Text>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('CreateGroup')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>CREATE GROUP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnOutlineText}>JOIN WITH CODE</Text>
            </TouchableOpacity>

            <View style={styles.urgencyCard}>
              <View style={styles.urgencyBar} />
              <View style={styles.urgencyContent}>
                <Text style={styles.urgencyLabel}>URGENCY PROTOCOL</Text>
                <Text style={styles.urgencyText}>
                  Groups increase accountability by 84%. Failure is shared. Success is mandatory.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* ---- GROUPS LIST ---- */
          <View>
            <Text style={styles.listTitle}>Active Groups</Text>
            <Text style={styles.listSubtitle}>CONSEQUENCE NETWORK</Text>

            {groups.map((group) => {
              const event = group.latest_event;
              const label = event
                ? (EVENT_LABELS[event.event_type] || (() => ''))(event.payload)
                : null;

              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupCard}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.groupAccentBar} />
                  <View style={styles.groupCardInner}>
                    <View style={styles.groupCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupMemberCount}>{group.member_count} MEMBERS</Text>
                      </View>
                      <Text style={styles.groupChevron}>›</Text>
                    </View>
                    <View style={styles.groupFeedPreview}>
                      <Text style={styles.groupFeedText} numberOfLines={1}>
                        {label || 'No activity yet'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 16 }} />

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('CreateGroup')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>+ CREATE GROUP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnOutlineText}>JOIN WITH CODE</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </View>
        )}
      </ScrollView>

      {/* JOIN MODAL */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>JOIN WITH CODE</Text>
            <Text style={styles.modalSubtitle}>Enter the 8-character invite code from your squad</Text>
            <TextInput
              style={[styles.modalInput, styles.codeInput]}
              placeholder="AB3X9KQP"
              placeholderTextColor={theme.colors.textDim}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoFocus
              maxLength={8}
            />
            <TouchableOpacity
              style={[styles.btnPrimary, joining && { opacity: 0.5 }]}
              onPress={handleJoin}
              disabled={joining || !inviteCode.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>{joining ? 'JOINING...' : 'JOIN'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowJoinModal(false); setInviteCode(''); }} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.accent, letterSpacing: 1.5 },
  headerBell: { fontSize: 20, color: theme.colors.textMuted },

  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  scrollEmpty: { flexGrow: 1 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 20,
    backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center',
    marginBottom: 28, borderWidth: 1, borderColor: theme.colors.border,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text, letterSpacing: 1, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: theme.colors.text, textAlign: 'center', marginBottom: 36, lineHeight: 20, opacity: 0.7 },

  urgencyCard: {
    flexDirection: 'row', marginTop: 36, width: '100%',
    backgroundColor: theme.colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden',
  },
  urgencyBar: { width: 3, backgroundColor: theme.colors.accent },
  urgencyContent: { flex: 1, padding: 16 },
  urgencyLabel: { fontSize: 11, color: theme.colors.accent, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  urgencyText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },

  // Groups list
  listTitle: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  listSubtitle: { fontSize: 11, color: theme.colors.textMuted, letterSpacing: 1.5, marginBottom: 20 },

  groupCard: {
    flexDirection: 'row', backgroundColor: theme.colors.card,
    borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  groupAccentBar: { width: 3, backgroundColor: theme.colors.accent },
  groupCardInner: { flex: 1, padding: 16 },
  groupCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  groupName: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  groupMemberCount: { fontSize: 11, color: theme.colors.accent, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  groupChevron: { fontSize: 24, color: theme.colors.textDim, lineHeight: 26 },
  groupFeedPreview: {
    backgroundColor: '#0A0A0F', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
  },
  groupFeedText: { fontSize: 12, color: theme.colors.textMuted },

  // Buttons
  btnPrimary: {
    width: '100%', paddingVertical: 18, backgroundColor: theme.colors.accent,
    borderRadius: 10, alignItems: 'center', marginBottom: 12,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  btnOutline: {
    width: '100%', paddingVertical: 18, borderRadius: 10,
    borderWidth: 2, borderColor: theme.colors.accent, alignItems: 'center', marginBottom: 12,
  },
  btnOutlineText: { color: theme.colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: {
    backgroundColor: theme.colors.card, borderRadius: 20,
    padding: 28, borderWidth: 1, borderColor: theme.colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, letterSpacing: 1, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#FFFFFF', marginBottom: 16 },
  modalInput: {
    backgroundColor: theme.colors.inputBg, borderRadius: 12, padding: 16,
    color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16,
  },
  codeInput: {
    fontSize: 26, fontWeight: '800', letterSpacing: 8, textAlign: 'center', color: theme.colors.accent,
  },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelText: { color: '#FFFFFF', fontSize: 14 },
});


