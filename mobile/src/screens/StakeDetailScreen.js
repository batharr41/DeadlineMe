import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, getCategoryEmoji, CHARITY_CATEGORIES } from '../utils/theme';
import { api } from '../services/api';
import { cancelStakeReminders } from '../services/notifications';

const c = theme.colors;

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export default function StakeDetailScreen({ route, navigation }) {
  const { stakeId, stake: initialStake } = route.params;
  const [stake, setStake] = useState(initialStake || null);
  const [loading, setLoading] = useState(!initialStake);
  const [exitModal, setExitModal] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (stakeId && !initialStake) {
      api.getStake(stakeId)
        .then(setStake)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [stakeId]);

  if (!stake && loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: c.textTertiary }}>Loading...</Text>
      </View>
    );
  }

  const isActive = stake?.status === 'active';
  const isCompleted = stake?.status === 'completed';
  const charity = CHARITY_CATEGORIES.find(ch => ch.id === stake?.anti_charity_id);

  const handleEmergencyExit = async (emergency) => {
    setExiting(true);
    try {
      await api.cancelStake(stake.id || stakeId, emergency);
      await cancelStakeReminders(stake.id || stakeId);
      setExitModal(false);
      navigation.navigate('MainTabs');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setExiting(false);
    }
  };

  const minutesSinceCreation = stake?.created_at
    ? (Date.now() - new Date(stake.created_at).getTime()) / 60000
    : 999;
  const inGracePeriod = minutesSinceCreation < 60;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          {isActive && (
            <TouchableOpacity onPress={() => setExitModal(true)}>
              <Text style={styles.exitText}>Exit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroEmoji}>
            <Text style={{ fontSize: 32 }}>{getCategoryEmoji(stake?.category)}</Text>
          </View>
          <Text style={styles.heroTitle}>{stake?.title}</Text>
          <Text style={styles.heroDeadline}>{stake?.deadline || 'No deadline set'}</Text>
        </View>

        {/* Stake amount */}
        <View style={[styles.amountCard, isActive ? styles.amountCardActive : styles.amountCardInactive]}>
          <Text style={styles.amountLabel}>
            {isCompleted ? 'REFUNDED' : isActive ? 'AT STAKE' : 'LOST'}
          </Text>
          <Text style={[
            styles.amountValue,
            { color: isCompleted ? c.success : isActive ? c.text : c.accent }
          ]}>
            ${stake?.stake_amount ?? stake?.stake ?? 0}
          </Text>
          {isActive && stake?.timeLeft && (
            <Text style={styles.amountTimeLeft}>{stake.timeLeft} remaining</Text>
          )}
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <InfoRow label="Status" value={
            isCompleted ? '✓ Completed' :
            isActive ? '● Active' :
            stake?.status === 'failed' ? '✗ Failed' : stake?.status
          } valueColor={
            isCompleted ? c.success :
            isActive ? c.warning :
            c.accent
          } />
          <View style={styles.infoRowDivider} />
          <InfoRow label="Charity" value={`${charity?.icon ?? '🤲'} ${charity?.name ?? stake?.anti_charity_name ?? '—'}`} />
          {stake?.verification_result && (
            <>
              <View style={styles.infoRowDivider} />
              <InfoRow label="Verification" value={stake.verification_result} />
            </>
          )}
        </View>

        {/* Actions */}
        {isActive && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Proof', { stake })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>📸  Upload Proof</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Exit modal */}
      <Modal visible={exitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Exit this stake?</Text>

            {inGracePeriod ? (
              <>
                <Text style={styles.modalBody}>
                  You're within the 60-minute grace period. You can cancel for a full refund.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => handleEmergencyExit(false)}
                  disabled={exiting}
                >
                  <Text style={styles.modalPrimaryBtnText}>{exiting ? 'Cancelling...' : 'Cancel — Full Refund'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalBody}>
                  The grace period has passed. Exiting now forfeits 50% of your stake to charity.
                </Text>
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentBorder }]}
                  onPress={() => handleEmergencyExit(true)}
                  disabled={exiting}
                >
                  <Text style={[styles.modalPrimaryBtnText, { color: c.accent }]}>
                    {exiting ? 'Processing...' : `Exit — Forfeit 50%`}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setExitModal(false)}>
              <Text style={styles.modalCancelText}>Keep going</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
  },
  backText: { fontSize: 15, color: c.textSecondary },
  exitText: { fontSize: 14, color: c.textTertiary },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  heroEmoji: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.5, textAlign: 'center' },
  heroDeadline: { fontSize: 13, color: c.textTertiary },

  // Amount card
  amountCard: {
    borderRadius: 16, padding: 24, alignItems: 'center',
    marginBottom: 16, borderWidth: 1,
  },
  amountCardActive: { backgroundColor: c.surface, borderColor: c.border },
  amountCardInactive: { backgroundColor: c.surface, borderColor: c.border, opacity: 0.7 },
  amountLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, color: c.textTertiary, marginBottom: 8 },
  amountValue: { fontSize: 52, fontWeight: '700', letterSpacing: -2 },
  amountTimeLeft: { fontSize: 12, color: c.warning, marginTop: 8, fontWeight: '500' },

  // Info card
  infoCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16,
  },
  infoRowDivider: { height: 1, backgroundColor: c.border },
  infoLabel: { fontSize: 13, color: c.textTertiary },
  infoValue: { fontSize: 13, fontWeight: '500', color: c.textSecondary, maxWidth: '60%', textAlign: 'right' },

  // Actions
  actions: { gap: 10 },
  primaryBtn: {
    backgroundColor: c.success, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end', padding: 20,
  },
  modalCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: c.border, gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  modalBody: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
  modalPrimaryBtn: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalPrimaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalCancelBtn: { paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: c.textTertiary },
});
