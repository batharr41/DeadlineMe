import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStripe } from '@stripe/stripe-react-native';
import { theme, CATEGORIES, STAKE_OPTIONS, CHARITY_CATEGORIES, getCategoryEmoji } from '../utils/theme';
import { api } from '../services/api';
import { scheduleStakeReminders } from '../services/notifications';

const c = theme.colors;

const STEPS = [
  { id: 0, label: 'THE MISSION', title: 'STAKE YOUR CLAIM' },
  { id: 1, label: 'THE TERMS', title: 'SET THE STAKES' },
  { id: 2, label: 'THE CONSEQUENCE', title: 'CHOOSE YOUR CAUSE' },
  { id: 3, label: 'REVIEW', title: 'LOCK IT IN' },
];

export default function NewStakeScreen({ navigation }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const [deadline, setDeadline] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
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

  const formatDeadline = (d) => d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const sheetParams = await api.createPaymentSheet(amount);
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'DeadlineMe',
        customerId: sheetParams.customer,
        customerEphemeralKeySecret: sheetParams.ephemeralKey,
        paymentIntentClientSecret: sheetParams.paymentIntent,
        allowsDelayedPaymentMethods: false,
      });
      if (initError) { Alert.alert('Payment Error', initError.message); return; }

      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code !== 'Canceled') Alert.alert('Payment Failed', paymentError.message);
        return;
      }

      const result = await api.createStake({
        title: title.trim(), category, stake_amount: amount,
        deadline: deadline.toISOString(), anti_charity_id: charityId, description: '',
        payment_intent_id: sheetParams.payment_intent_id,
      });

      await scheduleStakeReminders(result.id || 'temp', title, deadline.toISOString());
      navigation.navigate('MainTabs');
    } catch (err) {
      if (err.message.includes('FREE_LIMIT_REACHED')) {
        navigation.navigate('ProPaywall');
      } else {
        Alert.alert('Error', err.message || 'Failed to create stake. Try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepHint}>Vague goals lead to vague results. Be precise or fail.</Text>
            <TextInput
              style={styles.missionInput}
              placeholder="Be specific. 'Run 3 miles' beats..."
              placeholderTextColor={c.textDisabled}
              value={title}
              onChangeText={setTitle}
              autoFocus
              multiline
              maxLength={200}
            />
            <Text style={styles.fieldLabel}>CORE DOMAIN</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryBtn, category === cat.id && styles.categoryBtnActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, category === cat.id && styles.categoryLabelActive]}>
                    {cat.label.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                "By defining this goal, you acknowledge that failure will result in the immediate forfeiture of your staked amount. Commitment is absolute."
              </Text>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepHint}>Pick an amount that actually hurts to lose. That's the point.</Text>

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

            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>EXECUTION DEADLINE</Text>
            <TouchableOpacity style={styles.deadlineCard} onPress={() => setShowPicker(true)}>
              <Text style={styles.deadlineText}>{formatDeadline(deadline)}</Text>
              <Text style={styles.deadlineChange}>CHANGE →</Text>
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
                <Text style={styles.doneBtnText}>CONFIRM</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepHint}>If you fail, your stake goes here. Pick something you genuinely care about.</Text>
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
                        {cat.name.toUpperCase()}
                      </Text>
                      {cat.orgs.length > 0 && (
                        <Text style={styles.charityOrgs} numberOfLines={1}>
                          {cat.orgs.slice(0, 2).join(' · ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.radio, charityId === cat.id && styles.radioActive]}>
                    {charityId === cat.id && <View style={styles.radioDot} />}
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
            <Text style={styles.stepHint}>Review your commitment. There's no turning back.</Text>
            <View style={styles.summaryCard}>
              {[
                { label: 'MISSION', value: title },
                { label: 'DOMAIN', value: `${getCategoryEmoji(category)} ${CATEGORIES.find(c => c.id === category)?.label?.toUpperCase()}` },
                { label: 'STAKE', value: `$${amount}`, highlight: true },
                { label: 'DEADLINE', value: formatDeadline(deadline) },
                { label: 'CONSEQUENCE', value: `${charity?.icon} ${charity?.name}` },
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
                Your card will be authorized for ${amount}. Complete the mission and you get it back. Fail and it's gone.
              </Text>
            </View>
          </View>
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)}>
          <Text style={styles.backText}>{step === 0 ? '✕' : '← BACK'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepCounter}>STEP {step + 1} / {STEPS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      {/* Step title */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepSubtitle}>{STEPS[step].label}</Text>
        <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
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
            {creating ? 'PROCESSING...' : step === STEPS.length - 1 ? 'LOCK IT IN →' : `NEXT: ${STEPS[step + 1]?.label ?? 'CONFIRM'} →`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backText: { fontSize: 13, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5 },
  stepCounter: { fontSize: 12, fontWeight: '700', color: c.accent, letterSpacing: 1 },

  progressTrack: { height: 2, backgroundColor: c.border, marginHorizontal: 16 },
  progressFill: { height: '100%', backgroundColor: c.accent },

  stepHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  stepSubtitle: { fontSize: 10, fontWeight: '700', color: c.textTertiary, letterSpacing: 1.5, marginBottom: 4 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.5 },

  scrollArea: { flex: 1, paddingHorizontal: 16 },
  stepContent: { gap: 16 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: c.textTertiary, letterSpacing: 1.5 },
  stepHint: { fontSize: 13, color: c.textTertiary, lineHeight: 18 },

  missionInput: {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    borderRadius: 12, padding: 16, color: c.text, fontSize: 16,
    fontWeight: '500', minHeight: 80, letterSpacing: -0.2,
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.border,
  },
  categoryBtnActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: c.textTertiary, letterSpacing: 0.5 },
  categoryLabelActive: { color: c.accent },

  warningBox: {
    backgroundColor: 'rgba(255,45,85,0.06)', borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: 'rgba(255,45,85,0.15)',
    borderLeftWidth: 3, borderLeftColor: c.accent,
  },
  warningText: { fontSize: 12, color: c.textTertiary, lineHeight: 18, fontStyle: 'italic' },

  amountContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, borderRadius: 12,
    borderWidth: 1, borderColor: c.border, paddingHorizontal: 16,
  },
  dollarSign: { fontSize: 32, fontWeight: '700', color: c.textTertiary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 48, fontWeight: '700', color: c.text, paddingVertical: 16, letterSpacing: -1 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1, paddingVertical: 12, backgroundColor: c.surface,
    borderRadius: 8, borderWidth: 1, borderColor: c.border, alignItems: 'center',
  },
  chipActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
  chipText: { fontSize: 14, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5 },
  chipTextActive: { color: c.accent },

  deadlineCard: {
    backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  deadlineText: { fontSize: 14, fontWeight: '600', color: c.text },
  deadlineChange: { fontSize: 10, fontWeight: '700', color: c.accent, letterSpacing: 1 },
  doneBtn: { alignSelf: 'flex-end', padding: 12 },
  doneBtnText: { color: c.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  charityList: { gap: 8 },
  charityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14,
  },
  charityRowActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
  charityLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  charityIcon: { fontSize: 20 },
  charityName: { fontSize: 12, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5 },
  charityNameActive: { color: c.text },
  charityOrgs: { fontSize: 11, color: c.textTertiary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: c.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },

  summaryCard: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: c.textTertiary, letterSpacing: 1 },
  summaryValue: { fontSize: 13, fontWeight: '600', color: c.text, maxWidth: '60%', textAlign: 'right' },
  disclaimerBox: { backgroundColor: c.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: c.border },
  disclaimerText: { fontSize: 12, color: c.textTertiary, lineHeight: 18, textAlign: 'center' },

  bottomBar: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 },
  nextBtn: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  nextBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
});