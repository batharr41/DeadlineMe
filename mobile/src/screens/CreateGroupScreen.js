import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { api } from '../services/api';

export default function CreateGroupScreen({ navigation }) {
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setSubmitting(true);
    try {
      await api.createGroup({ name: groupName.trim(), description: groupDesc.trim() || null });
      navigation.navigate('MainTabs');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CREATE GROUP</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Name Your Squad</Text>
          <Text style={styles.subtitle}>
            Your squad name sets the tone. Make it something your crew will take seriously.
          </Text>

          <Text style={styles.label}>SQUAD NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Enforcers"
            placeholderTextColor={theme.colors.textDim}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={60}
            autoFocus
            selectionColor={theme.colors.accent}
          />

          <Text style={styles.label}>DESCRIPTION <Text style={styles.optional}>(OPTIONAL)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this group about?"
            placeholderTextColor={theme.colors.textDim}
            value={groupDesc}
            onChangeText={setGroupDesc}
            maxLength={200}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            selectionColor={theme.colors.accent}
          />

          <View style={styles.urgencyCard}>
            <View style={styles.urgencyBar} />
            <View style={styles.urgencyContent}>
              <Text style={styles.urgencyLabel}>URGENCY PROTOCOL</Text>
              <Text style={styles.urgencyText}>
                Groups increase accountability by 84%. Failure is shared. Success is mandatory.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.btn, (!groupName.trim() || submitting) && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={!groupName.trim() || submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{submitting ? 'CREATING...' : 'CREATE GROUP'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  cancel: { color: theme.colors.textMuted, fontSize: 15, width: 60 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.accent, letterSpacing: 1.5 },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text, marginBottom: 10 },
  subtitle: { fontSize: 14, color: theme.colors.text, lineHeight: 20, marginBottom: 36, opacity: 0.7 },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  optional: { color: theme.colors.textDim, fontWeight: '400' },
  input: {
    backgroundColor: '#1C1C28',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  textArea: { height: 90 },
  urgencyCard: {
    flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginTop: 8,
  },
  urgencyBar: { width: 3, backgroundColor: theme.colors.accent },
  urgencyContent: { flex: 1, padding: 16 },
  urgencyLabel: { fontSize: 11, color: theme.colors.accent, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  urgencyText: { fontSize: 13, color: '#FFFFFF', lineHeight: 20 },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12 },
  btn: {
    backgroundColor: theme.colors.accent, borderRadius: 12,
    paddingVertical: 18, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
