import { colors, confirmDestructive, EmptyState, PageHeading, Touch as TouchableOpacity, ui } from '../components/ui';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { deleteTournament, fetchTournaments } from '../lib/api';
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

  function handleDelete(tournament: Tournament) {
    confirmDestructive('Delete tournament', `Delete "${tournament.name}" and all of its matches?`, 'Delete', async () => {
      try {
        await deleteTournament(tournament.id);
        load();
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    });
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.list}
        ListHeaderComponent={<PageHeading eyebrow="MATCH DAY / TOURNAMENTS" title="Play for the top spot." subtitle="Bring everyone to the table. Let the standings tell the story." />}
        data={tournaments}
        keyExtractor={(tournament) => tournament.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color={colors.green} /> : <EmptyState title="The title is up for grabs" detail="Create a round robin, pick your players, and get the competition going." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity style={styles.cardMain} onPress={() => navigation.navigate('Tournament', { tournamentId: item.id })}>
              <View style={styles.iconBox}><Text style={styles.icon}>🏆</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.mode === 'singles' ? 'Singles' : 'Doubles'} · Round robin · First to {item.point_target}
                </Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={`Delete ${item.name}`} style={styles.deleteButton} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteButtonIcon}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('TournamentSetup')}>
        <Text style={styles.createButtonText}>+ Create tournament</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { ...ui.content, paddingBottom: 32 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 64 },
  empty: { color: colors.muted, fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 16, paddingLeft: 16, paddingRight: 8, marginBottom: 12 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  date: { color: colors.muted, fontSize: 12, marginTop: 6 },
  deleteButton: { paddingVertical: 6, paddingHorizontal: 8 },
  deleteButtonIcon: { color: colors.muted, fontSize: 22 },
  createButton: { backgroundColor: colors.text, borderRadius: 16, padding: 17, alignItems: 'center', margin: 24, marginTop: 8, width: '90%', maxWidth: 712, alignSelf: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
