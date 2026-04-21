import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, getCategoryEmoji } from '../utils/theme';
import { api } from '../services/api';
import { cancelStakeReminders } from '../services/notifications';

const FREE_CANCEL_WINDOW_MIN = 60;
const EMERGENCY_FORFEIT_PCT = 0.5;

export default function StakeDetailScreen({ route, navigation }) {
  const { stake } = route.params;
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cancelInfo = useMemo(() => {
    const created = stake.createdAt ? new Date(stake.createdAt) : null;
    if (!created || isNaN(created.getTime())) {
      return { freeWindow: false, minutesLeft: 0 };
    }
    const minsSince = (Date.now() - created.getTime()) / 60000;
    const minutesLeft = Math.max(0, FREE_CANCEL_WINDOW_MIN - minsSince);
    return { freeWindow: minutesLeft > 0, minutesLeft: Math.ceil(minutesLeft) };
  }, [stake.createdAt]);

  const stakeAmount = stake.stake ?? stake.stake_amount ?? 0;
  const refundAmount = cancelInfo.freeWindow
    ? stakeAmount
    : Math.round(stakeAmount * (1 - EMERGENCY_FORFEIT_PCT));
  const charityAmount = stakeAmount - refundAmount;

  const handleExit = async () => {
    setCancelling(true);
    try {
      await api.cancelStake(stake.id, !cancelInfo.freeWindow);

      // Cancel any scheduled local notifications for this stake
      await cancelStakeReminders(stake.id);

      setExitModalVisible(false);
      Alert.alert(
        cancelInfo.freeWindow ? 'Stake Cancelled' : 'Emergency Exit',
        cancelInfo.freeWindow
          ? `Your $${stakeAmount} has been refunded.`
          : `$${refundAmount} refunded to your card. $${charityAmount} sent to ${stake.antiCharity || 'your chosen charity'}.`,
        [{ text: 'Back to Dashboard', onPress: () => navigation.navigate('Dashboard') }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to cancel stake');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.emoji}>{getCategoryEmoji(stake.category)}</Text>
          <Text style={styles.title}>{stake.title}</Text>
          <Text style={styles.deadline}>{stake.deadline}</Text>
        </View>

        <View style={styles.stakeBox}>
          <Text style={styles.stakeLabel}>AT STAKE</Text>
          <Text style={styles.stakeAmount}>${stakeAmount}</Text>
          <Text style={styles.timeLeft}>⏰ {stake.timeLeft} remaining</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{stake.progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stake.progress}%` }]} />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>IF YOU MISS IT, YOUR ${stakeAmount} GOES TO:</Text>
          <Text style={styles.infoValue}>🤲 {stake.antiCharity}</Text>
        </View>

        <TouchableOpacity
          style={styles.proofBtn}
          onPress={() => navigation.navigate('Proof', { stake })}
          activeOpacity={0.8}
        >
          <Text style={styles.proofBtnText}>📸 Upload Proof — I Did It!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>Request Check-In From AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exitBtn}
          onPress={() => setExitModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.exitBtnText}>
            {cancelInfo.freeWindow ? `Cancel stake (free • ${cancelInfo.minutesLeft}m left)` : 'Emergency exit'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={exitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !cancelling && setExitModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>
              {cancelInfo.freeWindow ? '🤝' : '⚠️'}
            </Text>
            <Text style={styles.modalTitle}>
              {cancelInfo.freeWindow ? 'Cancel this stake?' : 'Emergency exit'}
            </Text>

            {cancelInfo.freeWindow ? (
              <Text style={styles.modalBody}>
                You're still within the {FREE_CANCEL_WINDOW_MIN}-minute grace window.
                You can cancel now and get your full ${stakeAmount} back.
                {'\n\n'}
                After {cancelInfo.minutesLeft} more minutes, you'll forfeit half your stake to back out.
              </Text>
            ) : (
              <Text style={styles.modalBody}>
                Life happens. You can exit now, but to keep this honest, half your stake goes to charity.
                {'\n\n'}
                <Text style={{ color: theme.colors.success, fontWeight: '700' }}>
                  ${refundAmount} refunded
                </Text>
                {'  •  '}
                <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>
                  ${charityAmount} to {stake.antiCharity || 'your charity'}
                </Text>
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setExitModalVisible(false)}
                disabled={cancelling}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  !cancelInfo.freeWindow && styles.modalConfirmBtnDanger,
                  cancelling && { opacity: 0.6 },
                ]}
                onPress={handleExit}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {cancelInfo.freeWindow ? 'Cancel & Refund' : `Exit & Forfeit $${charityAmount}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  back: { color: theme.colors.textMuted, fontSize: 14, marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  deadline: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  stakeBox: {
    backgroundColor: theme.colors.accentDim, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,51,102,0.2)',
  },
  stakeLabel: { fontSize: 12, color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  stakeAmount: { fontSize: 48, fontWeight: '700', color: theme.colors.accent },
  timeLeft: { fontSize: 13, color: theme.colors.textMuted, marginTop: 8 },
  progressSection: { marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: theme.colors.textMuted },
  progressPercent: { fontSize: 13, color: theme.colors.warning, fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.warning, borderRadius: 4 },
  infoCard: {
    backgroundColor: theme.colors.card, borderRadius: 14, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: theme.colors.border,
  },
  infoLabel: { fontSize: 11, color: theme.colors.textDim, letterSpacing: 0.5, marginBottom: 6 },
  infoValue: { fontSize: 15, color: theme.colors.accent, fontWeight: '600' },
  proofBtn: {
    padding: 16, backgroundColor: theme.colors.success, borderRadius: 14,
    alignItems: 'center', marginBottom: 10,
  },
  proofBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    padding: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: 24,
  },
  secondaryBtnText: { color: theme.colors.textMuted, fontSize: 14 },
  exitBtn: { paddingVertical: 12, alignItems: 'center' },
  exitBtnText: { color: theme.colors.textDim, fontSize: 13, textDecorationLine: 'underline' },

  modalBackdrop: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: theme.colors.card,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  modalEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  modalTitle: {
    fontSize: 20, fontWeight: '700', color: theme.colors.text,
    textAlign: 'center', marginBottom: 12,
  },
  modalBody: {
    fontSize: 14, color: theme.colors.textMuted, lineHeight: 20,
    textAlign: 'center', marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  modalCancelText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.accent, minHeight: 48,
  },
  modalConfirmBtnDanger: { backgroundColor: theme.colors.warning },
  modalConfirmText: { color: '#000', fontSize: 14, fontWeight: '700' },
});