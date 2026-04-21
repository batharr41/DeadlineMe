import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'You';
  const email = profile?.email || user?.email || '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar + name */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🔥</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
          {profile?.created_at && (
            <Text style={styles.memberSince}>
              Member since {formatDate(profile.created_at)}
            </Text>
          )}
        </View>

        {/* Lifetime summary */}
        <Text style={styles.sectionTitle}>Lifetime</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile?.stakes_completed || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile?.stakes_failed || 0}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              ${profile?.total_saved || 0}
            </Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              ${profile?.total_lost || 0}
            </Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>DeadlineMe v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },

  avatarCard: {
    alignItems: 'center', paddingVertical: 24, marginBottom: 24,
    backgroundColor: theme.colors.card, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 32 },
  name: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  email: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  memberSince: { fontSize: 12, color: theme.colors.textDim, marginTop: 8 },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: theme.colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginBottom: 32,
  },
  statBox: {
    width: '47.5%',
    backgroundColor: theme.colors.card, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: theme.colors.border,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  statLabel: {
    fontSize: 11, color: theme.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4,
  },

  signOutBtn: {
    padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.accent,
    alignItems: 'center',
    marginBottom: 24,
  },
  signOutText: { color: theme.colors.accent, fontSize: 15, fontWeight: '600' },

  footer: {
    fontSize: 11, color: theme.colors.textDim,
    textAlign: 'center', marginTop: 8,
  },
});
