import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '../utils/theme';

function DeadlineMeLogo({ size = 96 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Outer D */}
      <Path
        d="M26 16 L26 84 L50 84 C70 84 84 69 84 50 C84 31 70 16 50 16 Z"
        stroke="#FF3366" strokeWidth="6" strokeLinejoin="round"
      />
      {/* Inner D */}
      <Path
        d="M36 30 L36 70 L50 70 C63 70 72 61 72 50 C72 39 63 30 50 30 Z"
        stroke="#FF3366" strokeWidth="4" strokeLinejoin="round"
      />
      {/* Crown */}
      <Rect x="40" y="7" width="20" height="8" rx="3.5" fill="#FF3366" />
      {/* Side button */}
      <Path d="M83 36 L91 30" stroke="#FF3366" strokeWidth="4.5" strokeLinecap="round" />
      {/* Clock hand */}
      <Line x1="50" y1="35" x2="50" y2="50" stroke="#FF3366" strokeWidth="3.5" strokeLinecap="round" />
      {/* Center dot */}
      <Circle cx="50" cy="50" r="3.5" fill="#FF3366" />
    </Svg>
  );
}

const PROPS = [
  { text: 'Set a goal. Stake real cash.',     icon: '💸' },
  { text: 'AI verifies your proof.',           icon: '🤖' },
  { text: 'Fail? Your money goes to charity.', icon: '🤲' },
];

export default function SplashScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Background red glow */}
      <View style={styles.bgGlow} pointerEvents="none" />

      {/* TOP — Logo + branding */}
      <View style={styles.top}>
        <View style={styles.logoGlowWrap}>
          <DeadlineMeLogo size={96} />
        </View>

        <Text style={styles.title}>DEADLINEME</Text>
        <Text style={styles.tagline}>
          NO EXCUSES. NO EXTENSIONS. NO MERCY.
        </Text>
      </View>

      {/* MIDDLE — Value props */}
      <View style={styles.props}>
        {PROPS.map((p, i) => (
          <View key={i} style={styles.propRow}>
            <View style={styles.propBorder} />
            <View style={styles.propInner}>
              <Text style={styles.propText}>{p.text}</Text>
              <Text style={styles.propIcon}>{p.icon}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* BOTTOM — CTAs */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>GET STARTED — IT'S FREE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.7}
        >
          <Text style={styles.signInText}>
            Already have an account?{' '}
            <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },

  bgGlow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(146,0,34,0.08)',
  },

  // TOP
  top: {
    alignItems: 'center',
    paddingTop: 24,
  },
  logoGlowWrap: {
    marginBottom: 20,
    // Subtle red drop shadow effect via shadow props
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FF5261',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF5261',
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 20,
  },

  // MIDDLE
  props: {
    gap: 12,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28,27,27,0.5)',
    overflow: 'hidden',
    borderRadius: 4,
  },
  propBorder: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#FF5261',
  },
  propInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  propText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E2E1',
    flex: 1,
    marginRight: 12,
  },
  propIcon: {
    fontSize: 22,
  },

  // BOTTOM
  bottom: {
    gap: 16,
    alignItems: 'center',
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#FF5261',
    borderRadius: 4,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#930000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  signInText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#AD8887',
    letterSpacing: 0.3,
  },
  signInLink: {
    color: '#FF5261',
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
});
