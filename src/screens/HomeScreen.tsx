import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏓 Scoreboard</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('NewMatch')}>
        <Text style={styles.buttonText}>New Match</Text>
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
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 40 },
  button: { backgroundColor: '#e63946', padding: 18, borderRadius: 10, alignItems: 'center', marginBottom: 14 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondary: { backgroundColor: '#f5f5f5' },
  secondaryText: { color: '#333' },
  signOut: { marginTop: 20, alignItems: 'center' },
  signOutText: { color: '#888', fontSize: 14, textDecorationLine: 'underline' },
});
