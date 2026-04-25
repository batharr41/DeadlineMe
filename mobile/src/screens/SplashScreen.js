import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

const c = theme.colors;

export default function SplashScreen({ navigation }) {
  const steps = [
    { icon: '🎯', text: 'Set a goal with a real deadline' },
    { icon: '💸', text: 'Stake money on it — your choice' },
    { icon: '🤖', text: 'AI checks in and verifies your proof' },
    { icon: '✅', text: 'Complete it? Full refund' },
    { icon: '🤲', text: 'Miss it? Your loss becomes someone\'s gain' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Logo mark */}
        <View style={styles.logoArea}>
          <View style={styles.logoMark}>
            <Text style={styles.logoEmoji}>🔥</Text>
          </View>
          <Text style={styles.wordmark}>DeadlineMe</Text>
          <Text style={styles.tagline}>Put your money where your goals are.</Text>
        </View>

        {/* Steps */}
        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIconWrap}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started — It's Free</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
  },

  // Logo
  logoArea: {
    alignItems: 'center',
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: c.accentSoft,
    borderWidth: 1,
    borderColor: c.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 30,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '700',
    color: c.text,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: c.textSecondary,
    letterSpacing: 0.1,
  },

  // Steps
  steps: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIcon: {
    fontSize: 16,
  },
  stepText: {
    fontSize: 14,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Buttons
  ctas: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  ghostBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  ghostBtnText: {
    color: c.textSecondary,
    fontSize: 15,
  },
});
