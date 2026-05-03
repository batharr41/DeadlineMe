import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import { api } from '../services/api';

export default function ProofScreen({ route, navigation }) {
  const { stake } = route.params;
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // null | { verified, reasoning, confidence }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll access to upload proof.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera access.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!image) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('proof', {
        uri: image,
        type: 'image/jpeg',
        name: 'proof.jpg',
      });
      const verification = await api.submitProof(stake.id, formData);
      setResult(verification);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit proof. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🔥 I just crushed my goal on DeadlineMe!\n\n✅ "${stake.title}" — DONE.\n💸 $${stake.stake_amount} saved back to my pocket.\n\nNo excuses. No extensions. No mercy.\n\ndeadline-me.vercel.app`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ── Success State ──
  if (result?.verified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          {/* Victory card */}
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>🏆</Text>
            <Text style={styles.successTitle}>MISSION COMPLETE</Text>
            <Text style={styles.successGoal}>{stake.title}</Text>
            <View style={styles.successDivider} />
            <Text style={styles.successLabel}>REFUNDED</Text>
            <Text style={styles.successAmount}>${stake.stake_amount}</Text>
            <Text style={styles.successSub}>Back to your card</Text>
          </View>

          <Text style={styles.reasoningText}>{result.reasoning}</Text>

          {/* Share button */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Text style={styles.shareBtnText}>🔗 Share Your Win</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Rejected State ──
  if (result && !result.verified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={[styles.successCard, styles.failCard]}>
            <Text style={styles.successEmoji}>❌</Text>
            <Text style={[styles.successTitle, { color: '#FF3366' }]}>PROOF REJECTED</Text>
            <Text style={styles.successGoal}>{stake.title}</Text>
            <View style={styles.successDivider} />
            <Text style={styles.reasoningText}>{result.reasoning}</Text>
          </View>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setResult(null); setImage(null); }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Upload State ──
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Upload Proof 📸</Text>
        <Text style={styles.subtitle}>Show AI you completed: "{stake.title}"</Text>

        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
              <Text style={styles.removeText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto} activeOpacity={0.7}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadLabel}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.uploadIcon}>🖼️</Text>
              <Text style={styles.uploadLabel}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How AI verification works:</Text>
          <Text style={styles.infoText}>
            Our AI analyzes your proof image to confirm it matches your stated goal. Most verifications complete in under 30 seconds.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[styles.submitBtn, (!image || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!image || submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? '🤖 AI is verifying...' : '🔥 Submit for Verification'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },

  // Upload state
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  back: { color: '#8888AA', fontSize: 14, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8888AA', marginBottom: 24 },
  previewContainer: { alignItems: 'center', marginBottom: 24 },
  preview: { width: '100%', height: 250, borderRadius: 16, marginBottom: 12 },
  removeBtn: { padding: 8 },
  removeText: { color: '#FF3366', fontSize: 14 },
  uploadOptions: { gap: 12, marginBottom: 24 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, backgroundColor: '#12121A', borderRadius: 16,
    borderWidth: 1, borderColor: '#2A2A3A',
  },
  uploadIcon: { fontSize: 28 },
  uploadLabel: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  infoBox: {
    backgroundColor: '#12121A', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2A2A3A',
  },
  infoTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  infoText: { fontSize: 12, color: '#8888AA', lineHeight: 18 },
  submitBtn: {
    padding: 16, backgroundColor: '#FF3366', borderRadius: 14, alignItems: 'center',
    shadowColor: '#FF3366', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  submitBtnDisabled: { backgroundColor: '#2A2A3A', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Success / fail state
  successContainer: {
    flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32,
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: '#12121A', borderRadius: 24, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)',
    marginBottom: 24,
    shadowColor: '#00E676', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 20,
  },
  failCard: {
    borderColor: 'rgba(255,51,102,0.3)',
    shadowColor: '#FF3366',
  },
  successEmoji: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#00E676', letterSpacing: 2, marginBottom: 8 },
  successGoal: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  successDivider: { width: '100%', height: 1, backgroundColor: '#2A2A3A', marginBottom: 20 },
  successLabel: { fontSize: 11, color: '#8888AA', letterSpacing: 2, marginBottom: 6 },
  successAmount: { fontSize: 48, fontWeight: '900', color: '#00E676', marginBottom: 4 },
  successSub: { fontSize: 13, color: '#8888AA' },
  reasoningText: { fontSize: 13, color: '#8888AA', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  shareBtn: {
    backgroundColor: '#FF3366', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#FF3366', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12,
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  doneBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2A3A',
  },
  doneBtnText: { color: '#8888AA', fontSize: 14, fontWeight: '600' },
  retryBtn: {
    backgroundColor: '#1A1A25', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#2A2A3A',
  },
  retryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
