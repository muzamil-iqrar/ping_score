import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchTournaments } from '../lib/api';
import { Tournament } from '../lib/types';

export default function TournamentsScreen({ navigation }: any) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchTournaments()
      .then(setTournaments)
      .catch((error) => Alert.alert('Could not load tournaments', error.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={tournaments.length === 0 ? styles.emptyList : styles.list}
        data={tournaments}
        keyExtractor={(tournament) => tournament.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" /> : <Text style={styles.empty}>No tournaments yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Tournament', { tournamentId: item.id })}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.mode === 'singles' ? 'Singles' : 'Doubles'} · Round robin · First to {item.point_target}
            </Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('TournamentSetup')}>
        <Text style={styles.createButtonText}>Create tournament</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, paddingBottom: 92 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 64 },
  empty: { color: '#888', fontSize: 15 },
  card: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 12 },
  name: { color: '#1d3557', fontSize: 18, fontWeight: '800' },
  meta: { color: '#666', marginTop: 5 },
  date: { color: '#888', fontSize: 13, marginTop: 8 },
  createButton: { backgroundColor: '#e63946', borderRadius: 10, padding: 17, alignItems: 'center', margin: 16, position: 'absolute', bottom: 0, left: 0, right: 0 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
