import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
  Modal, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  theme, CATEGORIES, STAKE_OPTIONS, CHARITY_CATEGORIES, pickRandomCharity, getCategoryEmoji,
} from '../utils/theme';
import { api } from '../services/api';
import { scheduleStakeReminders } from '../services/notifications';

const defaultDeadline = () => {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
};

const formatDeadline = (d) => {
  if (!d) return '';
  const opts = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return d.toLocaleString('en-US', opts);
};

export default function NewStakeScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null);
  const [stakeAmountStr, setStakeAmountStr] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');

  const [charityCategory, setCharityCategory] = useState(null);
  const [customCharity, setCustomCharity] = useState('');

  const totalSteps = 3;
  const stakeAmount = parseInt(stakeAmountStr) || 0;
  const now = new Date();
  const deadlineIsValid = deadline && deadline > now;

  const canProceed = [
    title.trim().length > 0 && !!category && stakeAmount > 0 && deadlineIsValid,
    !!charityCategory && (charityCategory !== 'custom' || customCharity.trim().length > 1),
    !submitting,
  ];

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleCreate();
  };

  const handleBack = () => {
    if (step === 0) navigation.goBack();
    else setStep(step - 1);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const created = await api.createStake({
        title: title.trim(),
        description: null,
        category,
        stake_amount: stakeAmount,
        deadline: deadline.toISOString(),
        anti_charity_id: charityCategory,
        custom_charity_name: charityCategory === 'custom' ? customCharity.trim() : null,
      });

      // Schedule local reminders — don't block on this
      scheduleStakeReminders(created).catch((e) =>
        console.warn('scheduleStakeReminders failed:', e)
      );

      Alert.alert('🔥 Locked In!', 'Your money is on the line. No turning back.', [
        { text: 'Go to Dashboard', onPress: () => navigation.navigate('Dashboard') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create stake');
      setSubmitting(false);
    }
  };

  const openDatePicker = () => { setPickerMode('date'); setShowDatePicker(true); };
  const openTimePicker = () => { setPickerMode('time'); setShowDatePicker(true); };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      const newDate = selectedDate < new Date() ? new Date(Date.now() + 60 * 60 * 1000) : selectedDate;
      setDeadline(newDate);
    }
  };

  const renderStep0 = () => (
    <ScrollView
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text style={styles.sectionLabel}>WHAT ARE YOU COMMITTING TO?</Text>
        <Text style={styles.sectionHint}>Be specific. "Run 3 miles" beats "exercise more."</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g., Finish my resume by Friday'
          placeholderTextColor={theme.colors.textDim}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View>
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryBtn, category === cat.id && styles.categoryBtnActive]}
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

      <View>
        <Text style={styles.sectionLabel}>STAKE AMOUNT</Text>
        <Text style={styles.sectionHint}>Pick an amount that actually hurts to lose.</Text>

        <View style={styles.stakeInputWrap}>
          <Text style={styles.stakeInputDollar}>$</Text>
          <TextInput
            style={styles.stakeInput}
            placeholder="0"
            placeholderTextColor={theme.colors.textDim}
            value={stakeAmountStr}
            onChangeText={(v) => setStakeAmountStr(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        <View style={styles.stakeChipRow}>
          {STAKE_OPTIONS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[styles.stakeChip, stakeAmount === amount && styles.stakeChipActive]}
              onPress={() => setStakeAmountStr(String(amount))}
            >
              <Text style={[styles.stakeChipText, stakeAmount === amount && styles.stakeChipTextActive]}>
                ${amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>DEADLINE</Text>
        <Text style={styles.sectionHint}>After this time, AI will check if you completed it.</Text>

        <View style={styles.dateCard}>
          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <Text style={styles.dateRowIcon}>📅</Text>
              <Text style={styles.dateRowLabel}>Date</Text>
            </View>
            <TouchableOpacity onPress={openDatePicker} style={styles.dateRowBtn}>
              <Text style={styles.dateRowValue}>
                {deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateDivider} />

          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <Text style={styles.dateRowIcon}>⏰</Text>
              <Text style={styles.dateRowLabel}>Time</Text>
            </View>
            <TouchableOpacity onPress={openTimePicker} style={styles.dateRowBtn}>
              <Text style={styles.dateRowValue}>
                {deadline.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!deadlineIsValid && (
          <Text style={styles.warnText}>⚠️ Deadline must be in the future.</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderStep1 = () => (
    <ScrollView
      style={styles.stepContent}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepTitle}>Where does your money go if you miss it?</Text>
      <Text style={styles.stepHint}>
        Your loss becomes someone's gain. Pick a cause — if you fail, your stake goes to a verified charity in that category. 🤲
      </Text>
      {CHARITY_CATEGORIES.map((cat) => (
        <View key={cat.id}>
          <TouchableOpacity
            style={[styles.charityBtn, charityCategory === cat.id && styles.charityBtnActive]}
            onPress={() => setCharityCategory(cat.id)}
          >
            <Text style={styles.charityIcon}>{cat.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.charityName}>{cat.name}</Text>
              <Text style={styles.charityDesc}>{cat.description}</Text>
            </View>
          </TouchableOpacity>

          {cat.id === 'custom' && charityCategory === 'custom' && (
            <View style={styles.customCharityWrap}>
              <TextInput
                style={styles.customCharityInput}
                placeholder="e.g., Local food bank, specific nonprofit name"
                placeholderTextColor={theme.colors.textDim}
                value={customCharity}
                onChangeText={setCustomCharity}
              />
              <Text style={styles.customCharityWarn}>
                ⚠️ If we can't verify this charity at payout time, we'll cancel and refund your stake — you'll get a chance to pick another.
              </Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderStep2 = () => {
    const matchedCharity = pickRandomCharity(charityCategory);
    const catLabel = CHARITY_CATEGORIES.find((c) => c.id === charityCategory)?.name || '';
    let charityDisplay = catLabel;
    if (charityCategory === 'custom') charityDisplay = customCharity;
    else if (matchedCharity) charityDisplay = `${catLabel} → ${matchedCharity.name}`;

    return (
      <View style={[styles.stepContent, { alignItems: 'center' }]}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>⚡</Text>
        <Text style={styles.stepTitle}>Ready to commit?</Text>
        <View style={styles.summaryCard}>
          {[
            { label: 'Goal', value: title },
            { label: 'Category', value: `${getCategoryEmoji(category)} ${CATEGORIES.find(c => c.id === category)?.label || ''}` },
            { label: 'Stake', value: `$${stakeAmount}`, color: theme.colors.accent },
            { label: 'Deadline', value: formatDeadline(deadline) },
            { label: 'If you miss it', value: charityDisplay },
          ].map((item, i) => (
            <View key={i} style={[styles.summaryRow, i < 4 && styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={[styles.summaryValue, item.color && { color: item.color }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.disclaimer}>
          By confirming, your card will be charged ${stakeAmount}. You get it back when you prove completion — otherwise it goes to charity.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} disabled={submitting}>
          <Text style={styles.backText}>← {step === 0 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step {step + 1} of {totalSteps}</Text>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive, i === step && styles.dotCurrent]} />
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed[step] && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed[step]}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step === totalSteps - 1 ? "🔥 Lock It In — I'm Committed" : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerMode === 'date' ? 'Select Date' : 'Select Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={deadline}
              mode={pickerMode}
              display="spinner"
              minimumDate={new Date()}
              onChange={onDateChange}
              themeVariant="dark"
              textColor={theme.colors.text}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  backText: { color: theme.colors.textMuted, fontSize: 14 },
  stepIndicator: { color: theme.colors.textDim, fontSize: 13 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotActive: { backgroundColor: theme.colors.accent },
  dotCurrent: { width: 24 },
  stepContent: { gap: 20, paddingBottom: 20 },
  stepTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  stepHint: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 8, lineHeight: 18 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textDim,
    letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase',
  },
  sectionHint: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 },
  input: {
    padding: 16, backgroundColor: theme.colors.inputBg,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14,
    color: theme.colors.text, fontSize: 16,
  },
  warnText: { color: theme.colors.warning, fontSize: 12, marginTop: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  categoryBtnActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentDim },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, color: theme.colors.textMuted },
  categoryLabelActive: { color: theme.colors.accent },

  stakeInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12,
    marginBottom: 10,
  },
  stakeInputDollar: {
    fontSize: 36, fontWeight: '700',
    color: theme.colors.accent,
    marginRight: 4,
  },
  stakeInput: {
    flex: 1, fontSize: 36, fontWeight: '700',
    color: theme.colors.text, padding: 0,
  },
  stakeChipRow: { flexDirection: 'row', gap: 8 },
  stakeChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
  },
  stakeChipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentDim },
  stakeChipText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  stakeChipTextActive: { color: theme.colors.accent },

  dateCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dateRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateRowIcon: { fontSize: 18 },
  dateRowLabel: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  dateRowBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: theme.colors.accentDim },
  dateRowValue: { fontSize: 14, color: theme.colors.accent, fontWeight: '600' },
  dateDivider: { height: 1, backgroundColor: theme.colors.border, marginLeft: 44 },

  charityBtn: {
    padding: 14, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.border,
    backgroundColor: theme.colors.card, flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8,
  },
  charityBtnActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentDim },
  charityIcon: { fontSize: 24 },
  charityName: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  charityDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  customCharityWrap: {
    marginTop: -4, marginBottom: 12,
    padding: 12, borderRadius: 12,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1, borderColor: theme.colors.accentDim,
  },
  customCharityInput: {
    padding: 12, borderRadius: 10,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    color: theme.colors.text, fontSize: 15,
    marginBottom: 8,
  },
  customCharityWarn: {
    fontSize: 11, color: theme.colors.warning, lineHeight: 16,
  },

  summaryCard: {
    width: '100%', backgroundColor: theme.colors.card, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: theme.colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  summaryLabel: { fontSize: 13, color: theme.colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, maxWidth: '60%', textAlign: 'right' },
  disclaimer: { fontSize: 12, color: theme.colors.textDim, textAlign: 'center', marginTop: 8 },

  bottomBar: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  nextBtn: {
    padding: 16, backgroundColor: theme.colors.accent, borderRadius: 14, alignItems: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    minHeight: 52, justifyContent: 'center',
  },
  nextBtnDisabled: { backgroundColor: theme.colors.border, shadowOpacity: 0 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalBackdrop: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  modalDone: { fontSize: 16, fontWeight: '700', color: theme.colors.accent },
});