import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

export default function SplashScreen({ navigation }) {
  const steps = [
    { icon: '🎯', text: 'Set a goal with a deadline' },
    { icon: '💸', text: 'Stake real money on it' },
    { icon: '🤖', text: 'AI checks in & verifies' },
    { icon: '✅', text: 'Hit it? Get your money back' },
    { icon: '😈', text: 'Miss it? It goes to a cause you hate' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.title}>DeadlineMe</Text>
        <Text style={styles.subtitle}>Put your money where your goals are.</Text>

        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Get Started — It's Free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 48,
  },
  steps: {
    width: '100%',
    gap: 14,
    marginBottom: 48,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    fontSize: 20,
  },
  stepText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  linkText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});
