import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { useAuth } from '../hooks/useAuth';

const c = theme.colors;

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert('Missing fields', 'Please fill in all fields.');
    if (password !== confirmPassword) return Alert.alert('Mismatch', 'Passwords do not match.');
    if (password.length < 6) return Alert.alert('Too short', 'Password must be at least 6 characters.');

    setLoading(true);
    try {
      await signUp(email, password);
      Alert.alert('Check your email', 'We sent you a confirmation link.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start holding yourself accountable</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={c.textDisabled}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={c.textDisabled}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor={c.textDisabled}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnLoading]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },

  backBtn: { marginBottom: 40, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: c.textSecondary },

  header: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.8, marginBottom: 6 },
  subtitle: { fontSize: 15, color: c.textSecondary },

  form: { gap: 20 },

  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.8,
    color: c.textTertiary, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: c.text,
    fontSize: 15,
  },

  btn: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnLoading: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  footer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: 8,
  },
  footerText: { fontSize: 14, color: c.textTertiary },
  footerLink: { fontSize: 14, color: c.accent, fontWeight: '500' },
});
