import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🏓</Text>
        <Text style={styles.title}>Table Tennis</Text>
        <Text style={styles.subtitle}>SCOREBOARD</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('NewMatch')}>
        <Text style={styles.buttonText}>New Match</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.tournamentButton]} onPress={() => navigation.navigate('Tournaments')}>
        <Text style={styles.buttonText}>Tournament</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.navigate('History')}>
        <Text style={[styles.buttonText, styles.secondaryText]}>Match History</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.navigate('Players')}>
        <Text style={[styles.buttonText, styles.secondaryText]}>Players</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  hero: { alignItems: 'center', marginBottom: 48 },
  heroEmoji: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', color: '#1d3557' },
  subtitle: { fontSize: 13, fontWeight: '700', letterSpacing: 4, color: '#e63946', marginTop: 4 },
  button: { backgroundColor: '#e63946', padding: 18, borderRadius: 10, alignItems: 'center', marginBottom: 14 },
  tournamentButton: { backgroundColor: '#1d3557' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondary: { backgroundColor: '#f5f5f5' },
  secondaryText: { color: '#333' },
  signOut: { marginTop: 20, alignItems: 'center' },
  signOutText: { color: '#888', fontSize: 14, textDecorationLine: 'underline' },
});
