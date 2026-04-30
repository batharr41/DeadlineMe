import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import { api } from '../services/api';
import { cancelStakeReminders } from '../services/notifications';

const c = theme.colors;

function SuccessState({ stake, result, onDone }) {
  const amount = stake.stake_amount ?? stake.stake ?? 0;
  return (
    <View style={styles.resultContainer}>
      <View style={styles.successIconWrap}>
        <Text style={styles.resultEmoji}>✓</Text>
      </View>
      <Text style={styles.successTitle}>You kept your word.</Text>
      <Text style={styles.successSubtitle}>{result.reasoning}</Text>

      <View style={styles.refundCard}>
        <Text style={styles.refundLabel}>REFUND INITIATED</Text>
        <Text style={styles.refundAmount}>${amount}</Text>
        <Text style={styles.refundSub}>Back to your card in 3–5 days</Text>
      </View>

      <Text style={styles.successMotivation}>
        That's what follow-through looks like. 🔥
      </Text>

      <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
        <Text style={styles.doneBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

function FailureState({ stake, result, onDone }) {
  const amount = stake.stake_amount ?? stake.stake ?? 0;
  const charity = stake.anti_charity_name || 'your chosen charity';
  return (
    <View style={styles.resultContainer}>
      <View style={styles.failureIconWrap}>
        <Text style={styles.resultEmoji}>✗</Text>
      </View>
      <Text style={styles.failureTitle}>Not verified.</Text>
      <Text style={styles.failureSubtitle}>{result.reasoning}</Text>

      <View style={styles.tryAgainCard}>
        <Text style={styles.tryAgainText}>Upload clearer proof or your deadline will expire and ${amount} goes to {charity}.</Text>
      </View>

      <TouchableOpacity style={styles.retryBtn} onPress={onDone}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProofScreen({ route, navigation }) {
  const { stake } = route.params;
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Allow access to your photo library.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Allow camera access.');
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!image) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('proof', { uri: image, type: 'image/jpeg', name: 'proof.jpg' });
      const res = await api.submitProof(stake.id, formData);
      setResult(res);
      if (res.verified) await cancelStakeReminders(stake.id);
    } catch (err) {
      Alert.alert('Upload failed', 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.verified) {
    return (
      <SafeAreaView style={styles.container}>
        <SuccessState
          stake={stake}
          result={result}
          onDone={() => navigation.navigate('MainTabs')}
        />
      </SafeAreaView>
    );
  }

  if (result && !result.verified) {
    return (
      <SafeAreaView style={styles.container}>
        <FailureState
          stake={stake}
          result={result}
          onDone={() => setResult(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Prove It.</Text>
        <Text style={styles.subtitle} numberOfLines={2}>"{stake.title}"</Text>

        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadArea}>
            <TouchableOpacity style={styles.uploadOption} onPress={takePhoto} activeOpacity={0.7}>
              <Text style={styles.uploadOptionIcon}>📷</Text>
              <Text style={styles.uploadOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <View style={styles.uploadDivider} />
            <TouchableOpacity style={styles.uploadOption} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.uploadOptionIcon}>🖼️</Text>
              <Text style={styles.uploadOptionText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>How verification works</Text>
          <Text style={styles.noteBody}>
            AI reviews your image against your goal. Screenshots, photos, results — all valid. Under 30 seconds.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[styles.submitBtn, (!image || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!image || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitBtnText}>Verifying...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Submit Proof</Text>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 24 },

  topBar: { paddingVertical: 12 },
  backText: { fontSize: 15, color: c.textSecondary },
  title: { fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -1, marginBottom: 6 },
  subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 24, fontStyle: 'italic' },

  uploadArea: {
    backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', marginBottom: 16,
  },
  uploadOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  uploadOptionIcon: { fontSize: 24 },
  uploadOptionText: { fontSize: 16, fontWeight: '500', color: c.text },
  uploadDivider: { height: 1, backgroundColor: c.border },

  previewContainer: { marginBottom: 16, gap: 10 },
  preview: { width: '100%', height: 240, borderRadius: 16 },
  removeBtn: { alignSelf: 'flex-end' },
  removeText: { fontSize: 13, color: c.accent },

  noteCard: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: c.border, gap: 6,
  },
  noteTitle: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  noteBody: { fontSize: 13, color: c.textTertiary, lineHeight: 18 },

  submitBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submittingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  // Success state
  resultContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, gap: 16,
  },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderWidth: 2, borderColor: 'rgba(52,199,89,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  failureIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: c.accentSoft,
    borderWidth: 2, borderColor: c.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  resultEmoji: { fontSize: 36, fontWeight: '700', color: c.text },
  successTitle: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.8, textAlign: 'center' },
  successSubtitle: { fontSize: 15, color: c.textSecondary, textAlign: 'center', lineHeight: 22 },
  failureTitle: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.8, textAlign: 'center' },
  failureSubtitle: { fontSize: 15, color: c.textSecondary, textAlign: 'center', lineHeight: 22 },

  refundCard: {
    backgroundColor: 'rgba(52,199,89,0.08)', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(52,199,89,0.2)', alignItems: 'center', gap: 4, width: '100%',
  },
  refundLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: c.success },
  refundAmount: { fontSize: 40, fontWeight: '700', color: c.success, letterSpacing: -1 },
  refundSub: { fontSize: 12, color: c.textTertiary },

  successMotivation: { fontSize: 14, color: c.textTertiary, textAlign: 'center' },

  tryAgainCard: {
    backgroundColor: c.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: c.border, width: '100%',
  },
  tryAgainText: { fontSize: 14, color: c.textSecondary, lineHeight: 20, textAlign: 'center' },

  doneBtn: {
    backgroundColor: c.accent, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  retryBtn: {
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center',
  },
  retryBtnText: { color: c.text, fontSize: 16, fontWeight: '600' },
});
