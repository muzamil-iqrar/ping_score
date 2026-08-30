import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import HeaderLogo from './src/components/HeaderLogo';
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
      <Stack.Navigator screenOptions={{ headerTitle: () => <HeaderLogo /> }}>
        {session ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="NewMatch" component={NewMatchScreen} />
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
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
