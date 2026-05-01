import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

const c = theme.colors;

export default function SplashScreen({ navigation }) {
  const steps = [
    { icon: '🎯', text: 'Commit to a goal with a hard deadline' },
    { icon: '💸', text: 'Put real money on the line' },
    { icon: '🤖', text: 'AI verifies your proof of completion' },
    { icon: '✅', text: 'Follow through? Full refund.' },
    { icon: '🤲', text: 'Fail? Your loss becomes someone\'s gain.' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <View style={styles.logoArea}>
          <View style={styles.headerRow}>
            <Text style={styles.bolt}>⚡</Text>
            <Text style={styles.wordmark}>DEADLINEME</Text>
          </View>
          <Text style={styles.tagline}>No excuses. No extensions. No mercy.</Text>
        </View>

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

        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>I'M READY TO COMMIT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostBtnText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: 40, paddingBottom: 16 },

  logoArea: { gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bolt: { fontSize: 28, color: c.accent },
  wordmark: { fontSize: 28, fontWeight: '700', color: c.accent, letterSpacing: 2 },
  tagline: { fontSize: 14, color: c.textSecondary, letterSpacing: 0.2 },

  steps: { gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepIcon: { fontSize: 17 },
  stepText: { fontSize: 14, color: c.textSecondary, flex: 1, lineHeight: 20 },

  ctas: { gap: 10 },
  primaryBtn: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  ghostBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  ghostBtnText: { color: c.textSecondary, fontSize: 14 },
});
