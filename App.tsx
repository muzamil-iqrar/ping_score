import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, useReducedMotion } from './src/components/ui';
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

function AppNavigator() {
  const { session, loading } = useAuth();
  const reducedMotion = useReducedMotion();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.lime} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background, card: colors.background, text: colors.text, border: colors.border, primary: colors.lime } }}>
      <Stack.Navigator screenOptions={{ headerTitle: () => <HeaderLogo />, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.lime, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background }, animation: reducedMotion ? 'none' : 'slide_from_right' }}>
        {session ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="NewMatch" component={NewMatchScreen} />
            <Stack.Screen name="Tournaments" component={TournamentsScreen} options={{ title: 'Tournaments' }} />
            <Stack.Screen name="TournamentSetup" component={TournamentSetupScreen} options={{ title: 'New Tournament' }} />
            <Stack.Screen name="Tournament" component={TournamentScreen} options={{ title: 'Tournament' }} />
            <Stack.Screen name="LiveMatch" component={LiveMatchScreen} options={{ headerBackVisible: false }} />
            <Stack.Screen name="MatchResult" component={MatchResultScreen} options={{ headerBackVisible: false }} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Players" component={PlayersScreen} />
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
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom', 'left', 'right']}>
        <AuthProvider><AppNavigator /></AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
