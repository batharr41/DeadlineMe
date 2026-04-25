import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme, CATEGORIES, STAKE_OPTIONS, CHARITY_CATEGORIES, getCategoryEmoji } from '../utils/theme';
import { api } from '../services/api';
import { scheduleStakeReminders } from '../services/notifications';

const c = theme.colors;

const STEPS = ['Goal', 'Stake & Deadline', 'Charity', 'Confirm'];

export default function NewStakeScreen({ navigation }) {
  const [step, setStep] = useState(0);

  // Step 0
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null);

  // Step 1
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const [deadline, setDeadline] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);

  // Step 2
  const [charityId, setCharityId] = useState(null);

  const [creating, setCreating] = useState(false);

  const amount = selectedChip || parseInt(stakeAmount) || 0;

  const canProceed = [
    title.trim().length > 0 && category !== null,
    amount >= 1 && deadline > new Date(),
    charityId !== null,
    true,
  ];

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleCreate();
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await api.createStake({
        title: title.trim(),
        category,
        stake_amount: amount,
        deadline: deadline.toISOString(),
        anti_charity_id: charityId,
        description: '',
      });
      await scheduleStakeReminders(result.id || 'temp', title, deadline.toISOString());
      navigation.navigate('MainTabs');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create stake. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const formatDeadline = (d) => {
    const now = new Date();
    const diff = d - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const opts = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return d.toLocaleDateString('en-US', opts);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <TextInput
              style={styles.goalInput}
              placeholder="What's your goal?"
              placeholderTextColor={c.textDisabled}
              value={title}
              onChangeText={setTitle}
              autoFocus
              multiline
              maxLength={200}
            />
            <Text style={styles.hint}>Be specific. "Run 3 miles" beats "exercise more."</Text>

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, category === cat.id && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            {/* Amount */}
            <Text style={styles.fieldLabel}>STAKE AMOUNT</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={c.textDisabled}
                value={selectedChip ? String(selectedChip) : stakeAmount}
                onChangeText={(v) => { setStakeAmount(v); setSelectedChip(null); }}
                keyboardType="numeric"
                onFocus={() => setSelectedChip(null)}
              />
            </View>
            <View style={styles.chipRow}>
              {STAKE_OPTIONS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.chip, selectedChip === amt && styles.chipActive]}
                  onPress={() => { setSelectedChip(amt); setStakeAmount(''); }}
                >
                  <Text style={[styles.chipText, selectedChip === amt && styles.chipTextActive]}>${amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Pick an amount that actually hurts to lose.</Text>

            {/* Deadline */}
            <Text style={[styles.fieldLabel, { marginTop: 28 }]}>DEADLINE</Text>
            <TouchableOpacity
              style={styles.deadlineCard}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.deadlineText}>{formatDeadline(deadline)}</Text>
              <Text style={styles.deadlineEdit}>Change →</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={deadline}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(e, date) => {
                  if (Platform.OS === 'android') setShowPicker(false);
                  if (date) setDeadline(date);
                }}
              />
            )}
            {Platform.OS === 'ios' && showPicker && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.hint}>If you miss your deadline, your stake goes here. Pick a cause you genuinely care about — that's what makes this work.</Text>
            <View style={styles.charityList}>
              {CHARITY_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.charityRow, charityId === cat.id && styles.charityRowActive]}
                  onPress={() => setCharityId(cat.id)}
                >
                  <View style={styles.charityLeft}>
                    <Text style={styles.charityIcon}>{cat.icon}</Text>
                    <View>
                      <Text style={[styles.charityName, charityId === cat.id && styles.charityNameActive]}>
                        {cat.name}
                      </Text>
                      {cat.orgs.length > 0 && (
                        <Text style={styles.charityOrgs} numberOfLines={1}>
                          {cat.orgs.slice(0, 2).join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.radioOuter, charityId === cat.id && styles.radioOuterActive]}>
                    {charityId === cat.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3: {
        const charity = CHARITY_CATEGORIES.find(ch => ch.id === charityId);
        return (
          <View style={styles.stepContent}>
            <View style={styles.summaryCard}>
              {[
                { label: 'Goal', value: title },
                { label: 'Category', value: `${getCategoryEmoji(category)} ${CATEGORIES.find(c => c.id === category)?.label}` },
                { label: 'Stake', value: `$${amount}`, highlight: true },
                { label: 'Deadline', value: formatDeadline(deadline) },
                { label: 'Charity', value: `${charity?.icon} ${charity?.name}` },
              ].map((row, i, arr) => (
                <View key={i} style={[styles.summaryRow, i < arr.length - 1 && styles.summaryRowBorder]}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={[styles.summaryValue, row.highlight && { color: c.accent }]}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                Your card will be authorized for ${amount}. If you complete your goal and upload proof, you get it back in full.
              </Text>
            </View>
          </View>
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)}>
          <Text style={styles.backText}>{step === 0 ? 'Cancel' : '← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>{step + 1} / {STEPS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      {/* Step title */}
      <View style={styles.stepTitleRow}>
        <Text style={styles.stepTitle}>{STEPS[step]}</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>

      {/* Next button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceed[step] || creating) && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed[step] || creating}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {creating ? 'Creating...' : step === STEPS.length - 1 ? "Lock It In" : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backText: { fontSize: 15, color: c.textSecondary },
  stepIndicator: { fontSize: 13, color: c.textTertiary },

  progressTrack: { height: 2, backgroundColor: c.border, marginHorizontal: 20 },
  progressFill: { height: '100%', backgroundColor: c.accent, borderRadius: 1 },

  stepTitleRow: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  stepTitle: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.8 },

  scrollArea: { flex: 1, paddingHorizontal: 20 },
  stepContent: { gap: 16 },

  fieldLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
    color: c.textTertiary, textTransform: 'uppercase',
  },
  hint: { fontSize: 13, color: c.textTertiary, lineHeight: 18 },

  // Goal step
  goalInput: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 16,
    color: c.text,
    fontSize: 17,
    fontWeight: '500',
    minHeight: 80,
    letterSpacing: -0.2,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 13,
    backgroundColor: c.surface, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
  },
  categoryChipActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 13, color: c.textSecondary },
  categoryLabelActive: { color: c.accent, fontWeight: '500' },

  // Amount step
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
  },
  dollarSign: { fontSize: 28, fontWeight: '700', color: c.textTertiary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 40, fontWeight: '700', color: c.text, paddingVertical: 16, letterSpacing: -1 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1, paddingVertical: 12, backgroundColor: c.surface,
    borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center',
  },
  chipActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
  chipText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  chipTextActive: { color: c.accent },

  // Deadline
  deadlineCard: {
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  deadlineText: { fontSize: 15, fontWeight: '500', color: c.text },
  deadlineEdit: { fontSize: 13, color: c.accent },
  doneBtn: { alignSelf: 'flex-end', padding: 12 },
  doneBtnText: { color: c.accent, fontSize: 15, fontWeight: '600' },

  // Charity step
  charityList: { gap: 8 },
  charityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    padding: 14,
  },
  charityRowActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
  charityLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  charityIcon: { fontSize: 22 },
  charityName: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
  charityNameActive: { color: c.text },
  charityOrgs: { fontSize: 12, color: c.textTertiary, marginTop: 1 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: c.accent },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },

  // Summary step
  summaryCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  summaryLabel: { fontSize: 13, color: c.textTertiary },
  summaryValue: { fontSize: 14, fontWeight: '500', color: c.text, maxWidth: '60%', textAlign: 'right' },
  disclaimerBox: {
    backgroundColor: c.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border,
  },
  disclaimerText: { fontSize: 12, color: c.textTertiary, lineHeight: 18, textAlign: 'center' },

  // Bottom
  bottomBar: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  nextBtn: {
    backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
