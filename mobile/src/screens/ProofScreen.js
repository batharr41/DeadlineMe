import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import { api } from '../services/api';
import { cancelStakeReminders } from '../services/notifications';

const c = theme.colors;

export default function ProofScreen({ route, navigation }) {
  const { stake } = route.params;
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Allow access to your photo library to upload proof.');
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
      return Alert.alert('Permission needed', 'Allow camera access to take a proof photo.');
    }
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
      if (res.verified) {
        await cancelStakeReminders(stake.id);
      }
    } catch (err) {
      Alert.alert('Upload failed', 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Result screen
  if (result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{result.verified ? '✅' : '🔄'}</Text>
          <Text style={styles.resultTitle}>
            {result.verified ? 'Proof Verified!' : 'Needs Review'}
          </Text>
          <Text style={styles.resultBody}>{result.reasoning}</Text>
          {result.verified && (
            <View style={styles.refundBadge}>
              <Text style={styles.refundText}>Refund initiated · ${stake.stake_amount ?? stake.stake}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Upload Proof</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          "{stake.title}"
        </Text>

        {/* Image area */}
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

        {/* AI note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>How verification works</Text>
          <Text style={styles.noteBody}>
            AI analyzes your image to confirm it matches your goal. Screenshots, photos, app results — all valid. Takes under 30 seconds.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!image || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!image || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitBtnText}>AI is verifying...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Submit for Verification</Text>
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

  title: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.8, marginBottom: 6 },
  subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 24, fontStyle: 'italic' },

  // Upload area
  uploadArea: {
    backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', marginBottom: 16,
  },
  uploadOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20,
  },
  uploadOptionIcon: { fontSize: 24 },
  uploadOptionText: { fontSize: 16, fontWeight: '500', color: c.text },
  uploadDivider: { height: 1, backgroundColor: c.border },

  // Preview
  previewContainer: { marginBottom: 16, gap: 10 },
  preview: { width: '100%', height: 240, borderRadius: 16 },
  removeBtn: { alignSelf: 'flex-end' },
  removeText: { fontSize: 13, color: c.accent },

  // Note card
  noteCard: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: c.border, gap: 6,
  },
  noteTitle: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  noteBody: { fontSize: 13, color: c.textTertiary, lineHeight: 18 },

  // Submit
  submitBtn: {
    backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  submittingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  // Result
  resultContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 14,
  },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.6 },
  resultBody: { fontSize: 15, color: c.textSecondary, textAlign: 'center', lineHeight: 22 },
  refundBadge: {
    backgroundColor: c.successSoft, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(52,199,89,0.2)',
  },
  refundText: { fontSize: 14, color: c.success, fontWeight: '500' },
  doneBtn: {
    backgroundColor: c.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40,
    marginTop: 8,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
