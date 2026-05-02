import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, getCategoryEmoji } from '../utils/theme';
import { api } from '../services/api';

function formatCountdown(deadline) {
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h remaining`;
  }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function StakeDetailScreen({ route, navigation }) {
  const { stake: initialStake } = route.params;
  const [stake] = useState(initialStake);
  const [countdown, setCountdown] = useState(formatCountdown(initialStake.deadline));
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (stake.status !== 'active') return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(stake.deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [stake]);

  const isExpired = countdown === 'EXPIRED';
  const createdAt = new Date(stake.created_at);
  const minutesSinceCreation = (Date.now() - createdAt) / 60000;
  const inGracePeriod = minutesSinceCreation < 60;

  const handleCancel = () => {
    Alert.alert(
      inGracePeriod ? 'Cancel Stake' : 'Emergency Exit',
      inGracePeriod
        ? "You're within the 60-minute grace period. Cancel for a full refund — your streak is safe."
        : "You're past the grace period. Cancelling now forfeits 50% of your stake to charity and breaks your streak. Continue?",
      [
        { text: 'Never mind', style: 'cancel' },
        {
          text: inGracePeriod ? 'Cancel (Full Refund)' : 'Exit (50% Forfeit)',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await api.cancelStake(stake.id);
              Alert.alert(
                inGracePeriod ? '✓ Cancelled' : '✓ Exited',
                inGracePeriod ? 'Full refund issued.' : '50% refunded, 50% to charity.',
                [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]
              );
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs')} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <Text style={styles.emoji}>{getCategoryEmoji(stake.category)}</Text>
          <Text style={styles.title}>{stake.title}</Text>
          <Text style={styles.deadlineText}>
            {new Date(stake.deadline).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Stake box */}
        <View style={styles.stakeBox}>
          <Text style={styles.stakeLabel}>AT STAKE</Text>
          <Text style={styles.stakeAmount}>${stake.stake_amount}</Text>
          {stake.status === 'active' && (
            <Text style={[styles.countdown, isExpired && styles.countdownExpired]}>
              ⏰ {countdown}
            </Text>
          )}
          {stake.status === 'completed' && <Text style={styles.completedBadge}>✓ COMPLETED</Text>}
          {stake.status === 'failed' && <Text style={styles.failedBadge}>✗ FAILED</Text>}
          {stake.status === 'cancelled' && <Text style={styles.cancelledBadge}>CANCELLED</Text>}
        </View>

        {/* Anti-charity */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>IF YOU FAIL, YOUR ${stake.stake_amount} GOES TO:</Text>
          <Text style={styles.infoValue}>🤲 {stake.anti_charity_name || 'Verified charity'}</Text>
        </View>

        {/* Verdict */}
        {stake.verification_result && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>VERDICT</Text>
            <Text style={styles.infoValue}>{stake.verification_result}</Text>
          </View>
        )}

        {/* Actions — only when active */}
        {stake.status === 'active' && (
          <>
            <TouchableOpacity
              style={styles.proofBtn}
              onPress={() => navigation.navigate('Proof', { stake })}
              activeOpacity={0.8}
            >
              <Text style={styles.proofBtnText}>📸 Upload Proof — I Did It!</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>
                {cancelling
                  ? 'Cancelling...'
                  : inGracePeriod
                  ? '✕  Cancel Stake (Free — Grace Period)'
                  : '✕  Emergency Exit (50% Forfeit)'}
              </Text>
            </TouchableOpacity>

            {inGracePeriod && (
              <Text style={styles.graceNote}>
                Grace period ends in ~{Math.max(0, Math.round(60 - minutesSinceCreation))} min
              </Text>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { padding: 4 },
  backText: { color: '#FF3366', fontSize: 15, fontWeight: '600' },
  closeBtn: { padding: 4 },
  closeText: { color: '#8888AA', fontSize: 18, fontWeight: '600' },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  header: { alignItems: 'center', marginBottom: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  deadlineText: { fontSize: 13, color: '#8888AA' },

  stakeBox: {
    backgroundColor: 'rgba(255,51,102,0.1)',
    borderRadius: 20, padding: 28,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,51,102,0.2)',
  },
  stakeLabel: { fontSize: 11, color: '#8888AA', letterSpacing: 1.5, marginBottom: 6 },
  stakeAmount: { fontSize: 52, fontWeight: '800', color: '#FF3366' },
  countdown: { fontSize: 16, fontWeight: '700', color: '#FFB300', marginTop: 10 },
  countdownExpired: { color: '#FF3366' },
  completedBadge: { fontSize: 14, fontWeight: '800', color: '#00E676', marginTop: 10, letterSpacing: 1 },
  failedBadge: { fontSize: 14, fontWeight: '800', color: '#FF3366', marginTop: 10, letterSpacing: 1 },
  cancelledBadge: { fontSize: 14, fontWeight: '800', color: '#8888AA', marginTop: 10, letterSpacing: 1 },

  infoCard: {
    backgroundColor: '#12121A',
    borderRadius: 14, padding: 16,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#2A2A3A',
  },
  infoLabel: { fontSize: 10, color: '#555570', letterSpacing: 1, marginBottom: 6 },
  infoValue: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },

  proofBtn: {
    backgroundColor: '#00E676',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10, marginTop: 8,
  },
  proofBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },

  cancelBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,51,102,0.3)',
    backgroundColor: 'rgba(255,51,102,0.06)',
    marginBottom: 8,
  },
  cancelBtnText: { color: '#FF3366', fontSize: 14, fontWeight: '700' },

  graceNote: {
    fontSize: 11, color: '#555570',
    textAlign: 'center', fontStyle: 'italic',
  },
});
