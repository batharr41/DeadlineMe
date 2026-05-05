import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { theme } from '../utils/theme';
import { api } from '../services/api';

const PERKS = [
  { icon: '♾️', text: 'Unlimited active stakes' },
  { icon: '🤖', text: 'AI check-in reminders' },
  { icon: '📊', text: 'Advanced stats & streaks' },
  { icon: '👥', text: 'Group challenges' },
];

export default function ProPaywallScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { client_secret } = await api.subscribe();

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'DeadlineMe',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') throw new Error(presentError.message);
        return;
      }

      Alert.alert(
        '🔥 You\'re Pro!',
        'Unlimited stakes unlocked.',
        [{ text: "Let's go", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeRow}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.badge}>PRO</Text>
        <Text style={styles.title}>Unlock unlimited{'\n'}accountability</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>$4.99</Text>
          <Text style={styles.pricePeriod}> / month</Text>
        </View>

        <View style={styles.perks}>
          {PERKS.map((p, i) => (
            <View key={i} style={styles.perkRow}>
              <Text style={styles.perkIcon}>{p.icon}</Text>
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Start Pro — $4.99/mo</Text>
          }
        </TouchableOpacity>

        <Text style={styles.fine}>Cancel anytime. No commitment.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  closeRow: { alignSelf: 'flex-start', marginBottom: 32 },
  close: { color: theme.colors.textMuted, fontSize: 20 },
  badge: {
    alignSelf: 'center',
    backgroundColor: theme.colors.accent,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 40,
  },
  priceAmount: { fontSize: 48, fontWeight: '700', color: theme.colors.accent },
  pricePeriod: { fontSize: 18, color: theme.colors.textMuted, marginBottom: 8 },
  perks: { gap: 18 },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  perkIcon: { fontSize: 24 },
  perkText: { fontSize: 16, color: theme.colors.text, fontWeight: '500' },
  btn: {
    width: '100%',
    padding: 18,
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  fine: { fontSize: 12, color: theme.colors.textDim, textAlign: 'center' },
});
