import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const c = theme.colors;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'You';
  const email = profile?.email || user?.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
    : '';

  const completed = profile?.stakes_completed ?? 0;
  const failed = profile?.stakes_failed ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.bolt}>⚡</Text>
          <Text style={styles.wordmark}>DEADLINEME</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
          {memberSince ? <Text style={styles.memberSince}>MEMBER SINCE {memberSince}</Text> : null}
        </View>

        {/* Completed / Failed */}
        <View style={styles.missionGrid}>
          <View style={[styles.missionCard, styles.missionCardSuccess]}>
            <View style={styles.missionHeader}>
              <Text style={styles.missionCardLabel}>COMPLETED</Text>
              <Text style={styles.missionCheck}>✓</Text>
            </View>
            <Text style={styles.missionNumber}>{String(completed).padStart(2, '0')}</Text>
            <Text style={styles.missionSub}>Missions{'\n'}Succeeded</Text>
          </View>
          <View style={[styles.missionCard, styles.missionCardFail]}>
            <View style={styles.missionHeader}>
              <Text style={styles.missionCardLabelFail}>FAILED</Text>
              <Text style={styles.missionX}>✗</Text>
            </View>
            <Text style={styles.missionNumber}>{String(failed).padStart(2, '0')}</Text>
            <Text style={styles.missionSub}>Consequences{'\n'}Met</Text>
          </View>
        </View>

        {/* Financial audit */}
        <Text style={styles.auditTitle}>FINANCIAL AUDIT</Text>

        <View style={styles.auditCard}>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Total Staked</Text>
            <Text style={styles.auditValue}>${profile?.total_staked ?? 0}</Text>
          </View>
          <View style={styles.auditDivider} />
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Total Saved</Text>
            <Text style={[styles.auditValue, { color: c.success }]}>${profile?.total_saved ?? 0}</Text>
          </View>
          <View style={styles.auditDivider} />
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Total Lost</Text>
            <Text style={[styles.auditValue, { color: c.accent }]}>${profile?.total_lost ?? 0}</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutIcon}>→</Text>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  bolt: { fontSize: 18, color: c.accent },
  wordmark: { fontSize: 18, fontWeight: '700', color: c.accent, letterSpacing: 2 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 6 },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: c.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: c.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: c.accent },
  displayName: { fontSize: 20, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  email: { fontSize: 13, color: c.textSecondary },
  memberSince: { fontSize: 10, fontWeight: '600', color: c.textTertiary, letterSpacing: 1.5, marginTop: 2 },

  // Mission grid
  missionGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  missionCard: {
    flex: 1, borderRadius: 14, padding: 16,
    borderWidth: 1, gap: 4,
  },
  missionCardSuccess: { backgroundColor: 'rgba(52,199,89,0.08)', borderColor: 'rgba(52,199,89,0.25)' },
  missionCardFail: { backgroundColor: 'rgba(255,45,85,0.08)', borderColor: 'rgba(255,45,85,0.2)' },
  missionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  missionCardLabel: { fontSize: 10, fontWeight: '700', color: c.success, letterSpacing: 1 },
  missionCardLabelFail: { fontSize: 10, fontWeight: '700', color: c.accent, letterSpacing: 1 },
  missionCheck: { fontSize: 16, color: c.success },
  missionX: { fontSize: 16, color: c.accent },
  missionNumber: { fontSize: 36, fontWeight: '700', color: c.text, letterSpacing: -1 },
  missionSub: { fontSize: 11, color: c.textTertiary, lineHeight: 16 },

  // Audit
  auditTitle: { fontSize: 11, fontWeight: '700', color: c.textTertiary, letterSpacing: 1.5, marginBottom: 10 },
  auditCard: {
    backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', marginBottom: 20,
  },
  auditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  auditDivider: { height: 1, backgroundColor: c.border },
  auditLabel: { fontSize: 14, color: c.textSecondary },
  auditValue: { fontSize: 16, fontWeight: '700', color: c.text },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 15,
    backgroundColor: 'rgba(255,45,85,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,45,85,0.25)',
  },
  signOutIcon: { fontSize: 14, color: c.accent, fontWeight: '700' },
  signOutText: { fontSize: 13, fontWeight: '700', color: c.accent, letterSpacing: 1.5 },
});
