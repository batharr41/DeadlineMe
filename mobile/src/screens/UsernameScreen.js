import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { api } from '../services/api';

export default function UsernameScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null); // null | true | false
  const [saving, setSaving] = useState(false);

  const clean = username.toLowerCase().replace(/[^a-z0-9_.]/g, '');

  const checkAvailability = async (val) => {
    if (val.length < 3) { setAvailable(null); return; }
    setChecking(true);
    try {
      const result = await api.checkUsername(val);
      setAvailable(result.available);
    } catch {
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (val) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(cleaned);
    setAvailable(null);
    if (cleaned.length >= 3) {
      clearTimeout(handleChange._t);
      handleChange._t = setTimeout(() => checkAvailability(cleaned), 500);
    }
  };

  const handleSave = async () => {
    if (!clean || clean.length < 3 || !available) return;
    setSaving(true);
    try {
      await api.updateProfile({ username: clean, display_name: clean });
      navigation.replace('MainTabs');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusColor = available === true ? '#00E676' : available === false ? '#FF3366' : '#8888AA';
  const statusText = checking ? 'Checking...' : available === true ? '✓ Available' : available === false ? '✗ Taken' : clean.length >= 3 ? '' : clean.length > 0 ? 'Min 3 characters' : '';

  const canSave = clean.length >= 3 && available === true && !saving;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>

          <Text style={styles.emoji}>⚡</Text>
          <Text style={styles.title}>Pick your username</Text>
          <Text style={styles.subtitle}>
            This is how your squad sees you. Make it count.
          </Text>

          <View style={styles.inputRow}>
            <Text style={styles.at}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor={theme.colors.textDim}
              value={username}
              onChangeText={handleChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={20}
              selectionColor={theme.colors.accent}
            />
            {checking && <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginLeft: 10 }} />}
          </View>

          {statusText ? (
            <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
          ) : null}

          <Text style={styles.rules}>Letters, numbers, . and _ only · 3–20 chars</Text>

          <TouchableOpacity
            style={[styles.btn, !canSave && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {saving ? 'SAVING...' : 'LOCK IN MY USERNAME →'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.replace('MainTabs')} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  emoji: { fontSize: 56, marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#8888AA', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1C1C28', borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#2A2A3A', marginBottom: 8,
  },
  at: { fontSize: 22, fontWeight: '700', color: '#FF3366', marginRight: 4 },
  input: { flex: 1, fontSize: 22, fontWeight: '700', color: '#FFFFFF', paddingVertical: 18 },
  status: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  rules: { fontSize: 12, color: '#555570', marginBottom: 32, marginLeft: 4 },
  btn: {
    backgroundColor: '#FF3366', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#FF3366', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12,
  },
  btnDisabled: { backgroundColor: '#2A2A3A', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: '#555570', fontSize: 13 },
});
