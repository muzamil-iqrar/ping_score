import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import NewMatchScreen from './src/screens/NewMatchScreen';
import LiveMatchScreen from './src/screens/LiveMatchScreen';
import MatchResultScreen from './src/screens/MatchResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Scoreboard' }} />
            <Stack.Screen name="NewMatch" component={NewMatchScreen} options={{ title: 'New Match' }} />
            <Stack.Screen name="LiveMatch" component={LiveMatchScreen} options={{ title: 'Match', headerBackVisible: false }} />
            <Stack.Screen name="MatchResult" component={MatchResultScreen} options={{ title: 'Result', headerBackVisible: false }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
            <Stack.Screen name="Players" component={PlayersScreen} options={{ title: 'Players' }} />
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
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
