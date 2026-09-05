import { colors, EmptyState, PageHeading, Touch as TouchableOpacity, ui } from '../components/ui';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
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
        contentContainerStyle={styles.list}
        ListHeaderComponent={<PageHeading eyebrow="MATCH DAY / TOURNAMENTS" title="Play for the top spot." subtitle="Bring everyone to the table. Let the standings tell the story." />}
        data={tournaments}
        keyExtractor={(tournament) => tournament.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={colors.lime} /> : <EmptyState title="The title is up for grabs" detail="Create a round robin, pick your players, and get the competition going." />}
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
        <Text style={styles.createButtonText}>Create tournament  ↗</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { ...ui.content, paddingBottom: 32 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 64 },
  empty: { color: colors.muted, fontSize: 15 },
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 12 },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.muted, marginTop: 5 },
  date: { color: colors.muted, fontSize: 13, marginTop: 8 },
  createButton: { backgroundColor: colors.lime, borderRadius: 16, padding: 17, alignItems: 'center', margin: 24, marginTop: 8, width: '90%', maxWidth: 712, alignSelf: 'center' },
  createButtonText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
});
