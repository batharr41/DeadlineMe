import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { api } from '../services/api';

function timeLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

export default function GroupChallengesScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [minStake, setMinStake] = useState('5');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);

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

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleCreate = async () => {
    if (!title.trim() || !deadline.trim()) return;
    setCreating(true);
    try {
      // Parse deadline — simple approach: treat as hours from now
      const hours = parseInt(deadline) || 24;
      const deadlineDate = new Date(Date.now() + hours * 3600000);

      await api.createChallenge({
        group_id: groupId,
        title: title.trim(),
        category: 'other',
        deadline: deadlineDate.toISOString(),
        min_stake: parseInt(minStake) || 5,
      });
      setShowCreate(false);
      setTitle('');
      setDeadline('');
      load();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHALLENGES</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Text style={styles.headerAdd}>+ NEW</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.subtitle}>GROUP CHALLENGES</Text>

        {challenges.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>NO CHALLENGES YET</Text>
            <Text style={styles.emptyText}>Create one and dare your squad to join.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowCreate(true)}>
              <Text style={styles.btnPrimaryText}>CREATE CHALLENGE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          challenges.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.challengeCard}
              onPress={() => navigation.navigate('ChallengeDetail', { challengeId: c.id, groupName })}
              activeOpacity={0.75}
            >
              <View style={styles.cardAccent} />
              <View style={styles.cardInner}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <View style={[styles.statusBadge, c.status === 'expired' && styles.statusExpired]}>
                    <Text style={styles.statusText}>{c.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>⏰ {timeLeft(c.deadline)}</Text>
                  <Text style={styles.metaText}>👥 {c.participant_count} joined</Text>
                  <Text style={styles.metaText}>Min ${c.min_stake}</Text>
                </View>
                {c.user_joined && (
                  <View style={styles.joinedBadge}>
                    <Text style={styles.joinedText}>✓ YOU'RE IN</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>NEW CHALLENGE</Text>

            <Text style={styles.modalLabel}>CHALLENGE NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Run 5K this week"
              placeholderTextColor={theme.colors.textDim}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={styles.modalLabel}>DEADLINE (hours from now)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 48"
              placeholderTextColor={theme.colors.textDim}
              value={deadline}
              onChangeText={setDeadline}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>MINIMUM STAKE ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={theme.colors.textDim}
              value={minStake}
              onChangeText={setMinStake}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.btnPrimary, creating && { opacity: 0.5 }]}
              onPress={handleCreate}
              disabled={creating || !title.trim() || !deadline.trim()}
            >
              <Text style={styles.btnPrimaryText}>{creating ? 'CREATING...' : 'CREATE'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  headerAdd: { fontSize: 13, fontWeight: '800', color: '#FF3366', letterSpacing: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  groupName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#8888AA', letterSpacing: 2, marginBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  emptyText: { fontSize: 14, color: '#8888AA', textAlign: 'center' },
  challengeCard: {
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
  statusText: { fontSize: 10, fontWeight: '800', color: '#FF3366', letterSpacing: 0.5 },
  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  metaText: { fontSize: 12, color: '#8888AA' },
  joinedBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,230,118,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)',
  },
  joinedText: { fontSize: 10, fontWeight: '800', color: '#00E676', letterSpacing: 0.5 },
  btnPrimary: {
    backgroundColor: '#FF3366', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#12121A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, borderWidth: 1, borderColor: '#2A2A3A',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1, marginBottom: 20 },
  modalLabel: { fontSize: 11, color: '#8888AA', letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: '#1C1C28', borderRadius: 12, padding: 16,
    color: '#FFFFFF', fontSize: 16, borderWidth: 1,
    borderColor: '#2A2A3A', marginBottom: 16,
  },
  cancelLink: { marginTop: 12, alignItems: 'center' },
  cancelLinkText: { color: '#8888AA', fontSize: 14 },
});
