import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppIcon, colors, useReducedMotion } from './src/components/ui';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import HeaderLogo from './src/components/HeaderLogo';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import NewMatchScreen from './src/screens/NewMatchScreen';
import LiveMatchScreen from './src/screens/LiveMatchScreen';
import MatchResultScreen from './src/screens/MatchResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import TournamentSetupScreen from './src/screens/TournamentSetupScreen';
import TournamentScreen from './src/screens/TournamentScreen';
import TournamentsScreen from './src/screens/TournamentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home-variant-outline',
  Games: 'scoreboard-outline',
  Tournaments: 'trophy-outline',
  Players: 'account-group-outline',
} as const;

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: () => <HeaderLogo />,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, size, focused }) => <AppIcon name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]} color={color} size={focused ? size + 2 : size} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Games" component={HistoryScreen} />
      <Tab.Screen name="Tournaments" component={TournamentsScreen} />
      <Tab.Screen name="Players" component={PlayersScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { session, loading } = useAuth();
  const reducedMotion = useReducedMotion();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, card: colors.background, text: colors.text, border: colors.border, primary: colors.green } }}>
      <Stack.Navigator screenOptions={{ headerTitle: () => <HeaderLogo />, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background }, animation: reducedMotion ? 'none' : 'slide_from_right' }}>
        {session ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="NewMatch" component={NewMatchScreen} options={{ title: 'Quick Match' }} />
            <Stack.Screen name="TournamentSetup" component={TournamentSetupScreen} options={{ title: 'New Tournament' }} />
            <Stack.Screen name="Tournament" component={TournamentScreen} options={{ title: 'Tournament' }} />
            <Stack.Screen name="LiveMatch" component={LiveMatchScreen} options={{ headerBackVisible: false }} />
            <Stack.Screen name="MatchResult" component={MatchResultScreen} options={{ headerBackVisible: false }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right']}>
        <AuthProvider><AppNavigator /></AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    paddingTop: 7,
    paddingBottom: 7,
    elevation: 12,
    shadowColor: '#15201C',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
  },
  tabItem: { borderRadius: 14 },
  tabLabel: { fontSize: 11, fontWeight: '700', marginTop: 2, marginBottom: Platform.OS === 'android' ? 1 : 0 },
});
