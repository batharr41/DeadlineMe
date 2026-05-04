import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { theme } from '../utils/theme';
import { api } from '../services/api';

function timeLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} left`;
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function getAvatarColor(name = '') {
  const colors = ['#FF3366', '#FF6B35', '#9B59B6', '#3498DB', '#2ECC71'];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function ChallengeDetailScreen({ route, navigation }) {
  const { challengeId, groupName } = route.params;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [countdown, setCountdown] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.getChallenge(challengeId);
      setChallenge(data);
      setCountdown(timeLeft(data.deadline));
    } catch (err) {
      Alert.alert('Error', 'Failed to load challenge');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!challenge) return;
    const interval = setInterval(() => setCountdown(timeLeft(challenge.deadline)), 1000);
    return () => clearInterval(interval);
  }, [challenge]);

  const handleAccept = async () => {
    if (!challenge) return;
    setAccepting(true);
    try {
      // 1. Create payment sheet at the min stake amount (same as regular stake)
      const { clientSecret, paymentIntentId } = await api.createPaymentSheet(challenge.min_stake);

      // 2. Init Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'DeadlineMe',
        style: 'alwaysDark',
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        setAccepting(false);
        return;
      }

      // 3. Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment failed', paymentError.message);
        }
        setAccepting(false);
        return;
      }

      // 4. Payment succeeded — create the stake linked to the challenge
      await api.joinChallengeWithStake(challengeId, {
        payment_intent_id: paymentIntentId,
        stake_amount: challenge.min_stake,
      });

      Alert.alert(
        '🏆 You\'re In!',
        `$${challenge.min_stake} staked on "${challenge.title}". Upload proof before the deadline or lose it.`,
        [{ text: 'Got it', onPress: () => load() }]
      );

    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!challenge) return null;

  const isExpired = countdown === 'EXPIRED';
  const participants = challenge.participants || [];
  const totalStaked = challenge.total_staked || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHALLENGE</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.accent} />}
      >
        <Text style={styles.groupLabel}>{groupName}</Text>
        <Text style={styles.title}>{challenge.title}</Text>
        {challenge.description ? <Text style={styles.description}>{challenge.description}</Text> : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TIME LEFT</Text>
            <Text style={[styles.statValue, { fontSize: 18 }, isExpired && { color: '#8888AA' }]}>
              {countdown}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>POOL</Text>
            <Text style={[styles.statValue, { color: '#FF3366' }]}>${totalStaked}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>PARTICIPANTS</Text>
            <Text style={styles.statValue}>{participants.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>STAKE TO JOIN</Text>
            <Text style={[styles.statValue, { color: '#FFB300' }]}>${challenge.min_stake}</Text>
          </View>
        </View>

        {/* How it works callout */}
        {!challenge.user_joined && !isExpired && (
          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>HOW IT WORKS</Text>
            <Text style={styles.howText}>
              Stake ${challenge.min_stake} to join. Complete the challenge and upload proof before the deadline — AI verifies it and you get your money back. Fail and your stake goes to charity.
            </Text>
          </View>
        )}

        {/* Accept button — one tap, goes straight to Stripe */}
        {!challenge.user_joined && !isExpired && (
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
            onPress={handleAccept}
            disabled={accepting}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptBtnTitle}>
              {accepting ? 'PROCESSING...' : '🏆 ACCEPT CHALLENGE'}
            </Text>
            <Text style={styles.acceptBtnSub}>
              {accepting ? 'Opening payment...' : `Stake $${challenge.min_stake} · Refunded if you complete it`}
            </Text>
          </TouchableOpacity>
        )}

        {challenge.user_joined && (
          <View style={styles.joinedBanner}>
            <Text style={styles.joinedBannerIcon}>✓</Text>
            <View>
              <Text style={styles.joinedBannerTitle}>YOU'VE ACCEPTED THIS CHALLENGE</Text>
              <Text style={styles.joinedBannerSub}>Upload proof on your stake before the deadline</Text>
            </View>
          </View>
        )}

        {/* Participants leaderboard */}
        <Text style={styles.sectionTitle}>
          SQUAD STATUS ({participants.length})
        </Text>

        {participants.length === 0 ? (
          <View style={styles.emptyParticipants}>
            <Text style={styles.emptyIcon}>👀</Text>
            <Text style={styles.emptyText}>No one has joined yet. Be first.</Text>
          </View>
        ) : (
          participants.map((p, i) => {
            const statusColor = p.status === 'completed' ? '#00E676' : p.status === 'failed' ? '#FF3366' : '#FFB300';
            const statusLabel = p.status === 'completed' ? '✓ DONE' : p.status === 'failed' ? '✗ FAILED' : '⏳ ACTIVE';
            return (
              <View key={p.user_id} style={styles.participantRow}>
                <Text style={styles.rank}>#{i + 1}</Text>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(p.display_name) }]}>
                  <Text style={styles.avatarText}>{getInitials(p.display_name)}</Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{p.display_name.toUpperCase()}</Text>
                  <Text style={styles.participantStreak}>🔥 {p.streak} day streak</Text>
                </View>
                <View style={styles.participantRight}>
                  <Text style={styles.participantStake}>${p.stake_amount}</Text>
                  <Text style={[styles.participantStatus, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
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

  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  groupLabel: { fontSize: 11, color: '#8888AA', letterSpacing: 2, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  description: { fontSize: 14, color: '#8888AA', marginBottom: 20, lineHeight: 20 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#12121A', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#2A2A3A',
  },
  statLabel: { fontSize: 10, color: '#8888AA', letterSpacing: 1, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },

  howItWorks: {
    backgroundColor: '#12121A', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2A2A3A', marginTop: 8, marginBottom: 4,
  },
  howTitle: { fontSize: 11, color: '#8888AA', letterSpacing: 1.5, marginBottom: 8 },
  howText: { fontSize: 13, color: '#C0C0D0', lineHeight: 20 },

  // One-tap accept button
  acceptBtn: {
    backgroundColor: '#FF3366', borderRadius: 16, padding: 20,
    alignItems: 'center', marginTop: 16, marginBottom: 8,
    shadowColor: '#FF3366', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16,
  },
  acceptBtnTitle: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  acceptBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  joinedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 14, padding: 16,
    marginTop: 16, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)',
  },
  joinedBannerIcon: { fontSize: 22, color: '#00E676' },
  joinedBannerTitle: { fontSize: 13, fontWeight: '800', color: '#00E676', letterSpacing: 0.5 },
  joinedBannerSub: { fontSize: 12, color: '#8888AA', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 28, marginBottom: 14 },

  emptyParticipants: { paddingVertical: 32, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: '#555570', fontSize: 13 },

  participantRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#12121A',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#2A2A3A', gap: 12,
  },
  rank: { fontSize: 13, fontWeight: '800', color: '#8888AA', width: 24 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  participantStreak: { fontSize: 11, color: '#8888AA' },
  participantRight: { alignItems: 'flex-end', gap: 4 },
  participantStake: { fontSize: 15, fontWeight: '800', color: '#FF3366' },
  participantStatus: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
