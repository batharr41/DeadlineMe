import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../utils/theme';
import { api } from '../services/api';

const defaultDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 0, 0);
  return d;
};

const formatDeadline = (d) => {
  if (!d) return '';
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

const STAKE_OPTIONS = [5, 10, 25, 50];

export default function CreateChallengeScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [tempDate, setTempDate] = useState(defaultDeadline());
  const [minStake, setMinStake] = useState(10);
  const [creating, setCreating] = useState(false);

  const canCreate = title.trim().length > 0 && deadline > new Date();

  const openDatePicker = () => {
    setTempDate(deadline);
    setPickerMode('date');
    setShowDatePicker(true);
  };

  const handlePickerChange = (event, selected) => {
    if (selected) setTempDate(selected);
  };

  const confirmDate = () => {
    setDeadline(tempDate);
    setShowDatePicker(false);
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      await api.createChallenge({
        group_id: groupId,
        title: title.trim(),
        description: description.trim() || null,
        category: 'other',
        deadline: deadline.toISOString(),
        min_stake: minStake,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NEW CHALLENGE</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={styles.groupLabel}>{groupName}</Text>
          <Text style={styles.title}>Dare Your Squad</Text>
          <Text style={styles.subtitle}>Create a shared goal everyone stakes on.</Text>

          {/* Challenge name */}
          <Text style={styles.label}>CHALLENGE NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Run 5K this week"
            placeholderTextColor={theme.colors.textDim}
            value={title}
            onChangeText={setTitle}
            autoFocus
            selectionColor={theme.colors.accent}
          />

          {/* Description */}
          <Text style={styles.label}>DESCRIPTION <Text style={styles.optional}>(OPTIONAL)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What counts as completing this challenge?"
            placeholderTextColor={theme.colors.textDim}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            selectionColor={theme.colors.accent}
          />

          {/* Deadline — same style as NewStakeScreen */}
          <Text style={styles.label}>EXECUTION DEADLINE</Text>
          <TouchableOpacity style={styles.deadlineCard} onPress={openDatePicker} activeOpacity={0.8}>
            <Text style={styles.deadlineValue}>{formatDeadline(deadline)}</Text>
            <Text style={styles.deadlineChange}>CHANGE →</Text>
          </TouchableOpacity>

          {/* Min stake */}
          <Text style={styles.label}>MINIMUM STAKE</Text>
          <Text style={styles.labelSub}>Squad members must stake at least this much to join</Text>
          <View style={styles.stakeRow}>
            {STAKE_OPTIONS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.stakeBtn, minStake === amt && styles.stakeBtnActive]}
                onPress={() => setMinStake(amt)}
              >
                <Text style={[styles.stakeBtnText, minStake === amt && styles.stakeBtnTextActive]}>
                  ${amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary */}
          {canCreate && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>CHALLENGE SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Goal</Text>
                <Text style={styles.summaryValue}>{title}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Deadline</Text>
                <Text style={styles.summaryValue}>{formatDeadline(deadline)}</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryLabel}>Min Stake</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.accent }]}>${minStake}</Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.btn, (!canCreate || creating) && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate || creating}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>
              {creating ? 'CREATING...' : '🏆 LAUNCH CHALLENGE'}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* Date picker modal — same as NewStakeScreen */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            {/* Mode toggle */}
            <View style={styles.pickerToggle}>
              {['date', 'time'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.pickerToggleBtn, pickerMode === mode && styles.pickerToggleBtnActive]}
                  onPress={() => setPickerMode(mode)}
                >
                  <Text style={[styles.pickerToggleText, pickerMode === mode && { color: '#FF3366' }]}>
                    {mode === 'date' ? 'DATE' : 'TIME'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DateTimePicker
              value={tempDate}
              mode={pickerMode}
              display="spinner"
              onChange={handlePickerChange}
              minimumDate={new Date()}
              textColor="#FFFFFF"
              style={{ backgroundColor: '#12121A' }}
            />

            <TouchableOpacity style={styles.pickerConfirm} onPress={confirmDate}>
              <Text style={styles.pickerConfirmText}>NEXT: THE CONSEQUENCE →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2A2A3A',
  },
  cancel: { color: '#8888AA', fontSize: 15, width: 60 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#FF3366', letterSpacing: 1.5 },

  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },

  groupLabel: { fontSize: 11, color: '#8888AA', letterSpacing: 2, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8888AA', lineHeight: 20, marginBottom: 28 },

  label: { fontSize: 11, fontWeight: '700', color: '#8888AA', letterSpacing: 1.5, marginBottom: 8 },
  labelSub: { fontSize: 12, color: '#555570', marginBottom: 10, marginTop: -4 },
  optional: { color: '#444460', fontWeight: '400' },

  input: {
    backgroundColor: '#1C1C28', borderRadius: 12, padding: 16,
    color: '#FFFFFF', fontSize: 16, borderWidth: 1,
    borderColor: '#2A2A3A', marginBottom: 24,
  },
  textArea: { height: 80 },

  // Deadline card — matches NewStakeScreen style
  deadlineCard: {
    backgroundColor: '#1C1C28', borderRadius: 12, padding: 18,
    borderWidth: 1, borderColor: '#2A2A3A', marginBottom: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  deadlineValue: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  deadlineChange: { fontSize: 12, fontWeight: '700', color: '#FF3366', letterSpacing: 0.5 },

  stakeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  stakeBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2A3A', backgroundColor: '#1C1C28',
    alignItems: 'center',
  },
  stakeBtnActive: { borderColor: '#FF3366', backgroundColor: 'rgba(255,51,102,0.1)' },
  stakeBtnText: { fontSize: 18, fontWeight: '700', color: '#8888AA' },
  stakeBtnTextActive: { color: '#FF3366' },

  summaryCard: {
    backgroundColor: '#12121A', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#2A2A3A', marginTop: 8,
  },
  summaryTitle: { fontSize: 11, color: '#8888AA', letterSpacing: 1.5, marginBottom: 14 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2A2A3A',
  },
  summaryLabel: { fontSize: 13, color: '#8888AA' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', maxWidth: '60%', textAlign: 'right' },

  bottomBar: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12 },
  btn: {
    backgroundColor: '#FF3366', borderRadius: 12,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: '#FF3366', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12,
  },
  btnDisabled: { backgroundColor: '#2A2A3A', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  // Date picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  pickerCard: {
    backgroundColor: '#12121A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, borderWidth: 1, borderColor: '#2A2A3A',
  },
  pickerToggle: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2A2A3A',
  },
  pickerToggleBtn: {
    flex: 1, paddingVertical: 16, alignItems: 'center',
  },
  pickerToggleBtnActive: { borderBottomWidth: 2, borderBottomColor: '#FF3366' },
  pickerToggleText: { fontSize: 13, fontWeight: '700', color: '#8888AA', letterSpacing: 1 },
  pickerConfirm: {
    marginHorizontal: 24, marginTop: 8,
    backgroundColor: '#1C1C28', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#2A2A3A',
  },
  pickerConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
});
