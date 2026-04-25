import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const c = theme.colors;

function StatRow({ label, value, color }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
  );
}

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
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Profile</Text>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
          {memberSince ? <Text style={styles.memberSince}>Member since {memberSince}</Text> : null}
        </View>

        {/* Lifetime stats */}
        <Text style={styles.sectionTitle}>Lifetime</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{profile?.stakes_completed ?? 0}</Text>
              <Text style={styles.statBoxLabel}>COMPLETED</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxBorder]}>
              <Text style={styles.statBoxValue}>{profile?.stakes_failed ?? 0}</Text>
              <Text style={styles.statBoxLabel}>FAILED</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <StatRow label="Total saved" value={`$${profile?.total_saved ?? 0}`} color={c.success} />
          <View style={styles.rowDivider} />
          <StatRow label="Total lost" value={`$${profile?.total_lost ?? 0}`} color={c.accent} />
          <View style={styles.rowDivider} />
          <StatRow label="Total staked" value={`$${profile?.total_staked ?? 0}`} />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DeadlineMe v1.0</Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  pageTitle: {
    fontSize: 28, fontWeight: '700', color: c.text,
    letterSpacing: -0.8, marginBottom: 20,
  },

  // Avatar card
  avatarCard: {
    backgroundColor: c.surface, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: c.border, alignItems: 'center', marginBottom: 28, gap: 6,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: c.accent },
  displayName: { fontSize: 20, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  email: { fontSize: 13, color: c.textSecondary },
  memberSince: { fontSize: 12, color: c.textTertiary },

  // Section title
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },

  // Stats card
  statsCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', marginBottom: 28,
  },
  statsGrid: { flexDirection: 'row' },
  statBox: {
    flex: 1, padding: 20, alignItems: 'center', gap: 4,
  },
  statBoxBorder: { borderLeftWidth: 1, borderLeftColor: c.border },
  statBoxValue: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -1 },
  statBoxLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: c.textTertiary },
  divider: { height: 1, backgroundColor: c.border },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16,
  },
  rowDivider: { height: 1, backgroundColor: c.border, marginHorizontal: 16 },
  statLabel: { fontSize: 14, color: c.textSecondary },
  statValue: { fontSize: 15, fontWeight: '600', color: c.text },

  // Sign out
  signOutBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: c.accentBorder,
    backgroundColor: c.accentSoft, marginBottom: 16,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: c.accent },

  version: { fontSize: 12, color: c.textDisabled, textAlign: 'center' },
});
