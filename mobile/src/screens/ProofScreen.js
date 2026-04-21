import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import { api } from '../services/api';
import { cancelStakeReminders } from '../services/notifications';

export default function ProofScreen({ route, navigation }) {
  const { stake } = route.params;
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll access to upload proof.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera access to take a proof photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      const filename = image.uri.split('/').pop() || 'proof.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('proof', {
        uri: image.uri,
        name: filename,
        type,
      });

      const result = await api.submitProof(stake.id, formData);
      const stakeAmount = stake.stake || stake.stake_amount;

      if (result.verified) {
        // Stake is done — cancel any pending deadline reminders
        await cancelStakeReminders(stake.id);

        Alert.alert(
          '✅ Proof Verified!',
          `${result.reasoning}\n\n$${stakeAmount} has been refunded to your card.`,
          [{ text: 'Back to Dashboard', onPress: () => navigation.navigate('Dashboard') }]
        );
      } else {
        Alert.alert(
          '🤔 Not Quite',
          `AI says: "${result.reasoning}"\n\nYour stake is still active. Try uploading clearer proof.`,
          [
            { text: 'Try Again', onPress: () => setImage(null) },
            { text: 'Back', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit proof. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={styles.back}>← Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Upload Proof 📸</Text>
        <Text style={styles.subtitle}>
          Show AI you completed: "{stake.title}"
        </Text>

        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image.uri }} style={styles.preview} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setImage(null)}
              disabled={submitting}
            >
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
            Our AI analyzes your proof image to confirm it matches your stated goal.
            It checks for relevance, recency, and authenticity. Most verifications
            complete in under 30 seconds.
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
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  back: { color: theme.colors.textMuted, fontSize: 14, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 24 },
  previewContainer: { alignItems: 'center', marginBottom: 24 },
  preview: { width: '100%', height: 250, borderRadius: 16, marginBottom: 12 },
  removeBtn: { padding: 8 },
  removeText: { color: theme.colors.accent, fontSize: 14 },
  uploadOptions: { gap: 12, marginBottom: 24 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, backgroundColor: theme.colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  uploadIcon: { fontSize: 28 },
  uploadLabel: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  infoBox: {
    backgroundColor: theme.colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  infoTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  infoText: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  submitBtn: {
    padding: 16, backgroundColor: theme.colors.accent, borderRadius: 14, alignItems: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  submitBtnDisabled: { backgroundColor: theme.colors.border, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});