import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { theme } from '../utils/theme';

// Auth
import SplashScreen from '../screens/SplashScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';

// App
import DashboardScreen from '../screens/DashboardScreen';
import NewStakeScreen from '../screens/NewStakeScreen';
import StakeDetailScreen from '../screens/StakeDetailScreen';
import ProofScreen from '../screens/ProofScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupChallengesScreen from '../screens/GroupChallengesScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const INACTIVE = '#666680';

function IconStakes({ color }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
    </Svg>
  );
}

function IconHistory({ color }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3.5V8H7.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M3.05 8A9 9 0 1 0 5.5 4.3" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <Line x1="12" y1="7" x2="12" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <Line x1="12" y1="12" x2="15.5" y2="14" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    </Svg>
  );
}

function IconGroups({ color }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      <Path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

function IconProfile({ color }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.2"/>
      <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2.2"/>
      <Path d="M6 20C6 17.5 8.5 16 12 16C15.5 16 18 17.5 18 20" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    </Svg>
  );
}

const TAB_ICONS = { Stakes: IconStakes, History: IconHistory, Groups: IconGroups, Profile: IconProfile };

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const Icon = TAB_ICONS[route.name];
          return <Icon color={focused ? theme.colors.accent : INACTIVE} />;
        },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
      })}
    >
      <Tab.Screen name="Stakes" component={DashboardScreen} />
      <Tab.Screen name="History" component={StatsScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="NewStake" component={NewStakeScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="StakeDetail" component={StakeDetailScreen} />
      <Stack.Screen name="Proof" component={ProofScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="GroupChallenges" component={GroupChallengesScreen} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }
  return isAuthenticated ? <AppStack /> : <AuthStack />;
}
